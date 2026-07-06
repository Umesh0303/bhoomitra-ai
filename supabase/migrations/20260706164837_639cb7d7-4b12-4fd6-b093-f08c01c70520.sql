
create extension if not exists vector;
create extension if not exists pgcrypto;

do $$ begin
  create type public.knowledge_processing_status as enum (
    'uploading','queued','virus_check','extracting','normalizing',
    'extracting_metadata','chunking','deduplicating','embedding',
    'indexing','verifying','completed','failed'
  );
exception when duplicate_object then null; end $$;

create table public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  filename text not null,
  file_type text not null,
  file_size bigint not null,
  storage_path text not null,
  upload_date timestamptz not null default now(),
  processing_status public.knowledge_processing_status not null default 'uploading',
  error_message text,
  total_chunks integer not null default 0,
  total_characters integer not null default 0,
  total_tokens integer not null default 0,
  version integer not null default 1,
  is_latest boolean not null default true,
  parent_document_id uuid references public.knowledge_documents(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index knowledge_documents_user_idx on public.knowledge_documents(user_id);
create index knowledge_documents_status_idx on public.knowledge_documents(processing_status);
create index knowledge_documents_latest_idx on public.knowledge_documents(user_id, is_latest);
create index knowledge_documents_metadata_idx on public.knowledge_documents using gin (metadata);

grant select, insert, update, delete on public.knowledge_documents to authenticated;
grant all on public.knowledge_documents to service_role;

alter table public.knowledge_documents enable row level security;

create policy "Users read own documents" on public.knowledge_documents
  for select to authenticated using (auth.uid() = user_id);
create policy "Users insert own documents" on public.knowledge_documents
  for insert to authenticated with check (auth.uid() = user_id);
create policy "Users update own documents" on public.knowledge_documents
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete own documents" on public.knowledge_documents
  for delete to authenticated using (auth.uid() = user_id);

create trigger knowledge_documents_updated_at
  before update on public.knowledge_documents
  for each row execute function public.update_updated_at_column();

create table public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.knowledge_documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  chunk_number integer not null,
  page_number integer,
  chunk_text text not null,
  chunk_hash text not null,
  embedding vector(1536),
  token_count integer not null default 0,
  char_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (document_id, chunk_hash)
);

create index knowledge_chunks_document_idx on public.knowledge_chunks(document_id);
create index knowledge_chunks_user_idx on public.knowledge_chunks(user_id);
create index knowledge_chunks_metadata_idx on public.knowledge_chunks using gin (metadata);
create index knowledge_chunks_fts_idx on public.knowledge_chunks using gin (to_tsvector('simple', chunk_text));
create index knowledge_chunks_embedding_idx
  on public.knowledge_chunks using hnsw (embedding vector_cosine_ops)
  where deleted_at is null;

grant select, insert, update, delete on public.knowledge_chunks to authenticated;
grant all on public.knowledge_chunks to service_role;

alter table public.knowledge_chunks enable row level security;

create policy "Users read own chunks" on public.knowledge_chunks
  for select to authenticated using (auth.uid() = user_id);
create policy "Users insert own chunks" on public.knowledge_chunks
  for insert to authenticated with check (auth.uid() = user_id);
create policy "Users update own chunks" on public.knowledge_chunks
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete own chunks" on public.knowledge_chunks
  for delete to authenticated using (auth.uid() = user_id);

create table public.retrieval_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  query_hash text not null,
  query_text text not null,
  embedding vector(1536),
  top_chunk_ids uuid[] not null default '{}',
  hit_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, query_hash)
);

create index retrieval_cache_user_idx on public.retrieval_cache(user_id);
create index retrieval_cache_created_idx on public.retrieval_cache(created_at);

grant select, insert, update, delete on public.retrieval_cache to authenticated;
grant all on public.retrieval_cache to service_role;

alter table public.retrieval_cache enable row level security;

create policy "Users read own cache" on public.retrieval_cache
  for select to authenticated using (auth.uid() = user_id);
create policy "Users insert own cache" on public.retrieval_cache
  for insert to authenticated with check (auth.uid() = user_id);
create policy "Users update own cache" on public.retrieval_cache
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete own cache" on public.retrieval_cache
  for delete to authenticated using (auth.uid() = user_id);

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
language sql
stable
security definer
set search_path = public
as $$
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
$$;

grant execute on function public.match_knowledge_chunks(vector, uuid, integer, jsonb) to authenticated, service_role;

create policy "Users read own knowledge files"
on storage.objects for select to authenticated
using (bucket_id = 'knowledge-docs' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users upload own knowledge files"
on storage.objects for insert to authenticated
with check (bucket_id = 'knowledge-docs' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users update own knowledge files"
on storage.objects for update to authenticated
using (bucket_id = 'knowledge-docs' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users delete own knowledge files"
on storage.objects for delete to authenticated
using (bucket_id = 'knowledge-docs' and (storage.foldername(name))[1] = auth.uid()::text);
