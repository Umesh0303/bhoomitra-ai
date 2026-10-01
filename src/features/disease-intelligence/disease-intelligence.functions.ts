// Server functions for the Disease Intelligence layer: farmer feedback,
// treatment outcomes, validation/promotion, reviewer workflow and analytics.
// Every call is scoped by RLS to the signed-in user; reviewer-only calls check
// the role server-side before returning anything.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { DiseaseAnalytics } from "./types";

type Ctx = { supabase: any; userId: string };

async function isReviewer(ctx: Ctx): Promise<boolean> {
  const { data } = await ctx.supabase.rpc("is_reviewer", { _user_id: ctx.userId });
  return Boolean(data);
}

export const getMyDiseaseRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as Ctx;
    return { reviewer: await isReviewer(ctx) };
  });

/** The farmer's own case for a scan, with the latest feedback and outcome. */
export const getCaseForScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { scanId: string }) => i)
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const { data: kase } = await ctx.supabase
      .from("disease_cases")
      .select("id, crop_name, validation_status, case_status, promoted_at, created_at")
      .eq("scan_id", data.scanId)
      .maybeSingle();
    if (!kase) return { case: null, feedback: null, outcome: null };

    const [{ data: feedback }, { data: outcome }] = await Promise.all([
      ctx.supabase
        .from("disease_feedback")
        .select("*")
        .eq("case_id", kase.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      ctx.supabase
        .from("disease_case_outcomes")
        .select("*")
        .eq("case_id", kase.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    return { case: kase, feedback: feedback ?? null, outcome: outcome ?? null };
  });

export const submitDiagnosisFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { caseId: string; rating: string; notes?: string | null }) => i)
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const { error } = await ctx.supabase.from("disease_feedback").insert({
      case_id: data.caseId,
      user_id: ctx.userId,
      diagnosis_rating: data.rating,
      farmer_notes: data.notes ?? null,
    });
    if (error) throw new Error(error.message);

    const { evaluateAndPromoteCase } = await import("./promotion.server");
    const result = await evaluateAndPromoteCase(ctx, data.caseId).catch((err) => {
      console.error("[disease-intelligence] promotion after feedback failed", err);
      return { promoted: false, validationStatus: "unverified", reasons: [] };
    });
    return result;
  });

export const submitTreatmentOutcome = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (i: {
      caseId: string;
      treatmentFollowed: boolean;
      treatmentDetails?: string | null;
      daysAfterTreatment?: number | null;
      outcome: string;
      severityAfter?: string | null;
      confirmedDisease?: string | null;
      notes?: string | null;
      followupImages?: string[];
    }) => i,
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const { error } = await ctx.supabase.from("disease_case_outcomes").insert({
      case_id: data.caseId,
      user_id: ctx.userId,
      treatment_followed: data.treatmentFollowed,
      treatment_details: data.treatmentDetails ?? null,
      days_after_treatment: data.daysAfterTreatment ?? null,
      outcome: data.outcome,
      severity_after: data.severityAfter ?? null,
      farmer_confirmed_disease: data.confirmedDisease?.trim() || null,
      farmer_notes: data.notes ?? null,
      followup_images: (data.followupImages ?? []) as never,
    });
    if (error) throw new Error(error.message);

    const { evaluateAndPromoteCase } = await import("./promotion.server");
    return await evaluateAndPromoteCase(ctx, data.caseId).catch((err) => {
      console.error("[disease-intelligence] promotion after outcome failed", err);
      return { promoted: false, validationStatus: "unverified", reasons: [] };
    });
  });

// ------------------------------------------------------------- reviewer side

