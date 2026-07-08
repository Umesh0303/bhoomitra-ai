
CREATE OR REPLACE FUNCTION public.match_knowledge_chunks(query_embedding vector, user_uuid uuid, match_count integer DEFAULT 15, metadata_filter jsonb DEFAULT '{}'::jsonb)
 RETURNS TABLE(id uuid, document_id uuid, chunk_number integer, page_number integer, chunk_text text, metadata jsonb, filename text, document_metadata jsonb, similarity double precision)
 LANGUAGE plpgsql
 STABLE
 SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null or auth.uid() <> user_uuid then
    raise exception 'not authorized';
  end if;

  return query
    select
      c.id,
      c.document_id,
      c.chunk_number,
      c.page_number,
      c.chunk_text,
      c.metadata,
      d.filename,
      d.metadata as document_metadata,
      1 - (c.embedding <=> query_embedding) as similarity
    from public.knowledge_chunks c
    join public.knowledge_documents d on d.id = c.document_id
    where c.user_id = user_uuid
      and c.deleted_at is null
      and d.is_latest = true
      and d.processing_status = 'completed'
      and c.embedding is not null
      and (metadata_filter = '{}'::jsonb or c.metadata @> metadata_filter or d.metadata @> metadata_filter)
    order by c.embedding <=> query_embedding
    limit match_count;
end;
$function$;

REVOKE ALL ON FUNCTION public.match_knowledge_chunks(vector, uuid, integer, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_knowledge_chunks(vector, uuid, integer, jsonb) TO authenticated, service_role;
