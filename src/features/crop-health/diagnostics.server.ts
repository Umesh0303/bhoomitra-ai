// Server-side stage tracker: records every Crop Health pipeline stage with
// start/end timestamps, duration, retry count, HTTP status, error code and raw
// gateway/model bodies, emits one structured JSON log line per stage, and turns
// a failure into an error carrying the exact failing stage.

import {
  RECOVERY,
  STAGE_CODE,
  STAGE_FAILURE,
  STAGE_LABEL,
  emptyDebug,
  encodeStageError,
  type ErrorCode,
  type ScanDebug,
  type ScanStage,
  type StageErrorPayload,
} from "./diagnostics";

export function isDevRuntime() {
  return process.env["NODE_ENV"] !== "production";
}

type ErrDetail = {
  message: string;
  status: number | null;
  gatewayResponse: string | null;
  modelResponse: string | null;
  stack: string | null;
};

const clip = (v: unknown, n = 4000) =>
  typeof v === "string" ? v.slice(0, n) : v == null ? null : JSON.stringify(v).slice(0, n);

export function describeError(err: unknown): ErrDetail {
  const e = err as Record<string, any> | null;
  const cause = e?.["cause"] as Record<string, any> | undefined;
  return {
    message:
      (err instanceof Error ? err.message : String(err)) +
      (cause?.["message"] ? ` | cause: ${cause["message"]}` : ""),
    status: (e?.["statusCode"] ?? e?.["status"] ?? cause?.["statusCode"] ?? null) as number | null,
    gatewayResponse: clip(e?.["responseBody"] ?? cause?.["responseBody"] ?? e?.["data"]),
    modelResponse: clip(e?.["text"] ?? cause?.["text"]),
    stack: err instanceof Error ? (err.stack ?? null) : null,
  };
}

/** Refines a stage's generic code using the actual error (e.g. timeouts). */
function codeFor(stage: ScanStage, err: unknown): ErrorCode {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if ((stage === "ai_request" || stage === "ai_response") && /timeout|timed out|aborted/.test(msg)) {
    return "VISION_TIMEOUT";
  }
  return STAGE_CODE[stage] ?? "UNKNOWN_ERROR";
}

export class StageTracker {
  readonly debug: ScanDebug;
  private readonly startedAt = Date.now();
  private readonly retries = new Map<ScanStage, number>();

  constructor(init: Partial<ScanDebug> = {}) {
    this.debug = emptyDebug({ dev: isDevRuntime(), ...init });
  }

  set<K extends keyof ScanDebug>(key: K, value: ScanDebug[K]) {
    this.debug[key] = value;
  }

  /** Records a raw payload; ignored entirely outside development. */
  raw(key: keyof ScanDebug["raw"], value: unknown) {
    if (!isDevRuntime()) return;
    const v = clip(value, 6000);
    if (v) this.debug.raw[key] = v;
  }

  perf(key: string, ms: number) {
    this.debug.perf[key] = ms;
  }

  markRetry(stage: ScanStage) {
    this.retries.set(stage, (this.retries.get(stage) ?? 0) + 1);
  }

  ok(stage: ScanStage, ms: number, note?: string) {
    const endedAt = Date.now();
    this.debug.stages.push({
      stage,
      label: STAGE_LABEL[stage],
      status: "ok",
      ms,
      startedAt: endedAt - ms,
      endedAt,
      retries: this.retries.get(stage) ?? 0,
      ...(note ? { note } : {}),
    });
    this.debug.totalMs = endedAt - this.startedAt;
    this.log("info", { stage, status: "ok", ms, note: note ?? null });
  }

  skipped(stage: ScanStage, note: string) {
    const now = Date.now();
    this.debug.stages.push({
      stage,
      label: STAGE_LABEL[stage],
      status: "skipped",
      ms: 0,
      startedAt: now,
      endedAt: now,
      retries: 0,
      note,
    });
    this.log("info", { stage, status: "skipped", ms: 0, note });
  }