export const listCasesForReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { status?: string; sort?: string }) => i)
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    if (!(await isReviewer(ctx))) throw new Error("Forbidden");

    let q = ctx.supabase
      .from("disease_cases")
      .select(
        "id, crop_name, crop_stage, affected_part, symptoms, ai_diagnosis, confidence_final, validation_status, location_name, image_count, created_at, promoted_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status && data.status !== "all") q = q.eq("validation_status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const cases = (rows ?? []) as Array<Record<string, any>>;
    if (!cases.length) return [];
    const ids = cases.map((c) => c["id"]);

    const [{ data: feedback }, { data: outcomes }] = await Promise.all([
      ctx.supabase.from("disease_feedback").select("case_id, diagnosis_rating").in("case_id", ids),
      ctx.supabase.from("disease_case_outcomes").select("case_id, outcome").in("case_id", ids),
    ]);
    const fb = new Map((feedback ?? []).map((f: any) => [f.case_id, f.diagnosis_rating]));
    const oc = new Map((outcomes ?? []).map((o: any) => [o.case_id, o.outcome]));

    const enriched = cases.map((c) => ({
      ...c,
      rating: fb.get(c["id"]) ?? null,
      outcome: oc.get(c["id"]) ?? null,
      ageDays: Math.floor((Date.now() - new Date(c["created_at"]).getTime()) / 86_400_000),
    }));

    const sort = data.sort ?? "needs_review";
    const score = (c: (typeof enriched)[number]) => {
      switch (sort) {
        case "low_confidence":
          return -(c["confidence_final"] ?? 101);
        case "conflicting":
          return (c.rating === "incorrect" ? 2 : 0) + (c.outcome === "worse" ? 1 : 0);
        case "with_outcome":
          return c.outcome ? 1 : 0;
        case "high_impact":
          return (c.rating ? 1 : 0) + (c.outcome ? 1 : 0) + ((c["image_count"] ?? 0) > 1 ? 1 : 0);
        default:
          return c["validation_status"] === "unverified" ? 1 : 0;
      }
    };
    return enriched.sort((a, b) => score(b) - score(a));
  });

/** Everything a reviewer needs to judge one case, on one screen. */
export const getCaseDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { caseId: string }) => i)
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    if (!(await isReviewer(ctx))) throw new Error("Forbidden");

    const { data: kase, error } = await ctx.supabase
      .from("disease_cases")
      .select("*")
      .eq("id", data.caseId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!kase) throw new Error("Case not found");

    const [{ data: images }, { data: feedback }, { data: outcomes }, { data: history }, { data: retrieval }] =
      await Promise.all([
        ctx.supabase
          .from("disease_case_images")
          .select("id, storage_path, image_type, image_order")
          .eq("case_id", data.caseId)
          .order("image_order"),
        ctx.supabase
          .from("disease_feedback")
          .select("*")
          .eq("case_id", data.caseId)
          .order("created_at", { ascending: false }),
        ctx.supabase
          .from("disease_case_outcomes")
          .select("*")
          .eq("case_id", data.caseId)
          .order("created_at", { ascending: false }),
        ctx.supabase
          .from("disease_review_history")
          .select("*")
          .eq("case_id", data.caseId)
          .order("created_at", { ascending: false }),
        ctx.supabase
          .from("disease_retrieval_events")
          .select("knowledge_ids, similarities, retrieved_count, created_at")
          .eq("case_id", data.caseId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    // Signed, short-lived URLs so reviewer access is explicit and temporary.
    const paths = (images ?? []).map((i: { storage_path: string }) => i.storage_path);
    let imageUrls: Record<string, string> = {};
    if (paths.length) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: signed } = await supabaseAdmin.storage
        .from("crop-scans")
        .createSignedUrls(paths, 60 * 30);
      for (const s of signed ?? []) {
        if (s.path && s.signedUrl) imageUrls[s.path] = s.signedUrl;
      }
    }

    // Historical knowledge shown read-only — reviewers cannot edit it here.
    let historical: Array<Record<string, any>> = [];
    const ids = (retrieval as any)?.knowledge_ids as string[] | undefined;
    if (ids?.length) {
      const { data: k } = await ctx.supabase
        .from("disease_knowledge")
        .select(
          "id, crop_name, disease_name, knowledge_status, validation_status, quality_score, quality_level, diagnostic_evidence, source_case_count, independent_source_count",
        )
        .in("id", ids);
      const sims = ((retrieval as any)?.similarities ?? []) as number[];
      historical = (k ?? []).map((row: any) => ({
        ...row,
        similarity: sims[ids.indexOf(row.id)] ?? null,
      }));
    }

    return {
      case: kase,
      images: images ?? [],
      imageUrls,
      feedback: feedback ?? [],
      outcomes: outcomes ?? [],
      history: history ?? [],
      historical,
    };
  });

