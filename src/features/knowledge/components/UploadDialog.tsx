import { useState, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Upload, FileText, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  isSupportedMime,
  MAX_FILE_SIZE_BYTES,
  SUPPORTED_FILE_TYPES,
} from "../utils/mimeTypes";
import { processDocument } from "@/lib/knowledge.functions";
import type { DocumentMetadata } from "../types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded: () => void;
};

const emptyMeta: DocumentMetadata = {};

function inferMime(file: File): string {
  if (file.type && isSupportedMime(file.type)) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".docx"))
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (name.endsWith(".md")) return "text/markdown";
  if (name.endsWith(".txt")) return "text/plain";
  return file.type || "application/octet-stream";
}

export function UploadDialog({ open, onOpenChange, onUploaded }: Props) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [meta, setMeta] = useState<DocumentMetadata>(emptyMeta);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"idle" | "uploading" | "processing">("idle");
  const inputRef = useRef<HTMLInputElement>(null);
  const process = useServerFn(processDocument);

  const busy = phase !== "idle";

  function selectFile(f: File | null) {
    if (!f) return;
    const mime = inferMime(f);
    if (!isSupportedMime(mime)) {
      toast.error("Unsupported file type. Use PDF, DOCX, TXT, or Markdown.");
      return;
    }
    if (f.size > MAX_FILE_SIZE_BYTES) {
      toast.error("File exceeds 50 MB limit.");
      return;
    }
    setFile(f);
  }

  function reset() {
    setFile(null);
    setMeta(emptyMeta);
    setProgress(0);
    setPhase("idle");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleSubmit() {
    if (!file || !user) return;
    const mime = inferMime(file);
    try {
      setPhase("uploading");
      setProgress(10);
      const storagePath = `${user.id}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
      const { error: upErr } = await supabase.storage
        .from("knowledge-docs")
        .upload(storagePath, file, { contentType: mime, upsert: false });
      if (upErr) throw upErr;
      setProgress(60);
      setPhase("processing");
      await process({
        data: {
          storage_path: storagePath,
          filename: file.name,
          file_type: mime,
          file_size: file.size,
          metadata: meta,
        },
      });
      setProgress(100);
      toast.success("Document processed and indexed");
      onUploaded();
      reset();
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error(msg);
      setPhase("idle");
      setProgress(0);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (busy) return;
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload knowledge document</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!file ? (
            <label
              className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-8 text-center text-sm text-muted-foreground hover:bg-muted/40"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                selectFile(e.dataTransfer.files?.[0] ?? null);
              }}
            >
              <Upload className="h-6 w-6" />
              <div>Drag & drop a file here, or click to browse</div>
              <div className="text-xs">PDF, DOCX, TXT, Markdown · up to 50 MB</div>
              <input
                ref={inputRef}
                type="file"
                accept={Object.keys(SUPPORTED_FILE_TYPES).join(",") + ",.pdf,.docx,.txt,.md"}
                className="hidden"
                onChange={(e) => selectFile(e.target.files?.[0] ?? null)}
              />
            </label>
          ) : (
            <div className="flex items-center gap-3 rounded-lg border border-border p-3">
              <FileText className="h-5 w-5 text-primary" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{file.name}</div>
                <div className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </div>
              </div>
              {!busy && (
                <button
                  onClick={() => setFile(null)}
                  className="rounded p-1 hover:bg-muted"
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <MetaField label="Category" value={meta.category} onChange={(v) => setMeta({ ...meta, category: v })} placeholder="Crop guide" />
            <MetaField label="Crop" value={meta.crop} onChange={(v) => setMeta({ ...meta, crop: v })} placeholder="Wheat" />
            <MetaField label="State" value={meta.state} onChange={(v) => setMeta({ ...meta, state: v })} placeholder="Punjab" />
            <MetaField label="District" value={meta.district} onChange={(v) => setMeta({ ...meta, district: v })} placeholder="Amritsar" />
            <MetaField label="Source" value={meta.source} onChange={(v) => setMeta({ ...meta, source: v })} placeholder="ICAR" />
            <MetaField label="Language" value={meta.language} onChange={(v) => setMeta({ ...meta, language: v })} placeholder="en / hi / ta" />
          </div>

          {busy && (
            <div className="space-y-1">
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground">
                {phase === "uploading" ? "Uploading…" : "Extracting, chunking and embedding…"}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!file || busy}>
            {busy ? "Processing…" : "Upload & process"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MetaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
