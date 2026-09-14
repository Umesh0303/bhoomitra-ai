
-- ============ roles ============
create type public.app_role as enum ('admin', 'reviewer', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create or replace function public.is_reviewer(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role in ('admin', 'reviewer')
  )
$$;

create policy "Users read own roles" on public.user_roles
for select to authenticated
using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- ============ disease_cases ============
create table public.disease_cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  farm_id uuid references public.farms(id) on delete set null,
  scan_id uuid references public.crop_scans(id) on delete set null,
  crop_name text not null default 'Unknown',
  crop_variety text,
  crop_stage text,
  days_after_sowing integer,
  days_after_transplant integer,
  affected_part text,
  symptoms text[] not null default '{}',
  location_lat numeric,
  location_lng numeric,
  location_name text,
  weather_context jsonb not null default '{}'::jsonb,
  soil_context jsonb not null default '{}'::jsonb,
  irrigation_context jsonb not null default '{}'::jsonb,
  ai_diagnosis jsonb not null default '{}'::jsonb,
  model_name text,
  model_version text,
  prompt_version text,
  diagnostic_schema_version text,
  confidence_initial integer,
  confidence_after_answers integer,
  confidence_after_history integer,
  confidence_final integer,
  followup_questions jsonb not null default '[]'::jsonb,
  followup_answers jsonb not null default '[]'::jsonb,
  recommended_treatment jsonb not null default '{}'::jsonb,
  image_count integer not null default 0,
  case_status text not null default 'diagnosed',
  validation_status text not null default 'unverified',
  promoted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (scan_id)
);

grant select, insert, update on public.disease_cases to authenticated;
grant all on public.disease_cases to service_role;
alter table public.disease_cases enable row level security;

create policy "Owners insert own cases" on public.disease_cases
for insert to authenticated with check (user_id = auth.uid());
create policy "Owners read own cases" on public.disease_cases
for select to authenticated using (user_id = auth.uid() or public.is_reviewer(auth.uid()));
create policy "Owners update own cases" on public.disease_cases
for update to authenticated
using (user_id = auth.uid() or public.is_reviewer(auth.uid()))
with check (user_id = auth.uid() or public.is_reviewer(auth.uid()));

create index idx_disease_cases_user on public.disease_cases(user_id);
create index idx_disease_cases_farm on public.disease_cases(farm_id);
create index idx_disease_cases_crop on public.disease_cases(crop_name);
create index idx_disease_cases_validation on public.disease_cases(validation_status);
create index idx_disease_cases_created on public.disease_cases(created_at desc);

create trigger trg_disease_cases_updated_at before update on public.disease_cases
for each row execute function public.update_updated_at_column();

