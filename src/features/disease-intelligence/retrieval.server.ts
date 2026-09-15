// Similar-case retrieval from the trusted knowledge layer. Best-effort: a
// failure here must never stop a diagnosis.

import type { SimilarCase } from "./types";

type Ctx = { supabase: any; userId: string };

export async function retrieveSimilarCases(
  ctx: Ctx,
  query: string,
  crop: string | null,
  apiKey: string,
  limit = 5,
): Promise<SimilarCase[]> {
  try {
    if (!query.trim()) return [];
    const { embedQuery } = await import("@/features/knowledge/services/embeddingService.server");
    const emb = await embedQuery(query, apiKey);
    const { data, error } = await ctx.supabase.rpc("match_disease_knowledge", {
      query_embedding: emb as unknown as string,
      match_count: limit,
      crop_filter: crop && crop.trim() ? crop.trim() : null,
    });
    if (error) throw new Error(error.message);
    return ((data ?? []) as Array<Record<string, any>>).map((r) => ({
      id: r["id"],
      cropName: r["crop_name"],
      diseaseName: r["disease_name"],
      symptoms: r["symptoms"] ?? [],
      affectedParts: r["affected_parts"] ?? [],
      cropStage: r["crop_stage"] ?? null,
      knowledgeText: r["knowledge_text"] ?? "",
      treatmentSuccessRate: r["treatment_success_rate"] ?? null,
      confidenceScore: Number(r["confidence_score"] ?? 0),
      validationStatus: r["validation_status"],
      sourceCaseCount: r["source_case_count"] ?? 1,
      similarity: Number(r["similarity"] ?? 0),
    }));
  } catch (err) {
    console.error("[disease-intelligence] similar-case retrieval failed", err);
    return [];
  }
}

/** Compact, clearly-labelled supporting context for the fusion prompt. */
export function formatSimilarCases(cases: SimilarCase[]): string {
  if (!cases.length) return "";
  return cases
    .map((c, i) => {
      const rate =
        c.treatmentSuccessRate == null ? "unknown" : `${Math.round(c.treatmentSuccessRate)}%`;
      return `[H${i + 1}] ${c.cropName} · ${c.diseaseName} (${c.validationStatus}, ${c.sourceCaseCount} case(s), treatment success ${rate})\n${c.knowledgeText}`;
    })
    .join("\n\n");
}
