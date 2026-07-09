import type { Tables, Json } from "@/integrations/supabase/types";

export type KnowledgeDocument = Tables<"knowledge_documents">;
export type KnowledgeChunk = Tables<"knowledge_chunks">;

export type DocumentMetadata = {
  crop?: string;
  state?: string;
  district?: string;
  language?: string;
  source?: string;
  category?: string;
  notes?: string;
  namespace?: string;
};

export type RetrievedChunk = {
  id: string;
  document_id: string;
  chunk_number: number;
  page_number: number | null;
  chunk_text: string;
  similarity: number;
  rerank_score: number;
  filename: string;
  metadata: Json;
  document_metadata: Json;
};

export type RetrievalDebug = {
  cache_hit: boolean;
  candidate_count: number;
  chunks_returned: number;
  timings: {
    embed_ms: number;
    search_ms: number;
    rerank_ms: number;
    total_ms: number;
  };
  candidates: Array<{
    chunk_id: string;
    filename: string;
    chunk_number: number;
    similarity: number;
    rerank_score: number;
  }>;
};

export type RagDebugData = {
  query: string;
  chunks: RetrievedChunk[];
  debug: RetrievalDebug;
  tokens: {
    retrieved_estimate: number;
    prompt_estimate: number;
  };
  context_length: number;
  system_prompt_preview: string;
};
