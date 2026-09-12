// Shared (client-safe) diagnostics for the Crop Health pipeline.
// Diagnostics are completely separate from business logic: the server records a
// timed, classified record for every stage, and failures carry an error code,
// readable message, raw payloads (dev only) and recovery hints so the UI can
// tell a developer what failed, why, and how to fix it.

export type ScanStage =
  | "image_compression"
  | "images_uploaded"
  | "signed_urls"
  | "farm_context"
  | "crop_calendar"
  | "weather"
  | "knowledge"
  | "ai_request"
  | "ai_response"
  | "json_parse"
  | "candidates"
  | "questions"
  | "question_ai_response"
  | "question_normalization"
  | "question_validation"
  | "question_db_save"
  | "final_diagnosis"
  | "confidence"
  | "treatment"
  | "db_save"
  | "calendar_reminder";

/** Pipeline order used for the timeline view. */
export const STAGE_ORDER: ScanStage[] = [
  "image_compression",
  "images_uploaded",
  "signed_urls",
  "farm_context",
  "crop_calendar",
  "weather",
  "knowledge",
  "ai_request",
  "ai_response",
  "json_parse",
  "candidates",
  "questions",
  "question_ai_response",
  "question_normalization",
  "question_validation",
  "question_db_save",
  "final_diagnosis",
  "confidence",
  "treatment",
  "db_save",
  "calendar_reminder",
];

export const STAGE_LABEL: Record<ScanStage, string> = {
  image_compression: "Image compression",
  images_uploaded: "Image upload",
  signed_urls: "Signed URL generation",
  farm_context: "Farm context",
  crop_calendar: "Crop calendar",
  weather: "Weather retrieval",
  knowledge: "Knowledge retrieval",
  ai_request: "Vision AI request",
  ai_response: "Vision AI response",
  json_parse: "JSON validation",
  candidates: "Candidate generation",
  questions: "Question generation",
  question_ai_response: "Question AI response",
  question_normalization: "Question normalization",
  question_validation: "Question JSON validation",
  question_db_save: "Question database save",
  final_diagnosis: "Final diagnosis",
  confidence: "Confidence calibration",
  treatment: "Treatment generation",
  db_save: "Database save",
  calendar_reminder: "Calendar reminder creation",
};

export const STAGE_FAILURE: Record<ScanStage, string> = {
  image_compression: "Image compression failed",
  images_uploaded: "Image upload failed",
  signed_urls: "Signed URL generation failed",
  farm_context: "Farm context lookup failed",
  crop_calendar: "Crop calendar lookup failed",
  weather: "Weather lookup failed",
  knowledge: "Knowledge base retrieval failed",
  ai_request: "Vision AI request failed",
  ai_response: "Vision AI returned an error",
  json_parse: "Model returned invalid JSON / schema validation failed",
  candidates: "Candidate generation failed",
  questions: "Question generation failed",
  question_ai_response: "Question AI request failed",
  question_normalization: "Question response could not be normalized",
  question_validation: "Question JSON failed schema validation",
  question_db_save: "Saving the questions failed",
  final_diagnosis: "Final reasoning failed",
  confidence: "Confidence calibration failed",
  treatment: "Treatment generation failed",
  db_save: "Database save failed",
  calendar_reminder: "Calendar reminder creation failed",
};

export type ErrorCode =
  | "IMAGE_COMPRESSION_FAILED"
  | "IMAGE_UPLOAD_FAILED"
  | "SIGNED_URL_FAILED"
  | "FARM_CONTEXT_FAILED"
  | "CALENDAR_CONTEXT_FAILED"
  | "WEATHER_FAILED"
  | "KNOWLEDGE_FAILED"
  | "VISION_REQUEST_FAILED"
  | "VISION_TIMEOUT"
  | "INVALID_MODEL_RESPONSE"
  | "JSON_SCHEMA_FAILED"
  | "CANDIDATE_GENERATION_FAILED"
  | "QUESTION_GENERATION_FAILED"
  | "QUESTION_AI_FAILED"
  | "QUESTION_NORMALIZATION_FAILED"
  | "QUESTION_SCHEMA_FAILED"
  | "QUESTION_DB_SAVE_FAILED"
  | "FINAL_REASONING_FAILED"
  | "CONFIDENCE_FAILED"
  | "TREATMENT_FAILED"
  | "DATABASE_SAVE_FAILED"
  | "CALENDAR_FAILED"
  | "UNKNOWN_ERROR";

