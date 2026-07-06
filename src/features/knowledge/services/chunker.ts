import { estimateTokens } from "../utils/tokenCount";

export type SourceBlock = {
  text: string;
  page?: number;
  heading?: string;
};

export type Chunk = {
  chunk_number: number;
  text: string;
  char_count: number;
  token_count: number;
  page_number: number | null;
  heading: string | null;
};

const TARGET_MIN = 700;
const TARGET_MAX = 1000;
const OVERLAP = 150;

/**
 * Semantic-boundary-aware chunker.
 *
 * Priority for splitting: heading → paragraph → sentence.
 * Never splits inside a markdown table row or bullet list item — those blocks
 * either fit as a single chunk or are appended atomically to the current one.
 * Preserves markdown structure (headings, `-`/`*` bullets, `|` tables).
 */
export function chunkBlocks(blocks: SourceBlock[]): Chunk[] {
  const chunks: Chunk[] = [];
  let buffer = "";
  let bufferPage: number | null = null;
  let bufferHeading: string | null = null;

  const flush = () => {
    const text = buffer.trim();
    if (!text) return;
    chunks.push({
      chunk_number: chunks.length,
      text,
      char_count: text.length,
      token_count: estimateTokens(text),
      page_number: bufferPage,
      heading: bufferHeading,
    });
    // Retain overlap from the tail of the just-emitted chunk.
    const tail = text.slice(Math.max(0, text.length - OVERLAP));
    buffer = tail;
  };

  const append = (piece: string, page?: number, heading?: string) => {
    if (bufferPage == null && page != null) bufferPage = page;
    if (bufferHeading == null && heading) bufferHeading = heading;
    buffer = buffer ? `${buffer}\n${piece}` : piece;
    if (buffer.length >= TARGET_MAX) {
      flush();
      bufferPage = page ?? null;
      bufferHeading = heading ?? null;
    }
  };

  for (const block of blocks) {
    const heading = block.heading;
    const page = block.page;
    // Split on paragraph boundaries.
    const paragraphs = block.text.split(/\n{2,}/);

    for (const rawPara of paragraphs) {
      const para = rawPara.trim();
      if (!para) continue;

      // Atomic block: table row / bullet list — never split inside these.
      const isAtomic = /^(\s*[-*+]\s|\s*\d+\.\s|\|)/.test(para);
      if (isAtomic || para.length <= TARGET_MAX) {
        append(para, page, heading);
        continue;
      }

      // Split long paragraph by sentence.
      const sentences = para.split(/(?<=[.!?।])\s+/);
      for (const sentence of sentences) {
        if (!sentence.trim()) continue;
        if (sentence.length > TARGET_MAX) {
          // Fall back to hard char split for pathological single sentences.
          for (let i = 0; i < sentence.length; i += TARGET_MAX) {
            append(sentence.slice(i, i + TARGET_MAX), page, heading);
          }
        } else {
          append(sentence, page, heading);
        }
      }
    }
    // Prefer a boundary between blocks if buffer is already comfortable.
    if (buffer.length >= TARGET_MIN) flush();
  }

  if (buffer.trim().length > 0) flush();

  // Re-number after any overlap trims.
  return chunks.map((c, i) => ({ ...c, chunk_number: i }));
}
