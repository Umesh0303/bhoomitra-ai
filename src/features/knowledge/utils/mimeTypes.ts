export const SUPPORTED_FILE_TYPES = {
  "application/pdf": { label: "PDF", ext: "pdf" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    label: "DOCX",
    ext: "docx",
  },
  "text/plain": { label: "TXT", ext: "txt" },
  "text/markdown": { label: "Markdown", ext: "md" },
} as const;

export type SupportedMime = keyof typeof SUPPORTED_FILE_TYPES;

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export function isSupportedMime(mime: string): mime is SupportedMime {
  return mime in SUPPORTED_FILE_TYPES;
}

export function fileTypeLabel(mime: string): string {
  return (SUPPORTED_FILE_TYPES as Record<string, { label: string }>)[mime]?.label ?? mime;
}
