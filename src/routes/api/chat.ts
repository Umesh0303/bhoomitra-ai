import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { BHOOMITRA_CHAT_MODEL, buildSystemPrompt, type FarmContext } from "@/lib/ai-config";
import { buildContext, buildRagSystemPrompt } from "@/features/knowledge/services/contextBuilder";
import { rerankCandidates } from "@/features/knowledge/services/reranker";
import { embedQuery } from "@/features/knowledge/services/embeddingService.server";
import { sha256Hex, normalizeQueryForHash } from "@/features/knowledge/utils/hash";
import { createClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import type { RetrievedChunk, RagDebugData } from "@/features/knowledge/types";

type ChatRequestBody = {
  messages?: unknown;
  context?: FarmContext;
};

function lastUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "user") continue;
    return m.parts.map((p) => (p.type === "text" ? p.text : "")).join(" ").trim();
  }
  return "";
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: ChatRequestBody;
        try {
          body = (await request.json()) as ChatRequestBody;
        } catch {
          return new Response("Invalid JSON body", { status: 400 });
        }

        const { messages, context } = body;
        if (!Array.isArray(messages) || messages.length === 0) {
          return new Response("Messages are required", { status: 400 });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("AI service is not configured", { status: 500 });

        // -------- RAG retrieval (best effort) --------
        const uiMessages = messages as UIMessage[];
        const query = lastUserText(uiMessages);
        let ragChunks: RetrievedChunk[] = [];
        let ragDebug: RagDebugData | null = null;
        let systemPrompt = buildSystemPrompt(context);

        const auth = request.headers.get("authorization") ?? request.headers.get("Authorization");
        const token = auth?.toLowerCase().startsWith("bearer ") ? auth.slice(7) : null;

        if (query && token) {
          try {
            const supaUrl = process.env.SUPABASE_URL;
            const supaKey = process.env.SUPABASE_PUBLISHABLE_KEY;
            if (supaUrl && supaKey) {
              const supabase = createClient<Database>(supaUrl, supaKey, {
                auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
                global: { headers: { Authorization: `Bearer ${token}` } },
              });

              const { data: userData } = await supabase.auth.getUser(token);
              const userId = userData?.user?.id;

              if (userId) {
                const t0 = Date.now();
                const query_hash = await sha256Hex(normalizeQueryForHash(query, {}));
                const { data: cache } = await supabase
                  .from("retrieval_cache")
                  .select("id, hit_count")
                  .eq("user_id", userId)
                  .eq("query_hash", query_hash)
                  .maybeSingle();

                const tEmbed0 = Date.now();
                const qEmb = await embedQuery(query, key);
                const embed_ms = Date.now() - tEmbed0;

                const tSearch0 = Date.now();
                const { data: matches } = await supabase.rpc("match_knowledge_chunks", {
                  query_embedding: JSON.stringify(qEmb) as unknown as string,
                  user_uuid: userId,
                  match_count: 15,
                  metadata_filter: {} as unknown as Json,
                });
                const search_ms = Date.now() - tSearch0;

                const candidates = (matches ?? []).map((m) => ({
                  id: m.id as string,
                  document_id: m.document_id as string,
                  chunk_number: m.chunk_number as number,
                  page_number: (m.page_number ?? null) as number | null,
                  chunk_text: m.chunk_text as string,
                  similarity: m.similarity as number,
                  rerank_score: m.similarity as number,
                  filename: m.filename as string,
                  metadata: (m.metadata ?? {}) as Json,
                  document_metadata: (m.document_metadata ?? {}) as Json,
                }));

                const tRerank0 = Date.now();
                const reranked = rerankCandidates(query, candidates).slice(0, 5);
                const rerank_ms = Date.now() - tRerank0;

                ragChunks = reranked;
                const { context: retrievedCtx, tokenCount } = buildContext(reranked);
                if (retrievedCtx) {
                  systemPrompt = buildRagSystemPrompt(systemPrompt, retrievedCtx);
                }

                // Best-effort cache upsert.
                try {
                  if (cache) {
                    await supabase
                      .from("retrieval_cache")
                      .update({ hit_count: (cache.hit_count ?? 0) + 1 })
                      .eq("id", cache.id);
                  } else {
                    await supabase.from("retrieval_cache").insert({
                      user_id: userId,
                      query_hash,
                      query_text: query,
                      embedding: JSON.stringify(qEmb) as unknown as string,
                      top_chunk_ids: reranked.map((r) => r.id),
                    });
                  }
                } catch (e) {
                  console.warn("[chat] cache upsert failed", e);
                }

                const total_ms = Date.now() - t0;
                ragDebug = {
                  query,
                  chunks: reranked,
                  debug: {
                    cache_hit: Boolean(cache),
                    candidate_count: candidates.length,
                    chunks_returned: reranked.length,
                    timings: { embed_ms, search_ms, rerank_ms, total_ms },
                    candidates: candidates.map((c) => ({
                      chunk_id: c.id,
                      filename: c.filename,
                      chunk_number: c.chunk_number,
                      similarity: c.similarity,
                      rerank_score:
                        reranked.find((r) => r.id === c.id)?.rerank_score ?? c.similarity,
                    })),
                  },
                  tokens: {
                    retrieved_estimate: tokenCount,
                    prompt_estimate: Math.ceil(systemPrompt.length / 4),
                  },
                  context_length: retrievedCtx.length,
                  system_prompt_preview: systemPrompt.slice(0, 4000),
                };
              }
            }
          } catch (err) {
            console.warn("[chat] RAG retrieval failed", err);
          }
        }

        try {
          const gateway = createLovableAiGatewayProvider(key);
          const model = gateway(BHOOMITRA_CHAT_MODEL);

          const result = streamText({
            model,
            system: systemPrompt,
            messages: await convertToModelMessages(uiMessages),
          });

          return result.toUIMessageStreamResponse({
            originalMessages: uiMessages,
            messageMetadata: ({ part }) =>
              part.type === "start" && ragDebug
                ? { rag: ragDebug }
                : undefined,
            onError: (error) => {
              console.error("[chat] stream error", error);
              if (error instanceof Error) return error.message;
              return "The assistant ran into an unexpected error.";
            },
          });
        } catch (error) {
          console.error("[chat] handler error", error);
          const message = error instanceof Error ? error.message : "Unknown error";
          return new Response(message, { status: 500 });
        } finally {
          // Ensure ragChunks is referenced to avoid unused-var lints in edge cases.
          void ragChunks;
        }
      },
    },
  },
});