  /** Records a failed stage (status, bodies, stack, code) and returns the error to throw. */
  recordFailure(stage: ScanStage, err: unknown, ms = 0): Error {
    const d = describeError(err);
    const code = codeFor(stage, err);
    const endedAt = Date.now();
    this.debug.currentStage = stage;
    this.debug.stages.push({
      stage,
      label: STAGE_LABEL[stage],
      status: "failed",
      ms,
      startedAt: endedAt - ms,
      endedAt,
      retries: this.retries.get(stage) ?? 0,
      note: d.message,
      code,
      errorMessage: d.message,
      httpStatus: d.status,
    });
    this.debug.totalMs = endedAt - this.startedAt;
    if (d.status) {
      this.debug.gatewayStatus = String(d.status);
      this.debug.vision.gatewayStatus = String(d.status);
    }
    this.log("error", {
      stage,
      status: "failed",
      code,
      ms,
      httpStatus: d.status,
      message: d.message,
      gatewayResponse: d.gatewayResponse,
      modelResponse: d.modelResponse,
      suggestedAction: RECOVERY[code]?.action ?? null,
    });
    if (d.stack) console.error(d.stack);
    if (isDevRuntime()) {
      this.raw("visionResponse", d.modelResponse ?? d.gatewayResponse ?? undefined);
    }
    return this.fail(stage, d, code);
  }

  /** Runs one stage; on failure logs everything and throws a structured error. */
  async run<T>(stage: ScanStage, fn: () => Promise<T>, note?: (v: T) => string): Promise<T> {
    this.debug.currentStage = stage;
    const t0 = Date.now();
    try {
      const value = await fn();
      this.ok(stage, Date.now() - t0, note?.(value));
      return value;
    } catch (err) {
      throw this.recordFailure(stage, err, Date.now() - t0);
    }
  }

  /** Non-fatal stage: records the failure and continues with a fallback. */
  async runSoft<T>(stage: ScanStage, fn: () => Promise<T>, fallback: T, note?: (v: T) => string) {
    this.debug.currentStage = stage;
    const t0 = Date.now();
    try {
      const value = await fn();
      this.ok(stage, Date.now() - t0, note?.(value));
      return value;
    } catch (err) {
      const d = describeError(err);
      this.debug.stages.push({
        stage,
        label: STAGE_LABEL[stage],
        status: "failed",
        ms: Date.now() - t0,
        startedAt: t0,
        endedAt: Date.now(),
        retries: this.retries.get(stage) ?? 0,
        note: `${d.message} (continued without it)`,
        code: STAGE_CODE[stage],
        errorMessage: d.message,
        httpStatus: d.status,
      });
      this.log("warn", { stage, status: "degraded", code: STAGE_CODE[stage], message: d.message });
      return fallback;
    }
  }

  fail(stage: ScanStage, d: ErrDetail, code: ErrorCode = STAGE_CODE[stage]): Error {
    const dev = isDevRuntime();
    const payload: StageErrorPayload = {
      stage,
      code: code ?? "UNKNOWN_ERROR",
      failure: STAGE_FAILURE[stage],
      message: d.message,
      status: d.status,
      gatewayResponse: dev ? d.gatewayResponse : null,
      modelResponse: dev ? d.modelResponse : null,
      stack: dev ? d.stack : null,
      debug: this.debug,
      dev,
    };
    return new Error(encodeStageError(payload));
  }

  /** One structured JSON line per stage — production logs stay clean. */
  private log(level: "info" | "warn" | "error", fields: Record<string, unknown>) {
    const line = JSON.stringify({
      source: "crop-health",
      scanId: this.debug.scanId,
      farmId: this.debug.farmId,
      userId: this.debug.userId,
      requestId: this.debug.vision.requestId,
      timestamp: new Date().toISOString(),
      ...fields,
    });
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  }
}

/** Classifies an AI SDK failure into the most precise stage available. */
export function aiStage(err: unknown): ScanStage {
  const e = err as Record<string, any> | null;
  const name = (e?.["name"] as string) ?? "";
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (name.includes("NoObjectGenerated") || name.includes("JSONParse") || /json|schema|parse/.test(msg)) {
    return "json_parse";
  }
  if (e?.["statusCode"] || e?.["status"] || /\b(4\d\d|5\d\d)\b|rate limit|credit/.test(msg)) {
    return "ai_response";
  }
  return "ai_request";
}
