// Shared (client-safe) diagnostics for the Crop Health pipeline.
// Every pipeline step is a named stage: the server records timing + outcome for
// each one, and failures carry the exact stage, raw error and stack so the UI
// can show what actually broke instead of a generic message.

export type ScanStage =
  | "images_uploaded"
  | "signed_urls"
  | "farm_context"
  | "weather"
  | "knowledge"
  | "ai_request"
  | "ai_response"
  | "json_parse"
  | "questions"
  | "db_save";

export const STAGE_LABEL: Record<ScanStage, string> = {
  images_uploaded: "Images uploaded",
  signed_urls: "Signed URLs created",
  farm_context: "Farm context loaded",
  weather: "Weather loaded",
  knowledge: "Knowledge base retrieved",
  ai_request: "AI request sent",
  ai_response: "AI response received",
  json_parse: "JSON parsed",
  questions: "Questions generated",
  db_save: "Diagnosis saved",
};

export const STAGE_FAILURE: Record<ScanStage, string> = {
  images_uploaded: "Image upload failed",
  signed_urls: "Signed URL generation failed",
  farm_context: "Farm context lookup failed",
  weather: "Weather lookup failed",
  knowledge: "Knowledge base retrieval failed",
  ai_request: "AI Gateway request failed",
  ai_response: "AI Gateway returned an error",
  json_parse: "Model returned invalid JSON / JSON parsing failed",
  questions: "Question generation failed",
  db_save: "Database save failed",
};

export type StageLog = {
  stage: ScanStage;
  label: string;
  status: "ok" | "failed";
  ms: number;
  note?: string;
};

export type ScanDebug = {
  scanId: string | null;
  currentStage: ScanStage | null;
  stages: StageLog[];
  totalMs: number;
  imagesCount: number;
  gatewayStatus: string | null;
  visionModel: string;
  farmId: string | null;
  weatherLoaded: boolean;
  knowledgeLoaded: boolean;
  dev: boolean;
};

export type StageErrorPayload = {
  stage: ScanStage;
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

/** Human-facing message: exact stage always, raw error detail in development. */
export function stageErrorMessage(err: unknown): string {
  const p = parseStageError(err);
  if (!p) return err instanceof Error ? err.message : "Something went wrong. Please retry.";
  const detail = p.dev || import.meta.env.DEV ? ` — ${p.message}` : "";
  const status = p.status ? ` (HTTP ${p.status})` : "";
  return `${p.failure}${status}${detail}`;
}

export function emptyDebug(overrides: Partial<ScanDebug> = {}): ScanDebug {
  return {
    scanId: null,
    currentStage: null,
    stages: [],
    totalMs: 0,
    imagesCount: 0,
    gatewayStatus: null,
    visionModel: "",
    farmId: null,
    weatherLoaded: false,
    knowledgeLoaded: false,
    dev: false,
    ...overrides,
  };
}

/** Merges a fresh server debug payload into whatever the UI already collected. */
export function mergeDebug(prev: ScanDebug | null, next: ScanDebug | null | undefined): ScanDebug | null {
  if (!next) return prev;
  if (!prev) return next;
  return {
    ...prev,
    ...next,
    stages: [...prev.stages, ...next.stages],
    totalMs: prev.totalMs + next.totalMs,
  };
}