export const STAGE_CODE: Record<ScanStage, ErrorCode> = {
  image_compression: "IMAGE_COMPRESSION_FAILED",
  images_uploaded: "IMAGE_UPLOAD_FAILED",
  signed_urls: "SIGNED_URL_FAILED",
  farm_context: "FARM_CONTEXT_FAILED",
  crop_calendar: "CALENDAR_CONTEXT_FAILED",
  weather: "WEATHER_FAILED",
  knowledge: "KNOWLEDGE_FAILED",
  ai_request: "VISION_REQUEST_FAILED",
  ai_response: "INVALID_MODEL_RESPONSE",
  json_parse: "JSON_SCHEMA_FAILED",
  candidates: "CANDIDATE_GENERATION_FAILED",
  questions: "QUESTION_GENERATION_FAILED",
  question_ai_response: "QUESTION_AI_FAILED",
  question_normalization: "QUESTION_NORMALIZATION_FAILED",
  question_validation: "QUESTION_SCHEMA_FAILED",
  question_db_save: "QUESTION_DB_SAVE_FAILED",
  final_diagnosis: "FINAL_REASONING_FAILED",
  confidence: "CONFIDENCE_FAILED",
  treatment: "TREATMENT_FAILED",
  db_save: "DATABASE_SAVE_FAILED",
  calendar_reminder: "CALENDAR_FAILED",
};

/** Possible causes + suggested action shown next to every failure. */
export const RECOVERY: Record<ErrorCode, { causes: string[]; action: string }> = {
  IMAGE_COMPRESSION_FAILED: {
    causes: ["Unsupported image format", "Corrupt file", "Browser canvas blocked"],
    action: "Re-take the photo as JPEG/PNG and try again.",
  },
  IMAGE_UPLOAD_FAILED: {
    causes: ["Storage bucket policy incorrect", "Network dropped mid-upload", "File too large"],
    action: "Retry the upload stage; if it repeats, check the crop-scans bucket policies.",
  },
  SIGNED_URL_FAILED: {
    causes: [
      "Bucket policy incorrect",
      "Expired URL",
      "Storage unavailable",
      "Object path missing",
    ],
    action: "Regenerate signed URLs (retry this stage).",
  },
  FARM_CONTEXT_FAILED: {
    causes: ["Farm row missing", "Snapshot not written on the scan", "RLS blocked the read"],
    action: "Confirm the farm exists and is owned by the signed-in user, then retry.",
  },
  CALENDAR_CONTEXT_FAILED: {
    causes: ["No sowing date on the farm", "Unknown crop template"],
    action: "Set a sowing date and crop on the farm; the pipeline continues without it.",
  },
  WEATHER_FAILED: {
    causes: ["No cached weather for this farm", "Weather provider unavailable"],
    action: "Open the Weather module for this farm to refresh the cache, then retry.",
  },
  KNOWLEDGE_FAILED: {
    causes: ["Embedding call failed", "No documents indexed", "pgvector RPC error"],
    action: "Retry; diagnosis can continue without knowledge citations.",
  },
  VISION_REQUEST_FAILED: {
    causes: [
      "Missing/invalid LOVABLE_API_KEY",
      "Gateway unreachable",
      "429 rate limit",
      "402 credits",
    ],
    action: "Check the gateway status shown below; wait and retry on 429, add credits on 402.",
  },
  VISION_TIMEOUT: {
    causes: ["Too many/large images", "Model overloaded"],
    action: "Reduce image count or size and retry the vision stage.",
  },
  INVALID_MODEL_RESPONSE: {
    causes: ["Model returned an error body", "Content filtered", "Empty completion"],
    action: "Inspect the raw model response below and retry the vision stage.",
  },
  JSON_SCHEMA_FAILED: {
    causes: [
      "Model emitted prose instead of JSON",
      "Field missing or wrong type",
      "Truncated output",
    ],
    action: "Compare expected schema vs actual response below, then retry the stage.",
  },
  CANDIDATE_GENERATION_FAILED: {
    causes: ["Model returned zero candidates", "Image unusable"],
    action: "Add a clearer close-up photo and retry the analysis stage.",
  },
  QUESTION_AI_FAILED: {
    causes: ["Gateway error or timeout", "Rate limit / credits", "Prompt too large"],
    action: "Retry question generation — the vision analysis is already saved.",
  },
  QUESTION_NORMALIZATION_FAILED: {
    causes: [
      "Model returned no questions",
      "Reply was prose or markdown instead of JSON",
      "Questions missing usable text/options",
    ],
    action:
      "Retry; check the raw question response in dev diagnostics to see the shape returned.",
  },
  QUESTION_SCHEMA_FAILED: {
    causes: [
      "Normalized questions still miss required fields",
      "Fewer than 2 options on a multiple-choice question",
    ],
    action: "Retry; compare the normalized response with the canonical question contract below.",
  },
  QUESTION_DB_SAVE_FAILED: {
    causes: ["RLS blocked the insert", "Invalid column value", "Scan no longer exists"],
    action: "Check the scan owner and retry the save.",
  },
  QUESTION_GENERATION_FAILED: {
    causes: ["Image analysis missing", "Model returned invalid question set"],
    action: "Retry question generation; you can also skip questions and diagnose.",
  },
  FINAL_REASONING_FAILED: {
    causes: ["Fusion prompt too large", "Gateway error", "Schema mismatch"],
    action: "Retry the fusion stage; reduce knowledge chunks if it repeats.",
  },
  CONFIDENCE_FAILED: {
    causes: ["Non-numeric confidence from model"],
    action: "Retry the fusion stage.",
  },
  TREATMENT_FAILED: {
    causes: ["Treatment plan missing from the model output"],
    action: "Retry the fusion stage.",
  },
  DATABASE_SAVE_FAILED: {
    causes: ["RLS policy blocked the write", "Column type mismatch", "Scan row deleted"],
    action: "Retry the save stage and check RLS on crop_scans.",
  },
  CALENDAR_FAILED: {
    causes: ["calendar_tasks RLS", "Duplicate template hash", "Diagnosis not completed"],
    action: "Retry reminder creation after the diagnosis is saved.",
  },
  UNKNOWN_ERROR: {
    causes: ["Unclassified exception"],
    action: "Open the raw error and stack below.",
  },
};

