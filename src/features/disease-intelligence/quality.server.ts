// Recomputes a knowledge entry's quality score and lifecycle status from its
// source cases, stores the component breakdown, and versions any change.
// Everything here is best-effort: a failure must never break a diagnosis.

import { DI_CONFIG_VERSION } from "./config";
import { caseEvidence, computeQuality, decideKnowledgeStatus, type QualityBreakdown } from "./quality";

export type QualityResult = {
  knowledgeId: string;
  quality: QualityBreakdown;
  status: string;
  statusReason: string;
  independentSourceCount: number;
};

/**
 * Independent evidence counts distinct farms, not scans: one farmer repeatedly
 * scanning the same problem must not inflate confidence.
 */
export async function recalculateKnowledgeQuality(
  knowledgeId: string,
  opts: { reviewerId?: string | null; reason?: string } = {},
): Promise<QualityResult | null> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: entry } = await supabaseAdmin
      .from("disease_knowledge")
      .select("*")
      .eq("id", knowledgeId)
      .maybeSingle();
    if (!entry) return null;
    const k = entry as Record<string, any>;

    const { data: sources } = await supabaseAdmin
      .from("disease_knowledge_sources")
      .select("case_id")
      .eq("knowledge_id", knowledgeId);
    const caseIds = (sources ?? []).map((s: { case_id: string }) => s.case_id);

    const { data: cases } = caseIds.length
      ? await supabaseAdmin
          .from("disease_cases")
          .select(
            "id, user_id, farm_id, crop_name, crop_stage, affected_part, symptoms, image_count, weather_context, followup_answers, validation_status",
          )
          .in("id", caseIds)
      : { data: [] as Array<Record<string, any>> };
    const caseRows = (cases ?? []) as Array<Record<string, any>>;

    const [{ data: outcomes }, { data: feedback }, { data: reviews }] = await Promise.all([
      caseIds.length
        ? supabaseAdmin.from("disease_case_outcomes").select("case_id, outcome").in("case_id", caseIds)
        : Promise.resolve({ data: [] as any[] }),
      caseIds.length
        ? supabaseAdmin
            .from("disease_feedback")
            .select("case_id, diagnosis_rating")
            .in("case_id", caseIds)
        : Promise.resolve({ data: [] as any[] }),
      caseIds.length
        ? supabaseAdmin.from("disease_review").select("case_id, decision").in("case_id", caseIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const outcomeList = (outcomes ?? []).map((o: { outcome: string }) => o.outcome);
    const caseIdsWithOutcome = new Set(
      (outcomes ?? []).map((o: { case_id: string }) => o.case_id),
    );

    const ratings = (feedback ?? []) as Array<{ diagnosis_rating: string }>;
    const decisions = (reviews ?? []) as Array<{ decision: string }>;
    const confirmedCount =
      ratings.filter((r) => r.diagnosis_rating === "correct").length +
      decisions.filter((d) => d.decision === "verified").length;
    const contradictedCount =
      ratings.filter((r) => r.diagnosis_rating === "incorrect").length +
      decisions.filter((d) => d.decision === "incorrect").length;

    const uniqueFarms = new Set(
      caseRows.map((c) => c["farm_id"] ?? `user:${c["user_id"]}`).filter(Boolean),
    );
    const uniqueUsers = new Set(caseRows.map((c) => c["user_id"]));
    const independent = Math.max(1, uniqueFarms.size);

    const strongest = caseRows.some((c) => c["validation_status"] === "expert_verified")
      ? "expert_verified"
      : caseRows.some((c) => c["validation_status"] === "farmer_confirmed")
        ? "farmer_confirmed"
        : caseRows.some((c) => c["validation_status"] === "system_validated")
          ? "system_validated"
          : (k["validation_status"] as string) || "unverified";

    const consistentContext =
      new Set(caseRows.map((c) => (c["crop_stage"] ?? "").toLowerCase())).size <= 1 &&
      new Set(caseRows.map((c) => (c["affected_part"] ?? "").toLowerCase())).size <= 1;

    const quality = computeQuality({
      validationStatus: strongest,
      evidence: caseRows.map((c) =>
        caseEvidence({
          image_count: c["image_count"],
          symptoms: c["symptoms"],
          crop_name: c["crop_name"],
          crop_stage: c["crop_stage"],
          weather_context: c["weather_context"],
          followup_answers: c["followup_answers"],
          hasOutcome: caseIdsWithOutcome.has(c["id"]),
        }),
      ),
      confirmedCount,
      contradictedCount,
      sourceCaseCount: Math.max(1, caseRows.length),
      outcomes: outcomeList,
      independentSourceCount: independent,
      consistentContext,
    });

    const decision = decideKnowledgeStatus({
      quality,
      validationStatus: strongest,
      independentSourceCount: independent,
      contradictedCount,
      outcomes: outcomeList,
      lastValidatedAt: k["last_validated_at"] ?? null,
    });

    const previousStatus = k["knowledge_status"];
    const previousScore = k["quality_score"];

    await supabaseAdmin
      .from("disease_knowledge")
      .update({
        quality_score: quality.score,
        quality_level: quality.level,
        knowledge_status: decision.status,
        status_reason: decision.reason,
        has_conflicting_evidence: decision.conflicting,
        independent_source_count: independent,
        unique_farm_count: Math.max(uniqueFarms.size, uniqueUsers.size ? 1 : 1),
      })
      .eq("id", knowledgeId);

    await supabaseAdmin.from("disease_quality_scores").insert({
      knowledge_id: knowledgeId,
      quality_score: quality.score,
      quality_level: quality.level,
      validation_score: quality.validationScore,
      evidence_score: quality.evidenceScore,
      confirmation_score: quality.confirmationScore,
      outcome_score: quality.outcomeScore,
      supporting_cases_score: quality.supportingCasesScore,
      consistency_score: quality.consistencyScore,
      components: {
        evidenceCompleteness: quality.evidenceCompleteness,
        goodOutcomeShare: quality.goodOutcomeShare,
        confirmedCount,
        contradictedCount,
        independentSourceCount: independent,
        sourceCaseCount: caseRows.length,
        notes: quality.notes,
      } as never,
      config_version: DI_CONFIG_VERSION,
    });

    if (previousStatus !== decision.status || previousScore !== quality.score) {
      await supabaseAdmin.from("disease_knowledge_versions").insert({
        knowledge_id: knowledgeId,
        version_number: (k["knowledge_version"] ?? 1) as number,
        previous_content: {
          knowledge_status: previousStatus,
          quality_score: previousScore,
          knowledge_text: k["knowledge_text"],
        } as never,
        new_content: {
          knowledge_status: decision.status,
          quality_score: quality.score,
          knowledge_text: k["knowledge_text"],
        } as never,
        quality_score: quality.score,
        change_reason: opts.reason ?? decision.reason,
        reviewer_id: opts.reviewerId ?? null,
      });
    }

    console.info("[disease-intelligence] quality recalculated", {
      knowledgeId,
      score: quality.score,
      status: decision.status,
    });

    return {
      knowledgeId,
      quality,
      status: decision.status,
      statusReason: decision.reason,
      independentSourceCount: independent,
    };
  } catch (err) {
    console.error("[disease-intelligence] quality recalculation failed", err);
    return null;
  }
}
