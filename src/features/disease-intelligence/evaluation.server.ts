// Reviewer-side aggregation. Reads raw cases plus their feedback, outcomes and
// reviews, joins them in memory and hands the result to the pure metrics module.
// Analytics failures here must never touch the diagnosis pipeline.

import { PROMOTION_RULES } from "./config";
import {
  calibration,
  confusionMatrix,
  coreMetrics,
  cropAnalytics,
  dataQualityIssues,
  diseaseAnalytics,
  errorPatterns,
  learningImpact,
  regionAnalytics,
  treatmentStats,
  type CaseRecord,
} from "./metrics";

type Ctx = { supabase: any; userId: string };

export type DashboardFilters = {
  crop?: string | null;
  disease?: string | null;
  region?: string | null;
  cropStage?: string | null;
  from?: string | null;
  to?: string | null;
};

function diagnosisName(ai: unknown): string | null {
  const d = ai as { top_diagnosis?: { name?: string }; name?: string } | null;
  return d?.top_diagnosis?.name ?? d?.name ?? null;
}

/** One row per case, with the latest feedback, outcome and review attached. */
export async function loadCaseRecords(ctx: Ctx): Promise<CaseRecord[]> {
  const { data: cases, error } = await ctx.supabase
    .from("disease_cases")
    .select(
      "id, crop_name, crop_stage, affected_part, symptoms, ai_diagnosis, validation_status, confidence_final, confidence_after_history, image_count, location_name, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) throw new Error(error.message);
  const rows = (cases ?? []) as Array<Record<string, any>>;
  if (!rows.length) return [];

  const ids = rows.map((r) => r["id"]);
  const [{ data: feedback }, { data: outcomes }, { data: reviews }] = await Promise.all([
    ctx.supabase
      .from("disease_feedback")
      .select("case_id, diagnosis_rating, created_at")
      .in("case_id", ids),
    ctx.supabase
      .from("disease_case_outcomes")
      .select("case_id, outcome, farmer_confirmed_disease, created_at")
      .in("case_id", ids),
    ctx.supabase
      .from("disease_review")
      .select("case_id, decision, corrected_disease, created_at")
      .in("case_id", ids),
  ]);

  const latest = <T extends { case_id: string; created_at: string }>(list: T[] | null) => {
    const map = new Map<string, T>();
    for (const item of list ?? []) {
      const prev = map.get(item.case_id);
      if (!prev || item.created_at > prev.created_at) map.set(item.case_id, item);
    }
    return map;
  };
  const fb = latest(feedback as any[]);
  const oc = latest(outcomes as any[]);
  const rv = latest(reviews as any[]);

  return rows.map((r) => {
    const id = r["id"] as string;
    const review = rv.get(id) as any;
    const outcome = oc.get(id) as any;
    return {
      id,
      crop_name: r["crop_name"],
      crop_stage: r["crop_stage"] ?? null,
      affected_part: r["affected_part"] ?? null,
      validation_status: r["validation_status"],
      confidence_final: r["confidence_final"] ?? null,
      image_count: r["image_count"] ?? 0,
      location_name: r["location_name"] ?? null,
      created_at: r["created_at"],
      diseaseName: diagnosisName(r["ai_diagnosis"]),
      correctedDisease:
        review?.corrected_disease ?? outcome?.farmer_confirmed_disease ?? null,
      rating: (fb.get(id) as any)?.diagnosis_rating ?? null,
      outcome: outcome?.outcome ?? null,
      reviewDecision: review?.decision ?? null,
      historyUsed: typeof r["confidence_after_history"] === "number",
    } satisfies CaseRecord;
  });
}

function applyFilters(rows: CaseRecord[], f: DashboardFilters): CaseRecord[] {
  return rows.filter((c) => {
    if (f.crop && c.crop_name !== f.crop) return false;
    if (f.disease && (c.correctedDisease ?? c.diseaseName) !== f.disease) return false;
    if (f.cropStage && c.crop_stage !== f.cropStage) return false;
    if (f.region && !(c.location_name ?? "").includes(f.region)) return false;
    if (f.from && c.created_at < f.from) return false;
    if (f.to && c.created_at > f.to) return false;
    return true;
  });
}

export async function buildDashboard(ctx: Ctx, filters: DashboardFilters = {}) {
  const all = await loadCaseRecords(ctx);
  const cases = applyFilters(all, filters);

  const [{ data: knowledge }, { count: outcomeCount }] = await Promise.all([
    ctx.supabase
      .from("disease_knowledge")
      .select(
        "id, crop_name, disease_name, knowledge_status, validation_status, quality_score, quality_level, source_case_count, independent_source_count, has_conflicting_evidence, last_validated_at, indexing_status, treatment_success_rate",
      )
      .limit(2000),
    ctx.supabase
      .from("disease_case_outcomes")
      .select("id", { count: "exact", head: true }),
  ]);

  const kRows = (knowledge ?? []) as Array<Record<string, any>>;
  const staleCutoff = Date.now() - PROMOTION_RULES.staleAfterDays * 86_400_000;
  const scores = kRows
    .map((k) => k["quality_score"])
    .filter((s): s is number => typeof s === "number");

  const duplicateCandidates = (() => {
    const seen = new Map<string, number>();
    for (const k of kRows) {
      const key = `${String(k["crop_name"]).toLowerCase()}|${String(k["disease_name"]).toLowerCase()}`;
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    return [...seen.values()].filter((n) => n > 1).length;
  })();

  return {
    overview: {
      totalCases: cases.length,
      casesWithFeedback: cases.filter((c) => c.rating).length,
      validatedCases: cases.filter((c) =>
        ["farmer_confirmed", "expert_verified", "system_validated"].includes(c.validation_status),
      ).length,
      expertReviewed: cases.filter((c) => c.reviewDecision).length,
      pendingReview: cases.filter((c) => c.validation_status === "unverified").length,
      rejectedCases: cases.filter((c) => c.validation_status === "rejected").length,
      knowledgeEntries: kRows.length,
      trustedEntries: kRows.filter((k) => k["knowledge_status"] === "trusted").length,
      knowledgeNeedingReview: kRows.filter((k) => k["knowledge_status"] === "needs_review").length,
      outcomesRecorded: outcomeCount ?? 0,
    },
    metrics: coreMetrics(cases),
    calibration: calibration(cases),
    diseases: diseaseAnalytics(cases).slice(0, 25),
    crops: cropAnalytics(cases).slice(0, 25),
    regions: regionAnalytics(cases).slice(0, 25),
    treatment: treatmentStats(cases.map((c) => c.outcome).filter((o): o is string => Boolean(o))),
    confusion: confusionMatrix(cases).slice(0, 15),
    errors: errorPatterns(cases),
    impact: learningImpact(cases),
    dataQuality: dataQualityIssues(cases),
    knowledgeHealth: {
      total: kRows.length,
      trusted: kRows.filter((k) => k["knowledge_status"] === "trusted").length,
      candidates: kRows.filter((k) => k["knowledge_status"] === "candidate").length,
      needsReview: kRows.filter((k) => k["knowledge_status"] === "needs_review").length,
      deprecated: kRows.filter((k) => k["knowledge_status"] === "deprecated").length,
      rejected: kRows.filter((k) => k["knowledge_status"] === "rejected").length,
      averageQuality: scores.length
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : null,
      conflicting: kRows.filter((k) => k["has_conflicting_evidence"]).length,
      stale: kRows.filter(
        (k) => !k["last_validated_at"] || new Date(k["last_validated_at"]).getTime() < staleCutoff,
      ).length,
      unindexed: kRows.filter((k) => k["indexing_status"] !== "indexed").length,
      duplicateCandidates,
    },
    filterOptions: {
      crops: [...new Set(all.map((c) => c.crop_name).filter(Boolean))].sort(),
      diseases: [
        ...new Set(all.map((c) => c.correctedDisease ?? c.diseaseName).filter(Boolean)),
      ].sort() as string[],
      stages: [...new Set(all.map((c) => c.crop_stage).filter(Boolean))].sort() as string[],
      regions: [
        ...new Set(
          all
            .map((c) => (c.location_name ?? "").split(",").pop()?.trim())
            .filter((r): r is string => Boolean(r)),
        ),
      ].sort(),
    },
    config: {
      trustedQualityThreshold: PROMOTION_RULES.trustedQualityThreshold,
      staleAfterDays: PROMOTION_RULES.staleAfterDays,
    },
  };
}

export type EvaluationDashboard = Awaited<ReturnType<typeof buildDashboard>>;
