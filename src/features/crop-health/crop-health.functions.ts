// Crop Health diagnostic pipeline (server functions).
//
//   farm context → weather → images → image analysis (top 3)
//   → dynamic questions → farmer answers
//   → EVIDENCE FUSION (image + weather + answers + farm + RAG)
//   → confidence calibration → reasoning → treatment → calendar tasks
//
// Prompts live in prompts.server.ts and are loaded inside handlers only.

import { createServerFn } from "@tanstack/react-start";
import { generateObject, generateText } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { BHOOMITRA_CHAT_MODEL } from "@/lib/ai-config";
import { findCropTemplate, stageForDay } from "@/lib/calendar/crop-stages";
import { calibrateConfidence, isUncertain, type EvidenceSources } from "./confidence";
import type { ScanDebug } from "./diagnostics";
import {
  CANONICAL_FUSION_JSON,
  FusionSchema,
  extractFinalJson,
  normalizeFinalDiagnosisResponse,
  validateFinalDiagnosis,
} from "./final-diagnosis-normalize";
import {
  CANONICAL_VISION_JSON,
  extractJson,
  normalizeVisionResponse,
  toImageAnalysis,
  validateVision,
} from "./vision-normalize";

import type {
  Candidate,
  Citation,
  FarmSnapshot,
  FusionResult,
  ImageAnalysis,
  RecoveryComparison,
  ScanQuestion,
  WeatherSnapshot,
} from "./types";

// Vision output contract lives in vision-normalize.ts.
// Question output contract lives in question-normalize.ts.
// Final diagnosis contract (FusionSchema) lives in final-diagnosis-normalize.ts.

// ---------------------------------------------------------------- helpers

async function gatewayModel() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI service is not configured");
  const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
  return { provider: createLovableAiGatewayProvider(key)(BHOOMITRA_CHAT_MODEL), key };
}

/** Never swallows the cause: logs it fully and keeps the real message visible. */
function aiError(err: unknown): Error {
  const msg = err instanceof Error ? err.message : String(err);
  console.error("[crop-health] AI call failed", msg, "\n", err instanceof Error ? err.stack : "");
  if (/429|rate limit/i.test(msg)) return new Error(`AI is busy (429). ${msg}`);
  if (/402|credit/i.test(msg)) return new Error(`AI credits exhausted (402). ${msg}`);
  return new Error(`AI Gateway request failed — ${msg}`);
}

type SupabaseCtx = { supabase: any; userId: string };

async function loadFarmSnapshot(ctx: SupabaseCtx, farmId: string): Promise<FarmSnapshot> {
  const { data: farm, error } = await ctx.supabase
    .from("farms")
    .select("*, farm_water_sources(water_source)")
    .eq("id", farmId)
    .maybeSingle();
  if (error || !farm) throw new Error("Farm not found");

  let stage: string | null = null;
  let stageId: string | null = null;
  let das: number | null = null;
  if (farm.sowing_date) {
    das = Math.max(0, Math.round((Date.now() - new Date(farm.sowing_date).getTime()) / 86_400_000));
    const template = findCropTemplate(farm.current_crop);
    const s = stageForDay(template, das);
    stage = s.label;
    stageId = s.id;
  }

  return {
    farmId: farm.id,
    farmName: farm.farm_name,
    crop: farm.current_crop,
    soilType: farm.soil_type,
    irrigation: farm.irrigation_method,
    waterSources: (farm.farm_water_sources ?? []).map(
      (w: { water_source: string }) => w.water_source,
    ),
    area: `${farm.total_area} ${farm.area_unit}`,
    location: [farm.village, farm.district, farm.state].filter(Boolean).join(", "),
    stage,
    stageId,
    daysAfterSowing: das,
    sowingDate: farm.sowing_date,
  };
}

type CachedWeather = {
  current: { tempC?: number; humidity?: number; windKph?: number; conditionLabel?: string };
  daily: Array<{ dateIso: string; precipMm?: number; humidity?: number; rainProbability?: number }>;
};

