import type { RetrievedChunk } from "../types";

/**
 * Lightweight heuristic reranker.
 *
 * Combines cosine similarity with BM25-ish term overlap and a small heading
 * match boost. Interface is deliberately narrow so a proper cross-encoder can
 * drop in later without touching the rest of the pipeline.
 */
type Candidate = Omit<RetrievedChunk, "rerank_score">;

const STOP = new Set([
  "the","a","an","and","or","of","in","on","for","to","with","is","are","was",
  "were","be","been","by","this","that","these","those","it","its","as","at",
  "from","how","what","why","when","which","who","whom","can","do","does","i",
  "my","we","our","you","your",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .split(/\s+/)
    .filter((t) => t && !STOP.has(t) && t.length > 1);
}

export function rerankCandidates(
  query: string,
  candidates: Candidate[],
): RetrievedChunk[] {
  const qTokens = new Set(tokenize(query));
  if (qTokens.size === 0) {
    return candidates.map((c) => ({ ...c, rerank_score: c.similarity }));
  }

  const scored = candidates.map((c) => {
    const cTokens = tokenize(c.chunk_text);
    let overlap = 0;
    for (const t of cTokens) if (qTokens.has(t)) overlap++;
    const termScore =
      cTokens.length === 0 ? 0 : overlap / Math.sqrt(cTokens.length + 1);

    const heading = (c.metadata as { heading?: string } | null)?.heading ?? "";
    const headingTokens = tokenize(heading);
    const headingHit = headingTokens.some((t) => qTokens.has(t)) ? 1 : 0;

    const score = 0.6 * c.similarity + 0.35 * termScore + 0.05 * headingHit;
    return { ...c, rerank_score: score };
  });

  scored.sort((a, b) => b.rerank_score - a.rerank_score);
  return scored;
}
