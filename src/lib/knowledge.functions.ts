import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import { z } from "zod";
import type { RetrievedChunk, RetrievalDebug } from "@/features/knowledge/types";
import { chunkBlocks } from "@/features/knowledge/services/chunker";
import { rerankCandidates } from "@/features/knowledge/services/reranker";
import { detectLanguage, mergeMetadata } from "@/features/knowledge/services/metadataExtractor";
import { sha256Hex, normalizeQueryForHash } from "@/features/knowledge/utils/hash";
import { isSupportedMime, MAX_FILE_SIZE_BYTES } from "@/features/knowledge/utils/mimeTypes";

const MetadataSchema = z
  .object({
    crop: z.string().optional(),
    state: z.string().optional(),
    district: z.string().optional(),
    language: z.string().optional(),
    source: z.string().optional(),
    category: z.string().optional(),
    notes: z.string().optional(),
    namespace: z.string().optional(),
  })
  .partial();

// ------------------ list / get / delete ------------------

export const listDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("knowledge_documents")
      .select("*")
      .eq("user_id", context.userId)
      .eq("is_latest", true)
      .order("upload_date", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getDocument = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: doc, error } = await context.supabase
      .from("knowledge_documents")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!doc) throw new Error("Document not found");

    const { data: chunks, error: cErr } = await context.supabase
      .from("knowledge_chunks")
      .select("id, chunk_number, page_number, chunk_text, token_count, char_count, metadata")
      .eq("document_id", data.id)
      .is("deleted_at", null)
      .order("chunk_number", { ascending: true })
      .limit(500);
    if (cErr) throw new Error(cErr.message);

    return { document: doc, chunks: chunks ?? [] };
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // Look up storage path first.
    const { data: doc } = await context.supabase
      .from("knowledge_documents")
      .select("storage_path")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();

    if (doc?.storage_path) {
      await context.supabase.storage.from("knowledge-docs").remove([doc.storage_path]);
    }

    const { error } = await context.supabase
      .from("knowledge_documents")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ------------------ processing ------------------

const ProcessInput = z.object({
  storage_path: z.string().min(1),
  filename: z.string().min(1).max(255),
  file_type: z.string().min(1),
  file_size: z.number().int().positive(),
  metadata: MetadataSchema.optional(),
  parent_document_id: z.string().uuid().optional(),
});

export const processDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ProcessInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    if (!isSupportedMime(data.file_type)) {
      throw new Error(`Unsupported file type: ${data.file_type}`);
    }
    if (data.file_size > MAX_FILE_SIZE_BYTES) {
      throw new Error("File exceeds 50 MB limit");
    }

    // Version handling: if reprocessing, compute next version.
    let version = 1;
    if (data.parent_document_id) {
      const { data: prev } = await supabase
        .from("knowledge_documents")
        .select("version")
        .eq("id", data.parent_document_id)
        .eq("user_id", userId)
        .maybeSingle();
      version = (prev?.version ?? 1) + 1;
    }

    // Create the document row (processing_status = 'queued').
    const { data: doc, error: insErr } = await supabase
      .from("knowledge_documents")
      .insert({
        user_id: userId,
        filename: data.filename,
        file_type: data.file_type,
        file_size: data.file_size,
        storage_path: data.storage_path,
        processing_status: "queued",
        version,
        is_latest: true,
        parent_document_id: data.parent_document_id ?? null,
        metadata: (data.metadata ?? {}) as unknown as Json,
      })
      .select("*")
      .single();
    if (insErr || !doc) throw new Error(insErr?.message ?? "Failed to create document");

    const documentId = doc.id;

    const setStatus = async (
      status:
        | "extracting"
        | "chunking"
        | "embedding"
        | "indexing"
        | "completed"
        | "failed",
      extra: Record<string, unknown> = {},
    ) => {
      await supabase
        .from("knowledge_documents")
        .update({ processing_status: status, ...extra })
        .eq("id", documentId);
    };

    try {
      // 1. Download bytes.
      await setStatus("extracting");
      const { data: blob, error: dlErr } = await supabase.storage
        .from("knowledge-docs")
        .download(data.storage_path);
      if (dlErr || !blob) throw new Error(dlErr?.message ?? "Download failed");
      const bytes = new Uint8Array(await blob.arrayBuffer());

      // 2. Extract.
      const { extractBlocks } = await import(
        "@/features/knowledge/services/documentExtractor.server"
      );
      const blocks = await extractBlocks(bytes, data.file_type);
      if (blocks.length === 0) throw new Error("No text extracted from document");

      // 3. Chunk.
      await setStatus("chunking");
      const chunks = chunkBlocks(blocks);
      if (chunks.length === 0) throw new Error("No chunks produced");

      // 4. Detect language and merge metadata.
      const sample = blocks.map((b) => b.text).join("\n").slice(0, 4000);
      const detected = { language: detectLanguage(sample) };
      const finalMetadata = mergeMetadata(data.metadata, detected);
      await supabase
        .from("knowledge_documents")
        .update({ metadata: finalMetadata as unknown as Json })
        .eq("id", documentId);

      // 5. Dedupe by hash within this document.
      const hashes = await Promise.all(chunks.map((c) => sha256Hex(c.text)));
      const seen = new Set<string>();
      const unique: Array<{ chunk: (typeof chunks)[number]; hash: string }> = [];
      for (let i = 0; i < chunks.length; i++) {
        if (seen.has(hashes[i])) continue;
        seen.add(hashes[i]);
        unique.push({ chunk: chunks[i], hash: hashes[i] });
      }

      // 6. Embed.
      await setStatus("embedding");
      const key = process.env.LOVABLE_API_KEY;
      if (!key) throw new Error("AI service is not configured");
      const { embedTexts } = await import(
        "@/features/knowledge/services/embeddingService.server"
      );
      const { vectors, usage } = await embedTexts(
        unique.map((u) => u.chunk.text),
        key,
      );

      // 7. Insert chunks.
      await setStatus("indexing");
      const rows = unique.map((u, i) => ({
        document_id: documentId,
        user_id: userId,
        chunk_number: u.chunk.chunk_number,
        page_number: u.chunk.page_number,
        chunk_text: u.chunk.text,
        chunk_hash: u.hash,
        embedding: JSON.stringify(vectors[i]) as unknown as string,
        token_count: u.chunk.token_count,
        char_count: u.chunk.char_count,
        metadata: { heading: u.chunk.heading ?? null } as unknown as Json,
      }));

      // Insert in batches to avoid oversized payloads.
      const BATCH = 100;
      for (let i = 0; i < rows.length; i += BATCH) {
        const { error: chErr } = await supabase
          .from("knowledge_chunks")
          .insert(rows.slice(i, i + BATCH));
        if (chErr) throw new Error(chErr.message);
      }

      // 8. Version swap: soft-delete previous chunks and flip is_latest.
      if (data.parent_document_id) {
        await supabase
          .from("knowledge_chunks")
          .update({ deleted_at: new Date().toISOString() })
          .eq("document_id", data.parent_document_id)
          .is("deleted_at", null);
        await supabase
          .from("knowledge_documents")
          .update({ is_latest: false })
          .eq("id", data.parent_document_id)
          .eq("user_id", userId);
      }

      const totalChars = rows.reduce((s, r) => s + r.char_count, 0);
      await setStatus("completed", {
        total_chunks: rows.length,
        total_characters: totalChars,
        total_tokens: usage.prompt_tokens,
        error_message: null,
      });

      return { document_id: documentId, chunks: rows.length };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[processDocument] failed", msg);
      await setStatus("failed", { error_message: msg });
      throw new Error(msg);
    }
  });