-- ============ disease_case_images ============
create table public.disease_case_images (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.disease_cases(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  image_type text not null default 'other',
  image_order integer not null default 0,
  quality_score numeric,
  created_at timestamptz not null default now()
);

grant select, insert on public.disease_case_images to authenticated;
grant all on public.disease_case_images to service_role;
alter table public.disease_case_images enable row level security;

create policy "Owners insert own case images" on public.disease_case_images
for insert to authenticated with check (user_id = auth.uid());
create policy "Owners read own case images" on public.disease_case_images
for select to authenticated using (user_id = auth.uid() or public.is_reviewer(auth.uid()));

create index idx_disease_case_images_case on public.disease_case_images(case_id);

-- ============ disease_feedback ============
create table public.disease_feedback (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.disease_cases(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  diagnosis_rating text not null,
  farmer_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (case_id)
);

grant select, insert, update on public.disease_feedback to authenticated;
grant all on public.disease_feedback to service_role;
alter table public.disease_feedback enable row level security;

create policy "Owners insert own feedback" on public.disease_feedback
for insert to authenticated with check (user_id = auth.uid());
create policy "Owners read own feedback" on public.disease_feedback
for select to authenticated using (user_id = auth.uid() or public.is_reviewer(auth.uid()));
create policy "Owners update own feedback" on public.disease_feedback
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create index idx_disease_feedback_case on public.disease_feedback(case_id);

create trigger trg_disease_feedback_updated_at before update on public.disease_feedback
for each row execute function public.update_updated_at_column();

-- ============ disease_case_outcomes ============
create table public.disease_case_outcomes (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.disease_cases(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  treatment_followed boolean not null default false,
  treatment_details text,
  days_after_treatment integer,
  outcome text not null default 'unknown',
  severity_after text,
  farmer_confirmed_disease text,
  followup_images jsonb not null default '[]'::jsonb,
  farmer_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (case_id)
);

grant select, insert, update on public.disease_case_outcomes to authenticated;
grant all on public.disease_case_outcomes to service_role;
alter table public.disease_case_outcomes enable row level security;

create policy "Owners insert own outcomes" on public.disease_case_outcomes
for insert to authenticated with check (user_id = auth.uid());
create policy "Owners read own outcomes" on public.disease_case_outcomes
for select to authenticated using (user_id = auth.uid() or public.is_reviewer(auth.uid()));
create policy "Owners update own outcomes" on public.disease_case_outcomes
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create index idx_disease_case_outcomes_case on public.disease_case_outcomes(case_id);

create trigger trg_disease_case_outcomes_updated_at before update on public.disease_case_outcomes
for each row execute function public.update_updated_at_column();

-- ============ disease_knowledge ============
create table public.disease_knowledge (
  id uuid primary key default gen_random_uuid(),
  source_case_id uuid references public.disease_cases(id) on delete set null,
  crop_name text not null,
  disease_name text not null,
  symptoms text[] not null default '{}',
  visual_features text[] not null default '{}',
  affected_parts text[] not null default '{}',
  crop_stage text,
  weather_conditions jsonb not null default '{}'::jsonb,
  soil_conditions jsonb not null default '{}'::jsonb,
  regional_context jsonb not null default '{}'::jsonb,
  diagnostic_evidence text not null default '',
  treatment_guidance text not null default '',
  prevention_guidance text not null default '',
  treatment_success_rate numeric,
  confidence_score numeric not null default 50,
  validation_status text not null default 'farmer_confirmed',
  knowledge_text text not null,
  embedding vector(1536),
  indexing_status text not null default 'pending',
  knowledge_version integer not null default 1,
  model_version text,
  source_case_count integer not null default 1,
  evidence_count integer not null default 1,
  last_validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on public.disease_knowledge to authenticated;
grant all on public.disease_knowledge to service_role;
alter table public.disease_knowledge enable row level security;

create policy "Signed-in users read trusted knowledge" on public.disease_knowledge
for select to authenticated using (validation_status <> 'rejected');
create policy "Reviewers manage knowledge" on public.disease_knowledge
for all to authenticated
using (public.is_reviewer(auth.uid()))
with check (public.is_reviewer(auth.uid()));

create index idx_disease_knowledge_crop on public.disease_knowledge(crop_name);
create index idx_disease_knowledge_disease on public.disease_knowledge(disease_name);
create index idx_disease_knowledge_validation on public.disease_knowledge(validation_status);
create index idx_disease_knowledge_created on public.disease_knowledge(created_at desc);
create index idx_disease_knowledge_embedding on public.disease_knowledge
using hnsw (embedding vector_cosine_ops);

create trigger trg_disease_knowledge_updated_at before update on public.disease_knowledge
for each row execute function public.update_updated_at_column();

-- ============ disease_knowledge_sources ============
create table public.disease_knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  knowledge_id uuid not null references public.disease_knowledge(id) on delete cascade,
  case_id uuid not null references public.disease_cases(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (knowledge_id, case_id)
);

grant select on public.disease_knowledge_sources to authenticated;
grant all on public.disease_knowledge_sources to service_role;
alter table public.disease_knowledge_sources enable row level security;

create policy "Reviewers read knowledge sources" on public.disease_knowledge_sources
for select to authenticated using (public.is_reviewer(auth.uid()));

create index idx_disease_knowledge_sources_knowledge on public.disease_knowledge_sources(knowledge_id);

-- ============ disease_review ============
create table public.disease_review (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.disease_cases(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  decision text not null,
  reviewer_notes text,
  corrected_disease text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update on public.disease_review to authenticated;
grant all on public.disease_review to service_role;
alter table public.disease_review enable row level security;

create policy "Reviewers read reviews" on public.disease_review
for select to authenticated using (public.is_reviewer(auth.uid()));
create policy "Reviewers insert reviews" on public.disease_review
for insert to authenticated with check (public.is_reviewer(auth.uid()) and reviewer_id = auth.uid());
create policy "Reviewers update reviews" on public.disease_review
for update to authenticated
using (public.is_reviewer(auth.uid())) with check (public.is_reviewer(auth.uid()));

create index idx_disease_review_case on public.disease_review(case_id);

create trigger trg_disease_review_updated_at before update on public.disease_review
for each row execute function public.update_updated_at_column();

-- ============ similar validated case retrieval ============
create or replace function public.match_disease_knowledge(
  query_embedding vector,
  match_count integer default 5,
  crop_filter text default null
)
returns table (
  id uuid,
  crop_name text,
  disease_name text,
  symptoms text[],
  affected_parts text[],
  crop_stage text,
  knowledge_text text,
  treatment_success_rate numeric,
  confidence_score numeric,
  validation_status text,
  source_case_count integer,
  similarity double precision
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    k.id, k.crop_name, k.disease_name, k.symptoms, k.affected_parts, k.crop_stage,
    k.knowledge_text, k.treatment_success_rate, k.confidence_score, k.validation_status,
    k.source_case_count,
    1 - (k.embedding <=> query_embedding) as similarity
  from public.disease_knowledge k
  where k.embedding is not null
    and k.validation_status in ('farmer_confirmed', 'expert_verified', 'system_validated')
    and (crop_filter is null or lower(k.crop_name) = lower(crop_filter))
  order by
    case k.validation_status
      when 'expert_verified' then 0
      when 'system_validated' then 1
      else 2
    end,
    k.embedding <=> query_embedding
  limit match_count;
$$;
