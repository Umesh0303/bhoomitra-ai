
create or replace function public.match_knowledge_chunks(
  query_embedding vector(1536),
  user_uuid uuid,
  match_count integer default 15,
  metadata_filter jsonb default '{}'::jsonb
)
returns table (
  id uuid,
  document_id uuid,
  chunk_number integer,
  page_number integer,
  chunk_text text,
  metadata jsonb,
  filename text,
  document_metadata jsonb,
  similarity float
)
language plpgsql
stable
security definer
set search_path = public
as $$
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
$$;

revoke execute on function public.match_knowledge_chunks(vector, uuid, integer, jsonb) from public, anon;
grant execute on function public.match_knowledge_chunks(vector, uuid, integer, jsonb) to authenticated, service_role;
