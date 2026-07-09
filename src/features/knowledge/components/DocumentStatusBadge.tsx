import { Badge } from "@/components/ui/badge";
import type { KnowledgeDocument } from "../types";

const LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  uploading: { label: "Uploading", variant: "secondary" },
  queued: { label: "Queued", variant: "secondary" },
  virus_check: { label: "Scanning", variant: "secondary" },
  extracting: { label: "Extracting", variant: "secondary" },
  normalizing: { label: "Normalizing", variant: "secondary" },
  extracting_metadata: { label: "Metadata", variant: "secondary" },
  chunking: { label: "Chunking", variant: "secondary" },
  deduplicating: { label: "Dedup", variant: "secondary" },
  embedding: { label: "Embedding", variant: "secondary" },
  indexing: { label: "Indexing", variant: "secondary" },
  verifying: { label: "Verifying", variant: "secondary" },
  completed: { label: "Ready", variant: "default" },
  failed: { label: "Failed", variant: "destructive" },
};

export function DocumentStatusBadge({ status }: { status: KnowledgeDocument["processing_status"] }) {
  const info = LABELS[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={info.variant}>{info.label}</Badge>;
}
