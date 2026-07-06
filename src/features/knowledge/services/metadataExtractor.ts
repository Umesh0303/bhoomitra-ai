import type { DocumentMetadata } from "../types";

/**
 * Auto-detect a rough language for a text sample. Very light heuristic —
 * enough to tag `metadata.language` when the user didn't provide one.
 */
export function detectLanguage(sample: string): string {
  const s = sample.slice(0, 2000);
  if (/[\u0900-\u097F]/.test(s)) return "hi"; // Devanagari (Hindi/Marathi)
  if (/[\u0C00-\u0C7F]/.test(s)) return "te"; // Telugu
  if (/[\u0B80-\u0BFF]/.test(s)) return "ta"; // Tamil
  if (/[\u0C80-\u0CFF]/.test(s)) return "kn"; // Kannada
  if (/[\u0A80-\u0AFF]/.test(s)) return "gu"; // Gujarati
  if (/[\u0980-\u09FF]/.test(s)) return "bn"; // Bengali
  return "en";
}

export function mergeMetadata(
  user: DocumentMetadata | undefined,
  extracted: Partial<DocumentMetadata>,
): DocumentMetadata {
  return { ...extracted, ...(user ?? {}) };
}