export const submitCaseReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (i: {
      caseId: string;
      decision: string;
      notes?: string | null;
      correctedDisease?: string | null;
      evidence?: string[];
      reviewSeconds?: number | null;
    }) => {
      if (!i.decision) throw new Error("A review decision is required");
      if (i.decision === "corrected" && !i.correctedDisease?.trim()) {
        throw new Error("Enter the correct disease name");
      }
      return i;
    },
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    if (!(await isReviewer(ctx))) throw new Error("Forbidden");

    const { data: before } = await ctx.supabase
      .from("disease_cases")
      .select("validation_status, ai_diagnosis")
      .eq("id", data.caseId)
      .maybeSingle();
    const previousDisease =
      (before?.ai_diagnosis as { top_diagnosis?: { name?: string } } | null)?.top_diagnosis?.name ??
      null;
    const correction = data.correctedDisease?.trim() || null;

    const { error } = await ctx.supabase.from("disease_review").insert({
      case_id: data.caseId,
      reviewer_id: ctx.userId,
      decision: data.decision,
      reviewer_notes: data.notes ?? null,
      corrected_disease: correction,
      evidence: (data.evidence ?? []) as never,
      review_seconds: data.reviewSeconds ?? null,
    });
    if (error) throw new Error(error.message);

    const verifying = data.decision === "verified" || data.decision === "corrected";
    const rejecting = data.decision === "incorrect" || data.decision === "duplicate";

    let result: Record<string, any>;
    let newStatus: string;

    if (rejecting) {
      newStatus = "rejected";
      await ctx.supabase
        .from("disease_cases")
        .update({ validation_status: "rejected", case_status: "validated" })
        .eq("id", data.caseId);
      result = {
        promoted: false,
        validationStatus: "rejected",
        reasons: [data.decision === "duplicate" ? "Marked duplicate" : "Marked incorrect"],
      };
    } else if (!verifying) {
      newStatus = before?.validation_status ?? "unverified";
      result = {
        promoted: false,
        validationStatus: newStatus,
        reasons: ["Kept open — more evidence needed"],
      };
    } else {
      const { evaluateAndPromoteCase } = await import("./promotion.server");
      result = await evaluateAndPromoteCase(ctx, data.caseId, {
        reviewVerified: true,
        reviewerCorrection: correction,
      });
      newStatus = result["validationStatus"] ?? "expert_verified";
    }

    // Append-only audit record — never overwrite a previous decision.
    await ctx.supabase.from("disease_review_history").insert({
      case_id: data.caseId,
      reviewer_id: ctx.userId,
      actor_kind: "reviewer",
      previous_status: before?.validation_status ?? null,
      new_status: newStatus,
      previous_disease: previousDisease,
      new_disease: correction ?? previousDisease,
      decision: data.decision,
      reason: (result["reasons"] as string[] | undefined)?.join(" · ") ?? null,
      evidence: (data.evidence ?? []) as never,
      notes: data.notes ?? null,
    });

    console.info("[disease-intelligence] reviewer decision", {
      caseId: data.caseId,
      decision: data.decision,
      newStatus,
    });

    return result as {
      promoted: boolean;
      validationStatus: string;
      reasons: string[];
      qualityScore?: number | null;
      knowledgeStatus?: string | null;
    };
  });

/** Full evaluation dashboard — reviewer only, aggregate data only. */
export const getEvaluationDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (i: {
      crop?: string | null;
      disease?: string | null;
      region?: string | null;
      cropStage?: string | null;
      from?: string | null;
      to?: string | null;
    }) => i,
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    if (!(await isReviewer(ctx))) throw new Error("Forbidden");
    const { buildDashboard } = await import("./evaluation.server");
    return await buildDashboard(ctx, data);
  });

export const listKnowledgeEntries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { status?: string }) => i)
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    if (!(await isReviewer(ctx))) throw new Error("Forbidden");
    let q = ctx.supabase
      .from("disease_knowledge")
      .select(
        "id, crop_name, disease_name, crop_stage, knowledge_status, status_reason, validation_status, quality_score, quality_level, source_case_count, independent_source_count, has_conflicting_evidence, treatment_success_rate, last_validated_at, indexing_status, knowledge_version",
      )
      .order("quality_score", { ascending: false, nullsFirst: false })
      .limit(200);
    if (data.status && data.status !== "all") q = q.eq("knowledge_status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as Array<Record<string, any>>;
  });

/** Manual lifecycle control. Entries are never deleted, only re-staged. */
export const setKnowledgeStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { knowledgeId: string; status: string; reason: string }) => {
    if (!i.reason.trim()) throw new Error("A reason is required");
    return i;
  })
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    if (!(await isReviewer(ctx))) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: before } = await supabaseAdmin
      .from("disease_knowledge")
      .select("knowledge_status, quality_score, knowledge_text, knowledge_version")
      .eq("id", data.knowledgeId)
      .maybeSingle();

    const { error } = await supabaseAdmin
      .from("disease_knowledge")
      .update({ knowledge_status: data.status, status_reason: data.reason })
      .eq("id", data.knowledgeId);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("disease_knowledge_versions").insert({
      knowledge_id: data.knowledgeId,
      version_number: ((before as any)?.knowledge_version ?? 1) as number,
      previous_content: {
        knowledge_status: (before as any)?.knowledge_status,
        quality_score: (before as any)?.quality_score,
      } as never,
      new_content: { knowledge_status: data.status } as never,
      quality_score: ((before as any)?.quality_score ?? null) as number | null,
      change_reason: data.reason,
      reviewer_id: ctx.userId,
    });
    return { ok: true };
  });

