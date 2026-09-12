// AI Diagnostics Console for the Crop Health pipeline: collapsible cards for
// pipeline, timeline, gateway, vision response, context, database and errors,
// with recovery hints, bottleneck highlighting and a copyable Markdown report.
// Raw payloads only render in development; secrets are never included.

import { useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Copy,
  Download,
  Minus,
  RefreshCw,
  X,
} from "lucide-react";
import {
  RECOVERY,
  bottlenecks,
  buildDebugReport,
  fmtBytes,
  fmtMs,
  type ScanDebug,
  type StageErrorPayload,
  type StageLog,
} from "../diagnostics";

type Props = {
  debug: ScanDebug | null;
  error: StageErrorPayload | null;
  onRetryStage?: (() => void) | undefined;
  retryLabel?: string;
};

/** Diagnostics console. Errors always render; full console is dev-only. */
export function ScanDebugPanel({ debug, error, onRetryStage, retryLabel }: Props) {
  const dev = import.meta.env.DEV;
  const d = debug ?? error?.debug ?? null;
  const [copied, setCopied] = useState(false);

  const report = useMemo(() => buildDebugReport(d, error), [d, error]);
  const slow = useMemo(() => bottlenecks(d, 3).map((s) => s.stage), [d]);

  if (!d && !error) return null;

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function downloadReport() {
    const blob = new Blob([report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `crop-health-${d?.scanId ?? "scan"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const failed = error ?? null;

  return (
    <div className="mt-4 rounded-xl border border-border bg-muted/40 p-3 text-xs">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-2 font-semibold">
          <AlertTriangle className="h-3.5 w-3.5" /> AI Diagnostics Console
          {!dev && (
            <span className="text-muted-foreground">(production — raw payloads hidden)</span>
          )}
        </span>
        <span className="ml-auto flex gap-2">
          {onRetryStage && (
            <button
              onClick={onRetryStage}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2 py-1 font-medium hover:bg-muted"
            >
              <RefreshCw className="h-3 w-3" /> {retryLabel ?? "Retry failed stage"}
            </button>
          )}
          <button
            onClick={copyReport}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2 py-1 font-medium hover:bg-muted"
          >
            <Copy className="h-3 w-3" /> {copied ? "Copied" : "Copy debug report"}
          </button>
          <button
            onClick={downloadReport}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2 py-1 font-medium hover:bg-muted"
          >
            <Download className="h-3 w-3" /> Download
          </button>
        </span>
      </div>

      {failed && (
        <Card title="Errors" defaultOpen tone="error">
          <div className="space-y-2">
            <div className="font-semibold text-destructive">
              [{failed.code}] {failed.failure}
              {failed.status ? ` · HTTP ${failed.status}` : ""}
            </div>
            <Row label="Stage" value={failed.stage} />
            <Row label="Error" value={failed.message} />
            <div className="rounded-lg border border-border bg-background p-2">
              <div className="font-semibold">Possible causes</div>
              <ul className="mt-1 list-disc pl-4 text-muted-foreground">
                {(RECOVERY[failed.code] ?? RECOVERY.UNKNOWN_ERROR).causes.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <div className="mt-2">
                <span className="font-semibold">Suggested action: </span>
                <span className="text-muted-foreground">
                  {(RECOVERY[failed.code] ?? RECOVERY.UNKNOWN_ERROR).action}
                </span>
              </div>
            </div>
            {dev && failed.gatewayResponse && (
              <Pre label="Gateway response" value={failed.gatewayResponse} />
            )}
            {dev && failed.modelResponse && (
              <Pre label="Actual model response" value={failed.modelResponse} />
            )}
            {dev && d?.raw.expectedSchema && (
              <Pre label="Expected schema" value={d.raw.expectedSchema} />
            )}
            {dev && failed.stack && <Pre label="Stack trace" value={failed.stack} />}
          </div>
        </Card>
      )}

      {d && (
        <>
          <Card title="Pipeline" defaultOpen>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Metric label="Current stage" value={d.currentStage ?? "—"} />
              <Metric label="Total duration" value={fmtMs(d.totalMs)} />
              <Metric label="Images" value={String(d.imagesCount)} />
              <Metric label="Gateway status" value={d.gatewayStatus ?? "—"} />
              <Metric label="Scan ID" value={d.scanId ?? "—"} />
              <Metric label="Farm ID" value={d.farmId ?? "—"} />
              <Metric label="User ID" value={d.userId ?? "—"} />
              <Metric label="Model" value={d.vision.model || d.visionModel || "—"} />
            </div>
            {Object.keys(d.perf).length > 0 && (
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {Object.entries(d.perf).map(([k, v]) => (
                  <Metric key={k} label={k} value={fmtMs(v)} />
                ))}
              </div>
            )}
          </Card>

          <Card title={`Timeline (${d.stages.length} stages)`} defaultOpen>
            <ul className="space-y-1">
              {d.stages.map((s, i) => (
                <StageRow key={`${s.stage}-${i}`} s={s} slow={slow.includes(s.stage)} />
              ))}
              {d.stages.some((s) => s.status === "failed") && (
                <li className="pl-6 font-semibold text-destructive">↓ Stopped</li>
              )}
              {!d.stages.length && (
                <li className="text-muted-foreground">No stages recorded yet.</li>
              )}
            </ul>
          </Card>

          <Card title="Gateway & Vision request">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Metric label="Model" value={d.vision.model || "—"} />
              <Metric label="Image count" value={String(d.vision.imageCount || d.imagesCount)} />
              <Metric label="Image size" value={fmtBytes(d.vision.imageBytes)} />
              <Metric label="Prompt length" value={`${d.vision.promptChars} chars`} />
              <Metric label="Response time" value={fmtMs(d.vision.responseMs)} />
              <Metric
                label="Tokens (in/out)"
                value={`${d.vision.promptTokens ?? "unknown"} / ${d.vision.completionTokens ?? "unknown"}`}
              />
              <Metric label="Total tokens" value={String(d.vision.totalTokens ?? "unknown")} />
              <Metric label="Request ID" value={d.vision.requestId ?? "—"} />
            </div>
            {dev && d.raw.visionRequest && (
              <Pre label="Raw vision request" value={d.raw.visionRequest} />
            )}
          </Card>

          {dev && d.raw.visionResponse && (
            <Card title="Vision response (dev)">
              <Pre label="Model output (original)" value={d.raw.visionResponse} />
              {d.raw.normalizedResponse && (
                <Pre label="Normalized response" value={d.raw.normalizedResponse} />
              )}

              {d.raw.expectedSchema && <Pre label="Expected schema" value={d.raw.expectedSchema} />}
              {d.raw.parserError && <Pre label="Parser error" value={d.raw.parserError} />}
            </Card>
          )}

          <Card title="Questions">
            <ul className="space-y-1">
              {d.stages
                .filter((s) => s.stage.startsWith("question"))
                .map((s, i) => (
                  <StageRow key={`q-${i}`} s={s} slow={false} />
                ))}
              {!d.stages.some((s) => s.stage.startsWith("question")) && (
                <li className="text-muted-foreground">No question stages recorded.</li>
              )}
            </ul>
            {dev && d.raw.questionResponse && (
              <Pre label="Question AI response (raw)" value={d.raw.questionResponse} />
            )}
            {dev && d.raw.normalizedQuestions && (
              <Pre label="Normalized questions" value={d.raw.normalizedQuestions} />
            )}
          </Card>

          <Card title="Weather">
            <Row label="Loaded" value={d.weatherLoaded ? "yes" : "no"} />
            {dev && d.raw.weatherResponse && (
              <Pre label="Weather snapshot" value={d.raw.weatherResponse} />
            )}
          </Card>

          <Card title="Knowledge">
            <Row label="Loaded" value={d.knowledgeLoaded ? "yes" : "no"} />
            {dev && d.raw.knowledgeChunks && (
              <Pre label="Retrieved chunks" value={d.raw.knowledgeChunks} />
            )}
          </Card>

          <Card title="Farm context">
            <Row label="Farm ID" value={d.farmId ?? "—"} />
            {dev && d.raw.farmContext && <Pre label="Farm snapshot" value={d.raw.farmContext} />}
          </Card>

          <Card title="Database">
            <ul className="space-y-1">
              {d.stages
                .filter((s) => s.stage === "db_save" || s.stage === "calendar_reminder")
                .map((s, i) => (
                  <StageRow key={`db-${i}`} s={s} slow={false} />
                ))}
              {!d.stages.some((s) => s.stage === "db_save") && (
                <li className="text-muted-foreground">No database writes recorded.</li>
              )}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}

function StageRow({ s, slow }: { s: StageLog; slow: boolean }) {
  return (
    <li className="flex items-start gap-2 rounded bg-background p-2">
      {s.status === "ok" ? (
        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
      ) : s.status === "skipped" ? (
        <Minus className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      ) : (
        <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
      )}
      <span className="flex-1">
        {s.label}
        {s.code ? <span className="ml-1 font-mono text-destructive">[{s.code}]</span> : null}
        {s.httpStatus ? <span className="ml-1 text-destructive">HTTP {s.httpStatus}</span> : null}
        {s.retries ? (
          <span className="ml-1 text-muted-foreground">retries: {s.retries}</span>
        ) : null}
        {s.note ? <span className="text-muted-foreground"> — {s.note}</span> : null}
      </span>
      <span className={slow ? "font-semibold text-amber-600" : "text-muted-foreground"}>
        {fmtMs(s.ms)}
        {slow ? " ⚑" : ""}
      </span>
    </li>
  );
}

function Card({
  title,
  children,
  defaultOpen = false,
  tone,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  tone?: "error";
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      className={[
        "mb-2 rounded-lg border",
        tone === "error"
          ? "border-destructive/40 bg-destructive/5"
          : "border-border bg-background/60",
      ].join(" ")}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left font-semibold"
      >
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "" : "-rotate-90"}`} />
        {title}
      </button>
      {open && <div className="space-y-2 px-3 pb-3">{children}</div>}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-background p-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="truncate font-semibold" title={value}>
        {value}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-mono">{value}</span>
    </div>
  );
}

function Pre({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted-foreground">{label}</div>
      <pre className="max-h-56 overflow-auto rounded bg-background p-2 font-mono text-[10px] leading-relaxed whitespace-pre-wrap">
        {value}
      </pre>
    </div>
  );
}
