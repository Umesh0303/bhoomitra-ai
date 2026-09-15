// Validation → trusted knowledge. Only cases the real world agreed with are
// promoted; everything else stays a raw case forever.

import {
  buildKnowledgeDraft,
  duplicateKey,
  evaluatePromotion,
  mergedConfidence,
  resolvedDiseaseName,
  successRate,
  type CaseLike,
  type FeedbackLike,
  type OutcomeLike,
} from "./knowledge-text";

type Ctx = { supabase: any; userId: string };

export type PromotionResult = {
  promoted: boolean;
  knowledgeId?: string;
  validationStatus: string;
  reasons: string[];
};

/**
 * Evaluates one case and, when it qualifies, writes or merges a trusted
 * knowledge entry. Embedding failures leave the entry queued for indexing
 * rather than losing it.
 */
export async function evaluateAndPromoteCase(
  ctx: Ctx,
  caseId: string,
  opts: { reviewVerified?: boolean; reviewerCorrection?: string | null } = {},
): Promise<PromotionResult> {
  const { data: kase } = await ctx.supabase
    .from("disease_cases")
    .select("*")
    .eq("id", caseId)
    .maybeSingle();
  if (!kase) return { promoted: false, validationStatus: "unverified", reasons: ["Case not found"] };

  if (kase.validation_status === "rejected" && !opts.reviewVerified) {
    return { promoted: false, validationStatus: "rejected", reasons: ["Case was rejected"] };
  }

  const { data: feedback } = await ctx.supabase
    .from("disease_feedback")
    .select("diagnosis_rating")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: outcome } = await ctx.supabase
    .from("disease_case_outcomes")
    .select("outcome, treatment_followed, days_after_treatment, farmer_confirmed_disease")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const caseLike = kase as CaseLike;
  const feedbackLike = (feedback ?? null) as FeedbackLike;
  const outcomeLike = (outcome ?? null) as OutcomeLike;

  const verdict = evaluatePromotion(caseLike, feedbackLike, outcomeLike, opts.reviewVerified);
  const validationStatus = opts.reviewVerified
    ? "expert_verified"
    : verdict.eligible
      ? "farmer_confirmed"
      : feedbackLike?.diagnosis_rating === "incorrect" && !outcomeLike?.farmer_confirmed_disease
        ? "rejected"
        : "unverified";

  await ctx.supabase
    .from("disease_cases")
    .update({ validation_status: validationStatus, case_status: "validated" })
    .eq("id", caseId);

  if (!verdict.eligible) {
    return { promoted: false, validationStatus, reasons: verdict.reasons };
  }

  const draft = buildKnowledgeDraft(
    { ...caseLike, ...(opts.reviewerCorrection ? {} : {}) },
    feedbackLike,
    opts.reviewerCorrection
      ? ({
          outcome: outcomeLike?.outcome ?? "unknown",
          treatment_followed: outcomeLike?.treatment_followed ?? false,
          days_after_treatment: outcomeLike?.days_after_treatment ?? null,
          farmer_confirmed_disease: opts.reviewerCorrection,
        } as OutcomeLike)
      : outcomeLike,
  );

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const key = duplicateKey(draft);

  let existing: Record<string, any> | null = null;
  {
    let q = supabaseAdmin
      .from("disease_knowledge")
      .select("id, confidence_score, source_case_count, evidence_count, knowledge_version")
      .ilike("crop_name", key.crop)
      .ilike("disease_name", key.disease);
    q = key.stage ? q.ilike("crop_stage", key.stage) : q.is("crop_stage", null);
    const { data } = await q.limit(1).maybeSingle();
    existing = (data as Record<string, any> | null) ?? null;
  }

  const regionalContext = caseLike.location_name ? { region: caseLike.location_name } : {};
  let knowledgeId: string;

  if (existing) {
    const sourceCount = (existing["source_case_count"] ?? 1) + 1;
    knowledgeId = existing["id"];
    await supabaseAdmin
      .from("disease_knowledge")
      .update({
        knowledge_text: draft.knowledgeText,
        diagnostic_evidence: draft.diagnosticEvidence,
        treatment_guidance: draft.treatmentGuidance,
        prevention_guidance: draft.preventionGuidance,
        symptoms: draft.symptoms,
        visual_features: draft.visualFeatures,
        affected_parts: draft.affectedParts,
        source_case_count: sourceCount,
        evidence_count: (existing["evidence_count"] ?? 0) + 1,
        knowledge_version: (existing["knowledge_version"] ?? 1) + 1,
        confidence_score: mergedConfidence(Number(existing["confidence_score"] ?? 60), sourceCount),
        validation_status:
          validationStatus === "expert_verified" ? "expert_verified" : validationStatus,
        indexing_status: "pending",
        last_validated_at: new Date().toISOString(),
      })
      .eq("id", knowledgeId);
  } else {
    const { data: inserted, error } = await supabaseAdmin
      .from("disease_knowledge")
      .insert({
        source_case_id: caseId,
        crop_name: draft.cropName,
        disease_name: draft.diseaseName,
        symptoms: draft.symptoms,
        visual_features: draft.visualFeatures,
        affected_parts: draft.affectedParts,
        crop_stage: draft.cropStage,
        weather_conditions: (caseLike.weather_context ?? {}) as never,
        soil_conditions: (caseLike.soil_context ?? {}) as never,
        regional_context: regionalContext as never,
        diagnostic_evidence: draft.diagnosticEvidence,
        treatment_guidance: draft.treatmentGuidance,
        prevention_guidance: draft.preventionGuidance,
        knowledge_text: draft.knowledgeText,
        confidence_score: validationStatus === "expert_verified" ? 80 : 65,
        validation_status: validationStatus,
        indexing_status: "pending",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    knowledgeId = inserted.id as string;
  }

  await supabaseAdmin
    .from("disease_knowledge_sources")
    .upsert({ knowledge_id: knowledgeId, case_id: caseId });

  // Recompute treatment success from every source case of this entry.
  const { data: sources } = await supabaseAdmin
    .from("disease_knowledge_sources")
    .select("case_id")
    .eq("knowledge_id", knowledgeId);
  const caseIds = (sources ?? []).map((s: { case_id: string }) => s.case_id);
  if (caseIds.length) {
    const { data: outs } = await supabaseAdmin
      .from("disease_case_outcomes")
      .select("outcome")
      .in("case_id", caseIds);
    const rate = successRate((outs ?? []).map((o: { outcome: string }) => o.outcome));
    if (rate != null) {
      await supabaseAdmin
        .from("disease_knowledge")
        .update({ treatment_success_rate: rate })
        .eq("id", knowledgeId);
    }
  }

  await ctx.supabase
    .from("disease_cases")
    .update({ promoted_at: new Date().toISOString() })
    .eq("id", caseId);

  await indexKnowledgeEntry(knowledgeId, draft.knowledgeText);

  return {
    promoted: true,
    knowledgeId,
    validationStatus,
    reasons: [`Filed under ${resolvedDiseaseName(caseLike, outcomeLike)}`],
  };
}

/** Embedding is best-effort; a failure leaves the entry retryable. */
export async function indexKnowledgeEntry(knowledgeId: string, text: string): Promise<boolean> {
  try {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");
    const { embedQuery } = await import("@/features/knowledge/services/embeddingService.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const emb = await embedQuery(text, apiKey);
    const { error } = await supabaseAdmin
      .from("disease_knowledge")
      .update({ embedding: emb as unknown as string, indexing_status: "indexed" })
      .eq("id", knowledgeId);
    if (error) throw new Error(error.message);
    return true;
  } catch (err) {
    console.error("[disease-intelligence] knowledge indexing failed", err);
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("disease_knowledge")
        .update({ indexing_status: "failed" })
        .eq("id", knowledgeId);
    } catch {
      /* ignore */
    }
    return false;
  }
}