export type StageLog = {
  stage: ScanStage;
  label: string;
  status: "ok" | "failed" | "skipped";
  ms: number;
  startedAt: number;
  endedAt: number;
  retries: number;
  note?: string;
  code?: ErrorCode;
  errorMessage?: string;
  httpStatus?: number | null;
};

export type VisionMeta = {
  model: string;
  imageCount: number;
  imageBytes: number;
  promptChars: number;
  responseMs: number;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  gatewayStatus: string | null;
  requestId: string | null;
};

export function emptyVision(model = ""): VisionMeta {
  return {
    model,
    imageCount: 0,
    imageBytes: 0,
    promptChars: 0,
    responseMs: 0,
    promptTokens: null,
    completionTokens: null,
    totalTokens: null,
    gatewayStatus: null,
    requestId: null,
  };
}

/** Raw request/response payloads — populated in development only. */
export type RawPayloads = {
  visionRequest?: string;
  visionResponse?: string;
  normalizedResponse?: string;
  questionResponse?: string;
  normalizedQuestions?: string;

  knowledgeChunks?: string;
  weatherResponse?: string;
  farmContext?: string;
  expectedSchema?: string;
  parserError?: string;
};

export type ScanDebug = {
  scanId: string | null;
  userId: string | null;
  currentStage: ScanStage | null;
  stages: StageLog[];
  totalMs: number;
  imagesCount: number;
  gatewayStatus: string | null;
  visionModel: string;
  farmId: string | null;
  weatherLoaded: boolean;
  knowledgeLoaded: boolean;
  vision: VisionMeta;
  raw: RawPayloads;
  perf: Record<string, number>;
  dev: boolean;
};

export type StageErrorPayload = {
  stage: ScanStage;
  code: ErrorCode;
  failure: string;
  message: string;
  status?: number | null;
  gatewayResponse?: string | null;
  modelResponse?: string | null;
  stack?: string | null;
  debug?: ScanDebug | null;
  dev: boolean;
};

const ERR_PREFIX = "CROPHEALTH_ERR::";

export function encodeStageError(payload: StageErrorPayload): string {
  return ERR_PREFIX + JSON.stringify(payload);
}

export function parseStageError(err: unknown): StageErrorPayload | null {
  const raw = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  const at = raw.indexOf(ERR_PREFIX);
  if (at === -1) return null;
  try {
    return JSON.parse(raw.slice(at + ERR_PREFIX.length)) as StageErrorPayload;
  } catch {
    return null;
  }
}

/** Human-facing message: code + exact stage always, raw error detail in development. */
export function stageErrorMessage(err: unknown): string {
  const p = parseStageError(err);
  if (!p) return err instanceof Error ? err.message : "Something went wrong. Please retry.";
  const detail = p.dev || import.meta.env.DEV ? ` — ${p.message}` : "";
  const status = p.status ? ` (HTTP ${p.status})` : "";
  return `[${p.code}] ${p.failure}${status}${detail}`;
}

export function emptyDebug(overrides: Partial<ScanDebug> = {}): ScanDebug {
  return {
    scanId: null,
    userId: null,
    currentStage: null,
    stages: [],
    totalMs: 0,
    imagesCount: 0,
    gatewayStatus: null,
    visionModel: "",
    farmId: null,
    weatherLoaded: false,
    knowledgeLoaded: false,
    vision: emptyVision(overrides.visionModel ?? ""),
    raw: {},
    perf: {},
    dev: false,
    ...overrides,
  };
}