export const reprocessDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: prev, error } = await context.supabase
      .from("knowledge_documents")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!prev) throw new Error("Document not found");

    return processDocument({
      data: {
        storage_path: prev.storage_path,
        filename: prev.filename,
        file_type: prev.file_type,
        file_size: prev.file_size,
        metadata: (prev.metadata ?? {}) as z.infer<typeof MetadataSchema>,
        parent_document_id: prev.id,
      },
    });
  });

// ------------------ retrieval ------------------

const RetrieveInput = z.object({
  query: z.string().min(1).max(2000),
  top_k: z.number().int().min(1).max(20).default(5),
  candidate_k: z.number().int().min(1).max(50).default(15),
  metadata_filter: z.record(z.string(), z.unknown()).default({}),
});

export const retrieveContext = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RetrieveInput.parse(d))
  .handler(async ({ data, context }): Promise<{
    query: string;
    chunks: RetrievedChunk[];
    debug: RetrievalDebug;
  }> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI service is not configured");
    const t0 = Date.now();

    // Cache lookup.
    const query_hash = await sha256Hex(
      normalizeQueryForHash(data.query, data.metadata_filter),
    );
    const { data: cache } = await context.supabase
      .from("retrieval_cache")
      .select("id, top_chunk_ids, hit_count")
      .eq("user_id", context.userId)
      .eq("query_hash", query_hash)
      .maybeSingle();

    const { embedQuery } = await import(
      "@/features/knowledge/services/embeddingService.server"
    );
    const tEmbed0 = Date.now();
    const queryEmbedding = await embedQuery(data.query, key);
    const embed_ms = Date.now() - tEmbed0;

    const tSearch0 = Date.now();
    const { data: matches, error } = await context.supabase.rpc(
      "match_knowledge_chunks",
      {
        query_embedding: JSON.stringify(queryEmbedding) as unknown as string,
        user_uuid: context.userId,
        match_count: data.candidate_k,
        metadata_filter: data.metadata_filter as unknown as Json,
      },
    );
    const search_ms = Date.now() - tSearch0;
    if (error) throw new Error(error.message);

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
    const reranked = rerankCandidates(data.query, candidates).slice(0, data.top_k);
    const rerank_ms = Date.now() - tRerank0;

    // Upsert cache (best-effort, non-blocking failure).
    try {
      if (cache) {
        await context.supabase
          .from("retrieval_cache")
          .update({ hit_count: (cache.hit_count ?? 0) + 1 })
          .eq("id", cache.id);
      } else {
        await context.supabase.from("retrieval_cache").insert({
          user_id: context.userId,
          query_hash,
          query_text: data.query,
          embedding: JSON.stringify(queryEmbedding) as unknown as string,
          top_chunk_ids: reranked.map((r) => r.id),
        });
      }
    } catch (e) {
      console.warn("[retrieveContext] cache upsert failed", e);
    }

    const total_ms = Date.now() - t0;
    return {
      query: data.query,
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
    };
  });
