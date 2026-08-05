import { useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "../services/image-compress";
import { MAX_IMAGES, type PendingImage } from "../services/scan-client";
import { PLANT_PARTS, PLANT_PART_LABEL, type PlantPart } from "../types";

export function ImageUploader({
  images,
  onChange,
  uploading,
  progress,
}: {
  images: PendingImage[];
  onChange: (next: PendingImage[]) => void;
  uploading?: boolean;
  progress?: { done: number; total: number } | null;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFiles(list: FileList | null) {
    if (!list?.length) return;
    const room = MAX_IMAGES - images.length;
    if (room <= 0) {
      toast.error(`Maximum ${MAX_IMAGES} photos per scan`);
      return;
    }
    setBusy(true);
    try {
      const picked = Array.from(list).slice(0, room);
      const compressed = await Promise.all(picked.map((f) => compressImage(f)));
      onChange([
        ...images,
        ...compressed.map((c) => ({ ...c, plantPart: "leaf" as PlantPart, id: crypto.randomUUID() })),
      ]);
    } catch {
      toast.error("Could not read those photos. Try again.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
      if (cameraRef.current) cameraRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          disabled={busy || uploading}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60 sm:flex-none"
        >
          <Camera className="h-5 w-5" /> Take photo
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy || uploading}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold disabled:opacity-60 sm:flex-none"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
          Choose from gallery
        </button>
        <span className="self-center text-xs text-muted-foreground">
          {images.length}/{MAX_IMAGES} photos
        </span>
      </div>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />

      {images.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((img) => (
            <li key={img.id} className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="relative">
                <img src={img.previewUrl} alt="" className="h-32 w-full object-cover" />
                <button
                  type="button"
                  onClick={() => onChange(images.filter((i) => i.id !== img.id))}
                  disabled={uploading}
                  className="absolute right-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-full bg-background/90 text-foreground"
                  aria-label="Remove photo"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <select
                value={img.plantPart}
                disabled={uploading}
                onChange={(e) =>
                  onChange(
                    images.map((i) =>
                      i.id === img.id ? { ...i, plantPart: e.target.value as PlantPart } : i,
                    ),
                  )
                }
                className="h-10 w-full border-t border-border bg-transparent px-2 text-sm outline-none"
                aria-label="Plant part"
              >
                {PLANT_PARTS.map((p) => (
                  <option key={p} value={p}>
                    {PLANT_PART_LABEL[p]}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      )}

      {uploading && progress && (
        <div className="space-y-1">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${Math.round((progress.done / Math.max(1, progress.total)) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Uploading {progress.done} of {progress.total}…
          </p>
        </div>
      )}
    </div>
  );
}
