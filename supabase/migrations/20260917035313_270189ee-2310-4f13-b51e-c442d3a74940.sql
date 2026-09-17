-- ============ Phase 2: evaluation, audit and knowledge quality ============

-- 1. Reviewer audit trail: append-only history of every validation change.
CREATE TABLE public.disease_review_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.disease_cases(id) ON DELETE CASCADE,
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_kind text NOT NULL DEFAULT 'reviewer',
  previous_status text,
  new_status text NOT NULL,
  previous_disease text,
  new_disease text,
  decision text,
  reason text,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.disease_review_history TO authenticated;
GRANT ALL ON public.disease_review_history TO service_role;
ALTER TABLE public.disease_review_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviewers read audit history" ON public.disease_review_history
  FOR SELECT TO authenticated USING (public.is_reviewer(auth.uid()));
CREATE POLICY "Case owners read their own audit history" ON public.disease_review_history
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.disease_cases c WHERE c.id = case_id AND c.user_id = auth.uid())
  );
CREATE POLICY "Reviewers write audit history" ON public.disease_review_history
  FOR INSERT TO authenticated WITH CHECK (public.is_reviewer(auth.uid()) AND reviewer_id = auth.uid());
CREATE INDEX idx_review_history_case ON public.disease_review_history(case_id, created_at DESC);
CREATE INDEX idx_review_history_reviewer ON public.disease_review_history(reviewer_id, created_at DESC);

-- 2. Transparent knowledge quality scores (components stored, not just total).
CREATE TABLE public.disease_quality_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_id uuid NOT NULL REFERENCES public.disease_knowledge(id) ON DELETE CASCADE,
  quality_score integer NOT NULL,
  quality_level text NOT NULL,
  validation_score numeric NOT NULL DEFAULT 0,
  evidence_score numeric NOT NULL DEFAULT 0,
  confirmation_score numeric NOT NULL DEFAULT 0,
  outcome_score numeric NOT NULL DEFAULT 0,
  supporting_cases_score numeric NOT NULL DEFAULT 0,
  consistency_score numeric NOT NULL DEFAULT 0,
  components jsonb NOT NULL DEFAULT '{}'::jsonb,
  config_version text NOT NULL DEFAULT 'v1',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.disease_quality_scores TO authenticated;
GRANT ALL ON public.disease_quality_scores TO service_role;
ALTER TABLE public.disease_quality_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read quality scores" ON public.disease_quality_scores
  FOR SELECT TO authenticated USING (true);
CREATE INDEX idx_quality_scores_knowledge ON public.disease_quality_scores(knowledge_id, created_at DESC);

-- 3. Knowledge versioning: never silently overwrite trusted knowledge.
CREATE TABLE public.disease_knowledge_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_id uuid NOT NULL REFERENCES public.disease_knowledge(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  previous_content jsonb,
  new_content jsonb NOT NULL,
  quality_score integer,
  change_reason text NOT NULL,
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.disease_knowledge_versions TO authenticated;
GRANT ALL ON public.disease_knowledge_versions TO service_role;
ALTER TABLE public.disease_knowledge_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviewers read knowledge versions" ON public.disease_knowledge_versions
  FOR SELECT TO authenticated USING (public.is_reviewer(auth.uid()));
CREATE INDEX idx_knowledge_versions ON public.disease_knowledge_versions(knowledge_id, version_number DESC);

-- 4. Retrieval events: which knowledge was pulled into which scan.
CREATE TABLE public.disease_retrieval_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id uuid REFERENCES public.crop_scans(id) ON DELETE CASCADE,
  case_id uuid REFERENCES public.disease_cases(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  knowledge_ids uuid[] NOT NULL DEFAULT '{}',
  similarities numeric[] NOT NULL DEFAULT '{}',
  retrieved_count integer NOT NULL DEFAULT 0,
  knowledge_used boolean NOT NULL DEFAULT false,
  final_diagnosis text,
  diagnosis_changed boolean,
  validation_outcome text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.disease_retrieval_events TO authenticated;
GRANT ALL ON public.disease_retrieval_events TO service_role;
ALTER TABLE public.disease_retrieval_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read their retrieval events" ON public.disease_retrieval_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Reviewers read retrieval events" ON public.disease_retrieval_events
  FOR SELECT TO authenticated USING (public.is_reviewer(auth.uid()));
CREATE POLICY "Owners write their retrieval events" ON public.disease_retrieval_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_retrieval_events_scan ON public.disease_retrieval_events(scan_id);
CREATE INDEX idx_retrieval_events_created ON public.disease_retrieval_events(created_at DESC);

-- 5. Knowledge lifecycle + independent evidence tracking.
ALTER TABLE public.disease_knowledge
  ADD COLUMN IF NOT EXISTS knowledge_status text NOT NULL DEFAULT 'candidate',
  ADD COLUMN IF NOT EXISTS independent_source_count integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS unique_farm_count integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS quality_score integer,
  ADD COLUMN IF NOT EXISTS quality_level text,
  ADD COLUMN IF NOT EXISTS has_conflicting_evidence boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS status_reason text;
CREATE INDEX IF NOT EXISTS idx_knowledge_status ON public.disease_knowledge(knowledge_status);

-- 6. Reviewer evidence on the decision itself.
ALTER TABLE public.disease_review
  ADD COLUMN IF NOT EXISTS evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS review_seconds integer;