import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { RefreshCw, Trash2, Eye } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DocumentStatusBadge } from "./DocumentStatusBadge";
import { DocumentViewerDialog } from "./DocumentViewerDialog";
import { fileTypeLabel } from "../utils/mimeTypes";
import { deleteDocument, reprocessDocument } from "@/lib/knowledge.functions";
import type { KnowledgeDocument } from "../types";

type Props = {
  documents: KnowledgeDocument[];
  onChanged: () => void;
};

export function DocumentsTable({ documents, onChanged }: Props) {
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const delFn = useServerFn(deleteDocument);
  const reFn = useServerFn(reprocessDocument);

  async function onDelete(id: string) {
    if (!confirm("Delete this document and all its chunks?")) return;
    setBusyId(id);
    try {
      await delFn({ data: { id } });
      toast.success("Document deleted");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  }

  async function onReprocess(id: string) {
    setBusyId(id);
    try {
      await reFn({ data: { id } });
      toast.success("Reprocessed");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reprocess failed");
    } finally {
      setBusyId(null);
    }
  }

  if (documents.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        No documents yet. Upload a PDF, DOCX, TXT, or Markdown file to build your knowledge base.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Chunks</TableHead>
              <TableHead className="text-right">Characters</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="max-w-[220px] truncate font-medium">{d.filename}</TableCell>
                <TableCell>{fileTypeLabel(d.file_type)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(d.upload_date).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <DocumentStatusBadge status={d.processing_status} />
                  {d.error_message && (
                    <p className="mt-1 max-w-[240px] truncate text-xs text-destructive" title={d.error_message}>
                      {d.error_message}
                    </p>
                  )}
                </TableCell>
                <TableCell className="text-right">{d.total_chunks}</TableCell>
                <TableCell className="text-right">{d.total_characters.toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setViewingId(d.id)} aria-label="View">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busyId === d.id}
                      onClick={() => onReprocess(d.id)}
                      aria-label="Reprocess"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busyId === d.id}
                      onClick={() => onDelete(d.id)}
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <DocumentViewerDialog
        documentId={viewingId}
        open={viewingId != null}
        onOpenChange={(v) => !v && setViewingId(null)}
      />
    </>
  );
}
