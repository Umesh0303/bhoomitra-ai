// Server-side stage tracker: logs every Crop Health pipeline stage with timing,
// HTTP status, gateway/model response bodies and stack traces, and converts a
// failure into a structured error carrying the exact failing stage.

import {
  STAGE_FAILURE,
  STAGE_LABEL,
  emptyDebug,
  encodeStageError,
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

const clip = (v: unknown, n = 2000) =>
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

export class StageTracker {
  readonly debug: ScanDebug;
  private readonly startedAt = Date.now();

  constructor(init: Partial<ScanDebug> = {}) {
    this.debug = emptyDebug({ dev: isDevRuntime(), ...init });
  }

  set<K extends keyof ScanDebug>(key: K, value: ScanDebug[K]) {
    this.debug[key] = value;
  }

  ok(stage: ScanStage, ms: number, note?: string) {
    this.debug.stages.push({ stage, label: STAGE_LABEL[stage], status: "ok", ms, ...(note ? { note } : {}) });
    this.debug.totalMs = Date.now() - this.startedAt;
    console.log(`[crop-health] ✓ ${STAGE_LABEL[stage]} (${ms}ms)${note ? ` — ${note}` : ""}`);
  }

  /** Records a failed stage (logs status, bodies, stack) and returns the error to throw. */
  recordFailure(stage: ScanStage, err: unknown, ms = 0): Error {
    const d = describeError(err);
    this.debug.currentStage = stage;
    this.debug.stages.push({
      stage,
      label: STAGE_LABEL[stage],
      status: "failed",
      ms,
      note: d.message,
    });
    this.debug.totalMs = Date.now() - this.startedAt;
    if (d.status) this.debug.gatewayStatus = String(d.status);
    console.error(
      `[crop-health] ✗ ${STAGE_FAILURE[stage]} (${ms}ms)`,
      JSON.stringify(
        {
          scanId: this.debug.scanId,
          stage,
          httpStatus: d.status,
          message: d.message,
          gatewayResponse: d.gatewayResponse,
          modelResponse: d.modelResponse,
        },
        null,
        2,
      ),
      "\n",
      d.stack,
    );
    return this.fail(stage, d);
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

  fail(stage: ScanStage, d: ErrDetail): Error {
    const dev = isDevRuntime();
    const payload: StageErrorPayload = {
      stage,
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