export const recomputeKnowledgeQuality = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { knowledgeId: string }) => i)
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    if (!(await isReviewer(ctx))) throw new Error("Forbidden");
    const { recalculateKnowledgeQuality } = await import("./quality.server");
    const res = await recalculateKnowledgeQuality(data.knowledgeId, {
      reviewerId: ctx.userId,
      reason: "Manual recalculation",
    });
    return { ok: Boolean(res), score: res?.quality.score ?? null, status: res?.status ?? null };
  });

/** Workload only — never a public ranking of reviewers. */
export const getReviewerPerformance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as Ctx;
    if (!(await isReviewer(ctx))) throw new Error("Forbidden");
    const { data } = await ctx.supabase
      .from("disease_review")
      .select("decision, review_seconds")
      .eq("reviewer_id", ctx.userId)
      .limit(2000);
    const rows = (data ?? []) as Array<{ decision: string; review_seconds: number | null }>;
    const times = rows.map((r) => r.review_seconds).filter((t): t is number => typeof t === "number");
    return {
      reviewed: rows.length,
      verified: rows.filter((r) => r.decision === "verified").length,
      rejected: rows.filter((r) => r.decision === "incorrect").length,
      corrected: rows.filter((r) => r.decision === "corrected").length,
      averageSeconds: times.length
        ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
        : null,
    };
  });

export const getDiseaseAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DiseaseAnalytics> => {
    const ctx = context as unknown as Ctx;
    if (!(await isReviewer(ctx))) throw new Error("Forbidden");

    const { data: cases } = await ctx.supabase
      .from("disease_cases")
      .select("id, crop_name, ai_diagnosis, validation_status, confidence_final, location_name")
      .limit(5000);
    const { data: outcomes } = await ctx.supabase
      .from("disease_case_outcomes")
      .select("outcome")
      .limit(5000);
    const { data: feedback } = await ctx.supabase
      .from("disease_feedback")
      .select("diagnosis_rating")
      .limit(5000);
    const { count: knowledgeEntries } = await ctx.supabase
      .from("disease_knowledge")
      .select("id", { count: "exact", head: true });

    const rows = (cases ?? []) as Array<Record<string, any>>;
    const tally = (values: Array<string | null | undefined>) => {
      const map = new Map<string, number>();
      for (const v of values) {
        const key = (v ?? "").trim();
        if (!key) continue;
        map.set(key, (map.get(key) ?? 0) + 1);
      }
      return [...map.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, count]) => ({ name, count }));
    };

    const outcomeValues = (outcomes ?? []).map((o: { outcome: string }) => o.outcome);
    const known = outcomeValues.filter((o: string) => o && o !== "unknown");
    const good = known.filter((o: string) => o === "fully_recovered" || o === "improved").length;
    const confidences = rows
      .map((r) => r["confidence_final"])
      .filter((c): c is number => typeof c === "number");
    const ratings = (feedback ?? []).map((f: { diagnosis_rating: string }) => f.diagnosis_rating);

    return {
      totalCases: rows.length,
      validatedCases: rows.filter((r) =>
        ["farmer_confirmed", "expert_verified", "system_validated"].includes(
          r["validation_status"],
        ),
      ).length,
      pendingValidation: rows.filter((r) => r["validation_status"] === "unverified").length,
      rejectedCases: rows.filter((r) => r["validation_status"] === "rejected").length,
      casesWithOutcome: outcomeValues.length,
      treatmentSuccessRate: known.length ? Math.round((good / known.length) * 100) : null,
      averageConfidence: confidences.length
        ? Math.round(confidences.reduce((a, c) => a + c, 0) / confidences.length)
        : null,
      farmerConfirmed: ratings.filter((r: string) => r === "correct").length,
      farmerCorrected: ratings.filter((r: string) => r === "incorrect").length,
      knowledgeEntries: knowledgeEntries ?? 0,
      topDiseases: tally(
        rows.map((r) => {
          const d = r["ai_diagnosis"] as { top_diagnosis?: { name?: string } } | null;
          return d?.top_diagnosis?.name ?? null;
        }),
      ),
      topCrops: tally(rows.map((r) => r["crop_name"])),
      regions: tally(rows.map((r) => r["location_name"])),
    };
  });
