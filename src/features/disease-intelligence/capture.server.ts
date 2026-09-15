// Writes a raw diagnostic case from a completed scan. Never throws into the
// farmer's diagnosis flow — capture failure is logged, not surfaced.

type Ctx = { supabase: any; userId: string };

export const PROMPT_VERSION = "fusion-v1";
export const DIAGNOSTIC_SCHEMA_VERSION = "canonical-fusion-1";

export type CaptureArgs = {
  scanId: string;
  modelName: string;
  confidenceInitial: number | null;
  confidenceAfterAnswers: number | null;
  confidenceAfterHistory: number | null;
  confidenceFinal: number | null;
  historyUsed: number;
};

export async function captureDiseaseCase(ctx: Ctx, args: CaptureArgs): Promise<string | null> {
  try {
    const { data: scan } = await ctx.supabase
      .from("crop_scans")
      .select(
        "id, farm_id, crop_name, plant_parts, farm_snapshot, weather_snapshot, image_analysis, diagnosis, differential, treatment_plan, evidence, severity, crop_scan_images(storage_path, plant_part, sort_order), crop_scan_questions(question, answer, category, sort_order)",
      )
      .eq("id", args.scanId)
      .maybeSingle();
    if (!scan?.diagnosis) return null;

    const farm = (scan.farm_snapshot ?? {}) as Record<string, any>;
    const analysis = (scan.image_analysis ?? {}) as Record<string, any>;
    const diagnosis = (scan.diagnosis ?? {}) as Record<string, any>;
    const differential = (scan.differential ?? {}) as Record<string, any>;
    const images = (scan.crop_scan_images ?? []) as Array<{
      storage_path: string;
      plant_part: string;
      sort_order: number;
    }>;
    const questions = (scan.crop_scan_questions ?? []) as Array<{
      question: string;
      answer: string | null;
      category: string | null;
      sort_order: number;
    }>;

    const { data: farmRow } = scan.farm_id
      ? await ctx.supabase
          .from("farms")
          .select("latitude, longitude, district, state, soil_type, irrigation_method")
          .eq("id", scan.farm_id)
          .maybeSingle()
      : { data: null };

    const aiDiagnosis = {
      top_diagnosis: {
        name: diagnosis["name"] ?? "Unknown",
        confidence: args.confidenceFinal ? args.confidenceFinal / 100 : null,
        type: diagnosis["type"] ?? "unknown",
      },
      alternatives: (differential["alsoConsider"] ?? []).map((a: Record<string, unknown>) => ({
        name: a["name"],
        confidence: typeof a["confidence"] === "number" ? (a["confidence"] as number) / 100 : null,
      })),
      observed_symptoms: analysis["symptoms"] ?? [],
      evidence: scan.evidence ?? {},
      severity: scan.severity ?? diagnosis["severity"] ?? null,
    };

    const { data: row, error } = await ctx.supabase
      .from("disease_cases")
      .upsert(
        {
          user_id: ctx.userId,
          farm_id: scan.farm_id,
          scan_id: scan.id,
          crop_name: scan.crop_name || farm["crop"] || analysis["crop"] || "Unknown",
          crop_stage: farm["stage"] ?? null,
          days_after_sowing: farm["daysAfterSowing"] ?? null,
          affected_part: (scan.plant_parts ?? [])[0] ?? analysis["plantParts"]?.[0] ?? null,
          symptoms: analysis["symptoms"] ?? [],
          location_lat: farmRow?.latitude ?? null,
          location_lng: farmRow?.longitude ?? null,
          location_name: [farmRow?.district, farmRow?.state].filter(Boolean).join(", ") || null,
          weather_context: scan.weather_snapshot ?? {},
          soil_context: farmRow?.soil_type ? { soilType: farmRow.soil_type } : {},
          irrigation_context: farmRow?.irrigation_method
            ? { irrigation: farmRow.irrigation_method }
            : {},
          ai_diagnosis: aiDiagnosis,
          model_name: args.modelName,
          model_version: args.modelName,
          prompt_version: PROMPT_VERSION,
          diagnostic_schema_version: DIAGNOSTIC_SCHEMA_VERSION,
          confidence_initial: args.confidenceInitial,
          confidence_after_answers: args.confidenceAfterAnswers,
          confidence_after_history: args.confidenceAfterHistory,
          confidence_final: args.confidenceFinal,
          followup_questions: questions.map((q) => ({
            question: q.question,
            category: q.category,
          })),
          followup_answers: questions
            .filter((q) => q.answer)
            .map((q) => ({ question: q.question, answer: q.answer })),
          recommended_treatment: scan.treatment_plan ?? {},
          image_count: images.length,
          case_status: "diagnosed",
          validation_status: "unverified",
        },
        { onConflict: "scan_id" },
      )
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const caseId = row.id as string;
    if (images.length) {
      await ctx.supabase.from("disease_case_images").upsert(
        images.map((img) => ({
          case_id: caseId,
          user_id: ctx.userId,
          storage_path: img.storage_path,
          image_type: img.plant_part || "other",
          image_order: img.sort_order ?? 0,
          quality_score:
            typeof analysis["imageQuality"]?.usable === "boolean"
              ? analysis["imageQuality"].usable
                ? 1
                : 0
              : null,
        })),
      );
    }
    return caseId;
  } catch (err) {
    console.error("[disease-intelligence] case capture failed", err);
    return null;
  }
}
