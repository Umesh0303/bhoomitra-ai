import { AlertTriangle, Check, X } from "lucide-react";
import type { ScanDebug, StageErrorPayload } from "../diagnostics";

type Props = {
  debug: ScanDebug | null;
  error: StageErrorPayload | null;
};

/** Development-only diagnostics for the crop scan pipeline. */
export function ScanDebugPanel({ debug, error }: Props) {
  if (!import.meta.env.DEV) return null;
  if (!debug && !error) return null;
  const d = debug ?? error?.debug ?? null;

  return (
    <div className="mt-4 rounded-xl border border-border bg-muted/40 p-3 text-xs">
      <div className="mb-2 flex items-center gap-2 font-semibold">
        <AlertTriangle className="h-3.5 w-3.5" /> Crop Health debug (dev only)
      </div>

      {error && (
        <div className="mb-3 space-y-1 rounded-lg border border-destructive/40 bg-destructive/5 p-2">
          <div className="font-semibold text-destructive">
            {error.failure}
            {error.status ? ` · HTTP ${error.status}` : ""}
          </div>
          <Row label="Stage" value={error.stage} />
          <Row label="Error" value={error.message} />
          {error.gatewayResponse && <Pre label="Gateway response" value={error.gatewayResponse} />}
          {error.modelResponse && <Pre label="Model response" value={error.modelResponse} />}
          {error.stack && <Pre label="Stack trace" value={error.stack} />}
        </div>
      )}

      {d && (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric label="Current stage" value={d.currentStage ?? "—"} />
            <Metric label="Duration" value={`${d.totalMs}ms`} />
            <Metric label="Images" value={String(d.imagesCount)} />
            <Metric label="Gateway status" value={d.gatewayStatus ?? "—"} />
            <Metric label="Vision model" value={d.visionModel || "—"} />
            <Metric label="Farm ID" value={d.farmId ?? "—"} />
            <Metric label="Weather loaded" value={d.weatherLoaded ? "yes" : "no"} />
            <Metric label="Knowledge loaded" value={d.knowledgeLoaded ? "yes" : "no"} />
          </div>

          {d.stages.length > 0 && (
            <ul className="mt-3 space-y-1">
              {d.stages.map((s, i) => (
                <li key={`${s.stage}-${i}`} className="flex items-start gap-2 rounded bg-background p-2">
                  {s.status === "ok" ? (
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  ) : (
                    <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                  )}
                  <span className="flex-1">
                    {s.label}
                    {s.note ? <span className="text-muted-foreground"> — {s.note}</span> : null}
                  </span>
                  <span className="text-muted-foreground">{s.ms}ms</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
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
      <pre className="max-h-40 overflow-auto rounded bg-background p-2 font-mono text-[10px] leading-relaxed whitespace-pre-wrap">
        {value}
      </pre>
    </div>
  );
}