async function loadWeatherSnapshot(ctx: SupabaseCtx, farmId: string): Promise<WeatherSnapshot> {
  const { data } = await ctx.supabase
    .from("weather_cache")
    .select("current, daily, fetched_at")
    .eq("farm_id", farmId)
    .maybeSingle();
  if (!data?.current) {
    return { available: false, summary: "No recent weather data for this farm." };
  }
  const w = { current: data.current, daily: data.daily ?? [] } as unknown as CachedWeather;
  const today = new Date().toISOString().slice(0, 10);
  const past = w.daily.filter((d) => d.dateIso < today).slice(-3);
  const future = w.daily.filter((d) => d.dateIso >= today).slice(0, 3);
  const sum = (rows: CachedWeather["daily"]) =>
    Math.round(rows.reduce((a, d) => a + (d.precipMm ?? 0), 0) * 10) / 10;

  return {
    available: true,
    tempC: w.current.tempC,
    humidity: w.current.humidity,
    windKph: w.current.windKph,
    conditionLabel: w.current.conditionLabel,
    rainLast3DaysMm: sum(past),
    rainNext3DaysMm: sum(future),
    maxHumidityNext3Days: future.length
      ? Math.max(...future.map((d) => d.humidity ?? 0))
      : undefined,
    summary: `Currently ${w.current.conditionLabel ?? "unknown"}, ${w.current.tempC ?? "?"}°C, ${w.current.humidity ?? "?"}% humidity.`,
  };
}

/** Best-effort RAG retrieval reusing the existing knowledge base. */
async function retrieveKnowledge(
  ctx: SupabaseCtx,
  query: string,
  apiKey: string,
): Promise<{ text: string; citations: Citation[] }> {
  try {
    const { embedQuery } = await import("@/features/knowledge/services/embeddingService.server");
    const emb = await embedQuery(query, apiKey);
    const { data } = await ctx.supabase.rpc("match_knowledge_chunks", {
      query_embedding: emb as unknown as string,
      user_uuid: ctx.userId,
      match_count: 8,
    });
    const rows = (data ?? []) as Array<{
      chunk_text: string;
      filename: string;
      page_number: number | null;
    }>;
    if (!rows.length) return { text: "", citations: [] };
    const top = rows.slice(0, 5);
    return {
      text: top
        .map(
          (r, i) =>
            `[${i + 1}] ${r.filename}${r.page_number ? ` p.${r.page_number}` : ""}\n${r.chunk_text}`,
        )
        .join("\n\n"),
      citations: top.map((r) => ({
        filename: r.filename,
        page: r.page_number,
        snippet: r.chunk_text.slice(0, 220),
      })),
    };
  } catch {
    return { text: "", citations: [] };
  }
}

async function signPaths(ctx: SupabaseCtx, paths: string[]): Promise<string[]> {
  if (!paths.length) return [];
  const { data } = await ctx.supabase.storage.from("crop-scans").createSignedUrls(paths, 3600);
  return (data ?? []).map((d: { signedUrl?: string }) => d.signedUrl).filter(Boolean) as string[];
}

// ---------------------------------------------------------------- functions

export const createScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { farmId: string; parentScanId?: string | null }) => i)
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as SupabaseCtx;
    const farm = await loadFarmSnapshot(ctx, data.farmId);
    const weather = await loadWeatherSnapshot(ctx, data.farmId);

    const { data: row, error } = await ctx.supabase
      .from("crop_scans")
      .insert({
        user_id: ctx.userId,
        farm_id: data.farmId,
        parent_scan_id: data.parentScanId ?? null,
        status: "draft",
        crop_name: farm.crop,
        farm_snapshot: farm as never,
        weather_snapshot: weather as never,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { scanId: row.id as string, farm, weather };
  });

