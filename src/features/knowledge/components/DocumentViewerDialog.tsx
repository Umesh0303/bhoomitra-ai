import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getDocument } from "@/lib/knowledge.functions";
import type { KnowledgeDocument } from "../types";

type ChunkPreview = {
  id: string;
  chunk_number: number;
  page_number: number | null;
  chunk_text: string;
  token_count: number;
  char_count: number;
  metadata: Record<string, unknown>;
};

type Props = {
  documentId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function DocumentViewerDialog({ documentId, open, onOpenChange }: Props) {
  const [doc, setDoc] = useState<KnowledgeDocument | null>(null);
  const [chunks, setChunks] = useState<ChunkPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const load = useServerFn(getDocument);

  useEffect(() => {
    if (!open || !documentId) return;
    setLoading(true);
    load({ data: { id: documentId } })
      .then((r) => {
        setDoc(r.document as KnowledgeDocument);
        setChunks(r.chunks as ChunkPreview[]);
      })
      .finally(() => setLoading(false));
  }, [open, documentId, load]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="truncate">{doc?.filename ?? "Document"}</DialogTitle>
        </DialogHeader>
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {doc && (
          <div className="mb-3 grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs sm:grid-cols-4">
            <Stat label="Chunks" value={doc.total_chunks} />
            <Stat label="Characters" value={doc.total_characters.toLocaleString()} />
            <Stat label="Tokens" value={doc.total_tokens.toLocaleString()} />
            <Stat label="Version" value={doc.version} />
          </div>
        )}
        <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-2">
          {chunks.map((c) => (
            <div key={c.id} className="rounded-lg border border-border p-3">
              <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span>#{c.chunk_number}</span>
                {c.page_number != null && <span>· p. {c.page_number}</span>}
                <span>· {c.char_count} chars</span>
                <span>· ~{c.token_count} tokens</span>
              </div>
              <p className="whitespace-pre-wrap text-sm">{c.chunk_text}</p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <div className="text-muted-foreground">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
