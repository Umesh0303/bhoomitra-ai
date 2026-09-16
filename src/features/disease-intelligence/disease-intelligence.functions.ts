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
  .inputValidator((i: { status?: string }) => i)
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    if (!(await isReviewer(ctx))) throw new Error("Forbidden");

    let q = ctx.supabase
      .from("disease_cases")
      .select(
        "id, crop_name, crop_stage, affected_part, symptoms, ai_diagnosis, confidence_final, validation_status, location_name, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (data.status && data.status !== "all") q = q.eq("validation_status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const submitCaseReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (i: {
      caseId: string;
      decision: string;
      notes?: string | null;
      correctedDisease?: string | null;
    }) => i,
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    if (!(await isReviewer(ctx))) throw new Error("Forbidden");

    const { error } = await ctx.supabase.from("disease_review").insert({
      case_id: data.caseId,
      reviewer_id: ctx.userId,
      decision: data.decision,
      reviewer_notes: data.notes ?? null,
      corrected_disease: data.correctedDisease?.trim() || null,
    });
    if (error) throw new Error(error.message);

    if (data.decision === "incorrect") {
      await ctx.supabase
        .from("disease_cases")
        .update({ validation_status: "rejected", case_status: "validated" })
        .eq("id", data.caseId);
      return { promoted: false, validationStatus: "rejected", reasons: ["Marked incorrect"] };
    }
    if (data.decision !== "verified") {
      return { promoted: false, validationStatus: "unverified", reasons: ["Kept for review"] };
    }

    const { evaluateAndPromoteCase } = await import("./promotion.server");
    return await evaluateAndPromoteCase(ctx, data.caseId, {
      reviewVerified: true,
      reviewerCorrection: data.correctedDisease?.trim() || null,
    });
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
