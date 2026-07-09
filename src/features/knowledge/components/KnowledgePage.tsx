import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UploadDialog } from "./UploadDialog";
import { DocumentsTable } from "./DocumentsTable";
import { listDocuments } from "@/lib/knowledge.functions";
import type { KnowledgeDocument } from "../types";

export function KnowledgePage() {
  const [docs, setDocs] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [type, setType] = useState<string>("all");
  const list = useServerFn(listDocuments);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await list();
      setDocs(r as KnowledgeDocument[]);
    } finally {
      setLoading(false);
    }
  }, [list]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-refresh while any document is processing.
  useEffect(() => {
    const pending = docs.some(
      (d) => d.processing_status !== "completed" && d.processing_status !== "failed",
    );
    if (!pending) return;
    const t = setInterval(refresh, 3000);
    return () => clearInterval(t);
  }, [docs, refresh]);

  const filtered = useMemo(() => {
    return docs.filter((d) => {
      if (search && !d.filename.toLowerCase().includes(search.toLowerCase())) return false;
      if (status !== "all" && d.processing_status !== status) return false;
      if (type !== "all" && d.file_type !== type) return false;
      return true;
    });
  }, [docs, search, status, type]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Farm Knowledge</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload PDFs, DOCX, TXT, or Markdown files. Bhoomitra AI will use them to
            answer your questions with citations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button onClick={() => setUploadOpen(true)}>
            <Plus className="h-4 w-4" /> Upload document
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents…"
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="completed">Ready</SelectItem>
            <SelectItem value="embedding">Embedding</SelectItem>
            <SelectItem value="chunking">Chunking</SelectItem>
            <SelectItem value="extracting">Extracting</SelectItem>
            <SelectItem value="queued">Queued</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="File type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="application/pdf">PDF</SelectItem>
            <SelectItem value="application/vnd.openxmlformats-officedocument.wordprocessingml.document">
              DOCX
            </SelectItem>
            <SelectItem value="text/plain">TXT</SelectItem>
            <SelectItem value="text/markdown">Markdown</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DocumentsTable documents={filtered} onChanged={refresh} />

      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUploaded={refresh}
      />
    </div>
  );
}