/** Merges a fresh server debug payload into whatever the UI already collected. */
export function mergeDebug(
  prev: ScanDebug | null,
  next: ScanDebug | null | undefined,
): ScanDebug | null {
  if (!next) return prev;
  if (!prev) return next;
  return {
    ...prev,
    ...next,
    stages: [...prev.stages, ...next.stages],
    totalMs: prev.totalMs + next.totalMs,
    vision: next.vision?.model ? next.vision : prev.vision,
    raw: { ...prev.raw, ...next.raw },
    perf: { ...prev.perf, ...next.perf },
  };
}

/** Slowest stages first — used to highlight bottlenecks. */
export function bottlenecks(debug: ScanDebug | null, top = 3): StageLog[] {
  if (!debug) return [];
  return [...debug.stages].sort((a, b) => b.ms - a.ms).slice(0, top);
}

export function fmtMs(ms: number) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${ms} ms`;
}

export function fmtBytes(bytes: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Markdown report for "Copy Debug Report" / download. Never includes secrets. */
export function buildDebugReport(debug: ScanDebug | null, error: StageErrorPayload | null): string {
  const d = debug ?? error?.debug ?? null;
  const lines: string[] = ["# Crop Health Analysis Report", ""];
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Scan ID: ${d?.scanId ?? "—"}`);
  lines.push(`Farm ID: ${d?.farmId ?? "—"}`);
  lines.push(`User ID: ${d?.userId ?? "—"}`);
  lines.push(`Model: ${d?.vision.model || d?.visionModel || "—"}`);
  lines.push(`Total: ${fmtMs(d?.totalMs ?? 0)}`);
  lines.push("", "## Pipeline", "");
  for (const s of d?.stages ?? []) {
    const mark = s.status === "ok" ? "✓" : s.status === "skipped" ? "–" : "✗";
    lines.push(
      `${mark} ${s.label} (${fmtMs(s.ms)})${s.retries ? ` [retries: ${s.retries}]` : ""}${
        s.httpStatus ? ` HTTP ${s.httpStatus}` : ""
      }${s.note ? ` — ${s.note}` : ""}${s.code ? ` — ${s.code}` : ""}`,
    );
  }
  if (!d?.stages.length) lines.push("_no stages recorded_");

  if (d) {
    lines.push("", "## Vision", "");
    lines.push(`Model: ${d.vision.model || "—"}`);
    lines.push(
      `Images: ${d.vision.imageCount || d.imagesCount} (${fmtBytes(d.vision.imageBytes)})`,
    );
    lines.push(`Prompt chars: ${d.vision.promptChars}`);
    lines.push(`Response time: ${fmtMs(d.vision.responseMs)}`);
    lines.push(
      `Tokens: prompt ${d.vision.promptTokens ?? "unknown"} / completion ${d.vision.completionTokens ?? "unknown"} / total ${d.vision.totalTokens ?? "unknown"}`,
    );
    lines.push(`Gateway status: ${d.vision.gatewayStatus ?? d.gatewayStatus ?? "—"}`);
    lines.push(`Request ID: ${d.vision.requestId ?? "—"}`);
    lines.push("", "## Context", "");
    lines.push(`Weather loaded: ${d.weatherLoaded ? "yes" : "no"}`);
    lines.push(`Knowledge loaded: ${d.knowledgeLoaded ? "yes" : "no"}`);
    const perf = Object.entries(d.perf);
    if (perf.length) {
      lines.push("", "## Performance", "");
      for (const [k, v] of perf) lines.push(`${k}: ${fmtMs(v)}`);
      const slow = bottlenecks(d, 3);
      if (slow.length) {
        lines.push("", `Bottlenecks: ${slow.map((s) => `${s.label} (${fmtMs(s.ms)})`).join(", ")}`);
      }
    }
  }

  if (error) {
    const rec = RECOVERY[error.code] ?? RECOVERY.UNKNOWN_ERROR;
    lines.push("", "## Error", "");
    lines.push(`Code: ${error.code}`);
    lines.push(`Stage: ${STAGE_LABEL[error.stage] ?? error.stage}`);
    lines.push(`Failure: ${error.failure}`);
    if (error.status) lines.push(`HTTP: ${error.status}`);
    lines.push("", "```", error.message, "```");
    if (error.gatewayResponse)
      lines.push("", "Gateway response:", "```", error.gatewayResponse, "```");
    if (error.modelResponse) lines.push("", "Model response:", "```", error.modelResponse, "```");
    if (error.stack) lines.push("", "Stack:", "```", error.stack, "```");
    lines.push("", "Possible causes:", ...rec.causes.map((c) => `• ${c}`));
    lines.push("", `Suggested action: ${rec.action}`);
  }

  if (d?.dev && d.raw) {
    const entries = Object.entries(d.raw).filter(([, v]) => v);
    if (entries.length) {
      lines.push("", "## Raw (development)", "");
      for (const [k, v] of entries) lines.push("", `### ${k}`, "```", String(v), "```");
    }
  }

  return lines.join("\n");
}