export const analyzeScanImages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { scanId: string }) => i)
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as SupabaseCtx;
    const { StageTracker, aiStage, describeError } = await import("./diagnostics.server");
    const tracker = new StageTracker({
      scanId: data.scanId,
      userId: ctx.userId,
      visionModel: BHOOMITRA_CHAT_MODEL,
    });
    tracker.debug.vision.model = BHOOMITRA_CHAT_MODEL;

    try {
      const scan = await tracker.run("images_uploaded", async () => {
        const { data: row, error } = await ctx.supabase
          .from("crop_scans")
          .select(
            "id, farm_id, farm_snapshot, weather_snapshot, crop_scan_images(storage_path, plant_part, bytes)",
          )
          .eq("id", data.scanId)
          .maybeSingle();
        if (error) throw new Error(error.message);
        if (!row) throw new Error("Scan not found");
        const imgs = (row.crop_scan_images ?? []) as Array<{ storage_path: string }>;
        if (!imgs.length) throw new Error("No uploaded photos found for this scan");
        return row;
      });

      const images = (scan.crop_scan_images ?? []) as Array<{
        storage_path: string;
        plant_part: string;
        bytes: number | null;
      }>;
      tracker.set("imagesCount", images.length);
      tracker.set("farmId", (scan.farm_id as string) ?? null);
      tracker.debug.vision.imageCount = images.length;
      tracker.debug.vision.imageBytes = images.reduce((a, i) => a + (i.bytes ?? 0), 0);

      const urls = await tracker.run(
        "signed_urls",
        async () => {
          const signed = await signPaths(
            ctx,
            images.map((i) => i.storage_path),
          );
          if (signed.length !== images.length) {
            throw new Error(`Signed ${signed.length}/${images.length} images`);
          }
          return signed;
        },
        (u) => `${u.length} urls`,
      );

      const farm = await tracker.run(
        "farm_context",
        async () => {
          const snap = scan.farm_snapshot as unknown as FarmSnapshot | null;
          if (!snap) throw new Error("Farm snapshot missing on scan");
          return snap;
        },
        (f) => f.farmName,
      );
      tracker.raw("farmContext", farm);

      if (farm.stage) {
        tracker.ok("crop_calendar", 0, `${farm.stage} (DAS ${farm.daysAfterSowing ?? "?"})`);
      } else {
        tracker.skipped("crop_calendar", "No sowing date on this farm");
      }

      const weather = await tracker.run(
        "weather",
        async () => {
          const snap = (scan.weather_snapshot as unknown as WeatherSnapshot | null) ?? {
            available: false,
            summary: "No weather snapshot on this scan.",
          };
          return snap;
        },
        (w) => (w.available ? "available" : "unavailable"),
      );
      tracker.set("weatherLoaded", weather.available);
      tracker.raw("weatherResponse", weather);

      const { buildImageAnalysisPrompt } = await import("./prompts.server");
      const { provider } = await tracker.run("ai_request", async () => gatewayModel());

      const system = buildImageAnalysisPrompt(farm, weather);
      tracker.debug.vision.promptChars = system.length;
      tracker.raw("visionRequest", {
        model: BHOOMITRA_CHAT_MODEL,
        systemChars: system.length,
        images: images.map((i) => ({ plantPart: i.plant_part, bytes: i.bytes })),
      });
      tracker.raw("expectedSchema", CANONICAL_VISION_JSON);

      let analysis: ImageAnalysis;
      const t0 = Date.now();
      let rawText = "";
      try {
        const result = await generateText({
          model: provider,
          system,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Photos attached (${images.map((i) => i.plant_part).join(", ")}). Analyse them and return ONLY the canonical JSON object.`,
                },
                ...urls.map((u) => ({ type: "image" as const, image: new URL(u) })),
              ],
            },
          ],
        });
        rawText = result.text ?? "";
        const ms = Date.now() - t0;
        tracker.set("gatewayStatus", "200");
        Object.assign(tracker.debug.vision, {
          gatewayStatus: "200",
          responseMs: ms,
          promptTokens: result.usage?.inputTokens ?? null,
          completionTokens: result.usage?.outputTokens ?? null,
          totalTokens: result.usage?.totalTokens ?? null,
          requestId: (result.response as { id?: string } | undefined)?.id ?? null,
        });
        tracker.perf("visionMs", ms);
        // Original model output, logged separately from the normalized form.
        tracker.raw("visionResponse", rawText);
        tracker.ok("ai_response", ms, `${rawText.length} chars`);
      } catch (err) {
        throw tracker.recordFailure(aiStage(err), err, Date.now() - t0);
      }

      try {
        const normalized = normalizeVisionResponse(extractJson(rawText));
        tracker.raw("normalizedResponse", normalized);
        const canonical = validateVision(normalized);
        analysis = toImageAnalysis(canonical);
        tracker.ok(
          "json_parse",
          0,
          `${canonical.crop} · ${canonical.severity} · ${canonical.candidates.length} candidates`,
        );
      } catch (err) {
        throw tracker.recordFailure("json_parse", err, 0);
      }

      await tracker.run(
        "candidates",
        async () => {
          if (!analysis.candidates?.length) throw new Error("Model returned zero candidates");
          return analysis.candidates;
        },
        (c) => c.map((x) => `${x.name} ${x.confidence}%`).join(", "),
      );

      await tracker.run("db_save", async () => {
        const { error } = await ctx.supabase
          .from("crop_scans")
          .update({
            status: "analyzed",
            crop_name: analysis.crop || farm.crop,
            plant_parts: images.map((i) => i.plant_part),
            image_analysis: analysis as never,
            candidates: analysis.candidates as never,
          })
          .eq("id", data.scanId);
        if (error) throw new Error(error.message);
        return true;
      });

      tracker.perf("analysisTotalMs", tracker.debug.totalMs);
      return { ...analysis, debug: tracker.debug };
    } catch (err) {
      if (err instanceof Error && err.message.includes("CROPHEALTH_ERR::")) throw err;
      throw tracker.fail(tracker.debug.currentStage ?? "ai_request", describeError(err));
    }
  });

export const generateScanQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { scanId: string }) => i)
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as SupabaseCtx;
    const { StageTracker } = await import("./diagnostics.server");
    const tracker = new StageTracker({
      scanId: data.scanId,
      userId: ctx.userId,
      visionModel: BHOOMITRA_CHAT_MODEL,
    });
    tracker.debug.vision.model = BHOOMITRA_CHAT_MODEL;

    const scan = await tracker.run("farm_context", async () => {
      const { data: row, error } = await ctx.supabase
        .from("crop_scans")
        .select("id, farm_id, farm_snapshot, weather_snapshot, image_analysis")
        .eq("id", data.scanId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!row) throw new Error("Scan not found");
      if (!(row.image_analysis as { candidates?: unknown[] } | null)?.candidates?.length) {
        throw new Error("Run image analysis first");
      }
      return row;
    });
    tracker.set("farmId", (scan.farm_id as string) ?? null);
    const analysis = scan.image_analysis as unknown as ImageAnalysis;
    const weatherSnap = scan.weather_snapshot as unknown as WeatherSnapshot | null;
    tracker.set("weatherLoaded", Boolean(weatherSnap?.available));

    const { buildQuestionsPrompt } = await import("./prompts.server");
    const {
      CANONICAL_QUESTIONS_JSON,
      candidateNames,
      extractQuestionJson,
      normalizeQuestionResponse,
      toScanQuestions,
      validateQuestions,
    } = await import("./question-normalize");
    const { provider } = await tracker.run("ai_request", async () => gatewayModel());

    // 1) Ask the model (plain text — the normalizer owns the shape contract).
    let rawText = "";
    const t0 = Date.now();
    try {
      const system = buildQuestionsPrompt(
        scan.farm_snapshot as unknown as FarmSnapshot,
        scan.weather_snapshot as unknown as WeatherSnapshot,
        analysis,
      );
      tracker.debug.vision.promptChars = system.length;
      tracker.raw("expectedSchema", CANONICAL_QUESTIONS_JSON);
      const result = await generateText({
        model: provider,
        system,
        prompt: "Generate the confirmation questions now. Return ONLY the canonical JSON object.",
      });
      rawText = result.text ?? "";
      const ms = Date.now() - t0;
      tracker.set("gatewayStatus", "200");
      Object.assign(tracker.debug.vision, {
        gatewayStatus: "200",
        responseMs: ms,
        promptTokens: result.usage?.inputTokens ?? null,
        completionTokens: result.usage?.outputTokens ?? null,
        totalTokens: result.usage?.totalTokens ?? null,
        requestId: (result.response as { id?: string } | undefined)?.id ?? null,
      });
      tracker.perf("questionsMs", ms);
      tracker.raw("questionResponse", rawText);
      tracker.ok("question_ai_response", ms, `${rawText.length} chars`);
    } catch (err) {
      throw tracker.recordFailure("question_ai_response", err, Date.now() - t0);
    }

    // 2) Normalize BEFORE validation (bare array, wrapper object, aliases).
    let normalized: unknown;
    const tNorm = Date.now();
    try {
      normalized = normalizeQuestionResponse(extractQuestionJson(rawText), {
        candidateNames: candidateNames(analysis),
        max: 6,
      });
      tracker.raw("normalizedQuestions", normalized);
      tracker.ok(
        "question_normalization",
        Date.now() - tNorm,
        `${(normalized as { questions: unknown[] }).questions.length} questions kept`,
      );
    } catch (err) {
      throw tracker.recordFailure("question_normalization", err, Date.now() - tNorm);
    }

    // 3) Zod validation on the canonical shape.
    let questions: ScanQuestion[];
    const tVal = Date.now();
    try {
      questions = toScanQuestions(validateQuestions(normalized));
      tracker.ok("question_validation", Date.now() - tVal, `${questions.length} questions valid`);
      tracker.ok("questions", 0, `${questions.length} questions`);
    } catch (err) {
      throw tracker.recordFailure("question_validation", err, Date.now() - tVal);
    }

    const saved = await tracker.run("question_db_save", async () => {
      await ctx.supabase.from("crop_scan_questions").delete().eq("scan_id", data.scanId);
      const rows = questions.slice(0, 6).map((q, index) => ({
        scan_id: data.scanId,
        user_id: ctx.userId,
        question: q.question,
        help_text: q.helpText || null,
        category: q.category,
        input_type: q.inputType,
        options: q.options as never,
        targets: q.targets as never,
        sort_order: index,
      }));
      const { data: inserted, error } = await ctx.supabase
        .from("crop_scan_questions")
        .insert(rows)
        .select("*");
      if (error) throw new Error(error.message);
      await ctx.supabase.from("crop_scans").update({ status: "questioning" }).eq("id", data.scanId);
      return inserted;
    });

    return { questions: saved as never as ScanQuestion[], debug: tracker.debug };
  });

export const saveScanAnswers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { scanId: string; answers: Array<{ id: string; answer: string }> }) => i)
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as SupabaseCtx;
    for (const a of data.answers) {
      await ctx.supabase
        .from("crop_scan_questions")
        .update({ answer: a.answer })
        .eq("id", a.id)
        .eq("scan_id", data.scanId);
    }
    return { saved: data.answers.length };
  });

/** The Evidence Fusion Engine: combines every source into one calibrated call. */
export const fuseScanEvidence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { scanId: string }) => i)
  .handler(async ({ data, context }): Promise<FusionResult & { debug: ScanDebug }> => {
    const ctx = context as unknown as SupabaseCtx;
    const { StageTracker, aiStage } = await import("./diagnostics.server");
    const tracker = new StageTracker({
      scanId: data.scanId,
      userId: ctx.userId,
      visionModel: BHOOMITRA_CHAT_MODEL,
    });
    tracker.debug.vision.model = BHOOMITRA_CHAT_MODEL;

    const scan = await tracker.run("farm_context", async () => {
      const { data: row, error } = await ctx.supabase
        .from("crop_scans")
        .select(
          "id, farm_id, parent_scan_id, farm_snapshot, weather_snapshot, image_analysis, crop_scan_questions(*)",
        )
        .eq("id", data.scanId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!row) throw new Error("Scan not found");
      if (!(row.image_analysis as { candidates?: unknown[] } | null)?.candidates?.length) {
        throw new Error("Run image analysis first");
      }
      return row;
    });

    const analysis = scan.image_analysis as unknown as ImageAnalysis;
    const farm = scan.farm_snapshot as unknown as FarmSnapshot;
    const weather = scan.weather_snapshot as unknown as WeatherSnapshot;
    tracker.set("farmId", farm?.farmId ?? (scan.farm_id as string) ?? null);
    tracker.set("weatherLoaded", Boolean(weather?.available));
    tracker.ok("weather", 0, weather?.available ? "available" : "unavailable");

    const questions = (
      (scan.crop_scan_questions ?? []) as Array<{
        question: string;
        answer: string | null;
        category: string | null;
        input_type: string;
        options: unknown;
        targets: unknown;
        help_text: string | null;
        sort_order: number;
      }>
    )
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((q) => ({
        question: q.question,
        answer: q.answer,
        category: q.category ?? "symptom",
        inputType: (q.input_type as "single" | "multi") ?? "single",
        options: (q.options as Array<{ label: string; value: string }>) ?? [],
        targets: (q.targets as string[]) ?? [],
      })) as ScanQuestion[];

    const { key, provider } = await tracker.run("ai_request", async () => gatewayModel());
    const ragQuery = [
      farm.crop ?? "",
      analysis.candidates.map((c: Candidate) => c.name).join(" "),
      analysis.symptoms.join(" "),
    ]
      .join(" ")
      .trim();
    const knowledge = await tracker.runSoft(
      "knowledge",
      async () => retrieveKnowledge(ctx, ragQuery, key),
      { text: "", citations: [] as Citation[] },
      (k) => `${k.citations.length} citations`,
    );
    tracker.set("knowledgeLoaded", knowledge.citations.length > 0);
    tracker.raw("knowledgeChunks", knowledge.text);
    tracker.raw("farmContext", farm);
    tracker.raw("weatherResponse", weather);

    let previous: { diagnosis: string; date: string; severity: string } | null = null;
    if (scan.parent_scan_id) {
      const { data: prev } = await ctx.supabase
        .from("crop_scans")
        .select("diagnosis, severity, created_at")
        .eq("id", scan.parent_scan_id)
        .maybeSingle();
      if (prev?.diagnosis) {
        previous = {
          diagnosis: (prev.diagnosis as { name?: string }).name ?? "unknown",
          date: new Date(prev.created_at as string).toISOString().slice(0, 10),
          severity: (prev.severity as string) ?? "unknown",
        };
      }
    }

    const { buildFusionPrompt } = await import("./prompts.server");

    // 1) Ask the model (plain text — the normalizer owns the shape contract).
    let rawText = "";
    const t0 = Date.now();
    try {
      const system = buildFusionPrompt({
        farm,
        weather,
        analysis,
        questions,
        knowledge: knowledge.text,
        previous,
      });
      tracker.debug.vision.promptChars = system.length;
      tracker.raw("visionRequest", { model: BHOOMITRA_CHAT_MODEL, systemChars: system.length });
      tracker.raw("expectedSchema", CANONICAL_FUSION_JSON);
      const result = await generateText({
        model: provider,
        system,
        prompt:
          "Fuse all evidence and produce the final diagnosis now. Return ONLY the canonical JSON object.",
      });
      rawText = result.text ?? "";
      const ms = Date.now() - t0;
      tracker.set("gatewayStatus", "200");
      Object.assign(tracker.debug.vision, {
        gatewayStatus: "200",
        responseMs: ms,
        promptTokens: result.usage?.inputTokens ?? null,
        completionTokens: result.usage?.outputTokens ?? null,
        totalTokens: result.usage?.totalTokens ?? null,
        requestId: (result.response as { id?: string } | undefined)?.id ?? null,
      });
      tracker.perf("reasoningMs", ms);
      tracker.raw("finalResponse", rawText);
      tracker.ok("ai_response", ms);
      tracker.ok("final_ai_response", ms, `${rawText.length} chars`);
    } catch (err) {
      const stage = aiStage(err);
      throw tracker.recordFailure(
        stage === "ai_request" || stage === "ai_response" ? "final_ai_response" : stage,
        err,
        Date.now() - t0,
      );
    }

    // 2) Normalize BEFORE validation.
    let normalized: unknown;
    const tNorm = Date.now();
    try {
      normalized = normalizeFinalDiagnosisResponse(extractFinalJson(rawText));
      tracker.raw("normalizedFinal", normalized);
      tracker.ok("final_normalization", Date.now() - tNorm, "canonical shape built");
    } catch (err) {
      throw tracker.recordFailure("final_normalization", err, Date.now() - tNorm);
    }

    // 3) Validate the canonical object.
    let fused: z.infer<typeof FusionSchema>;
    const tVal = Date.now();
    try {
      fused = validateFinalDiagnosis(normalized);
      tracker.ok("final_validation", Date.now() - tVal, fused.diagnosis.name);
      tracker.ok("json_parse", 0, "schema validated");
      tracker.ok("final_diagnosis", 0, fused.diagnosis.name);
    } catch (err) {
      throw tracker.recordFailure("final_validation", err, Date.now() - tVal);
    }


    const answered = questions.filter((q) => q.answer && q.answer.trim().length > 0).length;
    const sources: EvidenceSources = {
      hasImages: true,
      answeredQuestions: answered,
      hasWeather: weather.available,
      hasFarmContext: Boolean(farm.crop || farm.soilType || farm.stage),
      hasKnowledge: knowledge.citations.length > 0,
      imageQualityOk: analysis.imageQuality?.usable !== false,
    };
    const { confidenceCap } = await import("./confidence");
    const confidence = await tracker.run(
      "confidence",
      async () => {
        const value = calibrateConfidence(fused.confidence, sources);
        if (!Number.isFinite(value))
          throw new Error("Calibration produced a non-numeric confidence");
        tracker.raw("confidenceTrace", {
          confidenceBefore: fused.confidence,
          confidenceAfter: value,
          confidenceCap: confidenceCap(sources),
          evidenceSourcesUsed: sources,
          answersUsed: questions
            .filter((q) => q.answer)
            .map((q) => `${q.question} → ${q.answer}`),
          candidateRanking: analysis.candidates.map(
            (c: Candidate) => `${c.name} ${c.confidence}%`,
          ),
        });
        return value;
      },
      (c) => `${fused.confidence}% raw → ${c}% calibrated (cap ${confidenceCap(sources)}%)`,
    );

    const uncertain = fused.uncertain || isUncertain(confidence);

    const plan = fused.treatmentPlan;
    const treatmentCount =
      plan.organic.length + plan.chemical.length + plan.cultural.length + plan.preventive.length;
    if (treatmentCount) tracker.ok("treatment", 0, `${treatmentCount} treatments`);
    else tracker.skipped("treatment", "Model returned no treatments");

    const out: FusionResult = {
      ...(fused as unknown as FusionResult),
      confidence,
      uncertain,
      citations: knowledge.citations,
    };

    await tracker.run("db_save", async () => {
      const { error } = await ctx.supabase
        .from("crop_scans")
        .update({
          status: "completed",
          diagnosis: out.diagnosis as never,
          confidence,
          severity: out.diagnosis.severity,
          disease_type: out.diagnosis.type,
          evidence: out.evidence as never,
          reasoning: out.reasoning,
          differential: out.differential as never,
          missing_evidence: out.missingEvidence as never,
          treatment_plan: out.treatmentPlan as never,
          weather_risk: out.weatherRisk as never,
          progression: out.progression as never,
          health_score: out.healthScore as never,
          alerts: out.alerts as never,
          citations: knowledge.citations as never,
        })
        .eq("id", data.scanId);
      if (error) throw new Error(error.message);
      return true;
    });

    tracker.perf("fusionTotalMs", tracker.debug.totalMs);
    return { ...out, debug: tracker.debug };
  });

/** Writes follow-up reminders into the existing crop calendar (additive rows). */
export const createScanReminders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { scanId: string }) => i)
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as SupabaseCtx;
    const { data: scan } = await ctx.supabase
      .from("crop_scans")
      .select("id, farm_id, crop_name, diagnosis, treatment_plan, created_at")
      .eq("id", data.scanId)
      .maybeSingle();
    if (!scan?.diagnosis) throw new Error("Complete the diagnosis first");

    const diag = scan.diagnosis as { name?: string };
    const iso = (offset: number) =>
      new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

    const rows = [
      {
        task_name: `Spray treatment for ${diag.name ?? "detected issue"}`,
        task_type: "spraying",
        task_date: iso(1),
        priority: "high",
        day_offset: 1,
      },
      {
        task_name: `Follow-up scan for ${diag.name ?? "detected issue"}`,
        task_type: "inspection",
        task_date: iso(6),
        priority: "normal",
        day_offset: 6,
      },
    ].map((t) => ({
      farm_id: scan.farm_id,
      user_id: ctx.userId,
      crop_name: scan.crop_name ?? "Crop",
      stage: "crop-health",
      stage_id: "crop-health.scan",
      status: "upcoming",
      source: "crop-health",
      template_hash: `crop-health:${scan.id}:${t.task_type}`,
      metadata: { scanId: scan.id, diagnosis: diag.name ?? null } as never,
      ...t,
    }));

    const { error } = await ctx.supabase
      .from("calendar_tasks")
      .upsert(rows, { onConflict: "template_hash", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
    await ctx.supabase
      .from("crop_scans")
      .update({ treatment_status: "scheduled" })
      .eq("id", data.scanId);
    return { created: rows.length };
  });

export const compareWithPreviousScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { scanId: string }) => i)
  .handler(async ({ data, context }): Promise<RecoveryComparison> => {
    const ctx = context as unknown as SupabaseCtx;
    const { data: scan } = await ctx.supabase
      .from("crop_scans")
      .select("id, parent_scan_id, diagnosis, progression, health_score, severity")
      .eq("id", data.scanId)
      .maybeSingle();
    if (!scan?.parent_scan_id) throw new Error("This scan has no previous scan to compare with");

    const { data: prev } = await ctx.supabase
      .from("crop_scans")
      .select("diagnosis, progression, health_score, severity, created_at")
      .eq("id", scan.parent_scan_id)
      .maybeSingle();
    if (!prev) throw new Error("Previous scan not found");

    const { buildComparisonPrompt } = await import("./prompts.server");
    const { provider } = await gatewayModel();

    let comparison: RecoveryComparison;
    try {
      const result = await generateObject({
        model: provider,
        schema: z.object({
          status: z.enum(["improved", "no_change", "worsened", "unknown"]),
          recoveryPct: z.number().min(0).max(100),
          notes: z.array(z.string()).default([]),
        }),
        system: buildComparisonPrompt(),
        prompt: `PREVIOUS (${prev.created_at}):\n${JSON.stringify({ diagnosis: prev.diagnosis, progression: prev.progression, health: prev.health_score, severity: prev.severity })}\n\nCURRENT:\n${JSON.stringify({ diagnosis: scan.diagnosis, progression: scan.progression, health: scan.health_score, severity: scan.severity })}`,
      });
      comparison = result.object as RecoveryComparison;
    } catch (err) {
      throw aiError(err);
    }

    await ctx.supabase
      .from("crop_scans")
      .update({ recovery: comparison as never })
      .eq("id", data.scanId);
    return comparison;
  });
