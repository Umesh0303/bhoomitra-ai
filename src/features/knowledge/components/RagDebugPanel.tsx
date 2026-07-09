import { useState } from "react";
import { ChevronDown, ChevronUp, Bug } from "lucide-react";
import type { RagDebugData } from "../types";

type Props = {
  data: RagDebugData | null;
};

export function RagDebugPanel({ data }: Props) {
  const [open, setOpen] = useState(false);
  if (!import.meta.env.DEV || !data) return null;

  return (
    <div className="mt-2 rounded-lg border border-border bg-muted/40 text-xs">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 font-medium"
      >
        <span className="inline-flex items-center gap-2">
          <Bug className="h-3.5 w-3.5" />
          RAG debug · {data.chunks.length} chunks · {data.debug.timings.total_ms}ms
          {data.debug.cache_hit && <span className="text-primary">· cache hit</span>}
        </span>
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {open && (
        <div className="space-y-3 border-t border-border p-3">
          <div className="grid grid-cols-4 gap-2">
            <Metric label="Embed" value={`${data.debug.timings.embed_ms}ms`} />
            <Metric label="Search" value={`${data.debug.timings.search_ms}ms`} />
            <Metric label="Rerank" value={`${data.debug.timings.rerank_ms}ms`} />
            <Metric label="Total" value={`${data.debug.timings.total_ms}ms`} />
          </div>

          <div>
            <div className="mb-1 font-semibold">Query</div>
            <p className="rounded bg-background p-2 font-mono">{data.query}</p>
          </div>

          <div>
            <div className="mb-1 font-semibold">
              Retrieved chunks ({data.chunks.length})
            </div>
            <div className="space-y-1">
              {data.chunks.map((c) => (
                <div key={c.id} className="rounded border border-border bg-background p-2">
                  <div className="flex items-center justify-between gap-2 text-muted-foreground">
                    <span className="truncate">
                      {c.filename}
                      {c.page_number != null ? ` · p.${c.page_number}` : ""} · #{c.chunk_number}
                    </span>
                    <span>
                      sim {c.similarity.toFixed(3)} · rr {c.rerank_score.toFixed(3)}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-3 whitespace-pre-wrap">{c.chunk_text}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1 font-semibold">System prompt preview</div>
            <pre className="max-h-40 overflow-auto rounded bg-background p-2 font-mono text-[10px] leading-relaxed">
              {data.system_prompt_preview}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-background p-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
