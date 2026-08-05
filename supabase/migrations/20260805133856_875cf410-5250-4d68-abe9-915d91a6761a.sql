CREATE TABLE public.crop_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_id uuid NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  parent_scan_id uuid REFERENCES public.crop_scans(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  crop_name text,
  plant_parts text[] NOT NULL DEFAULT '{}',
  farm_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  weather_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  image_analysis jsonb NOT NULL DEFAULT '{}'::jsonb,
  candidates jsonb NOT NULL DEFAULT '[]'::jsonb,
  diagnosis jsonb,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  reasoning text,
  differential jsonb NOT NULL DEFAULT '{}'::jsonb,
  missing_evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  treatment_plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  weather_risk jsonb NOT NULL DEFAULT '{}'::jsonb,
  progression jsonb NOT NULL DEFAULT '{}'::jsonb,
  health_score jsonb NOT NULL DEFAULT '{}'::jsonb,
  citations jsonb NOT NULL DEFAULT '[]'::jsonb,
  alerts jsonb NOT NULL DEFAULT '[]'::jsonb,
  recovery jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence integer,
  severity text,
  disease_type text,
  treatment_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crop_scans TO authenticated;
GRANT ALL ON public.crop_scans TO service_role;

ALTER TABLE public.crop_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY crop_scans_owner_select ON public.crop_scans FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY crop_scans_owner_insert ON public.crop_scans FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY crop_scans_owner_update ON public.crop_scans FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY crop_scans_owner_delete ON public.crop_scans FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX crop_scans_user_created_idx ON public.crop_scans (user_id, created_at DESC);
CREATE INDEX crop_scans_farm_idx ON public.crop_scans (farm_id, created_at DESC);

CREATE TRIGGER trg_crop_scans_updated_at BEFORE UPDATE ON public.crop_scans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.crop_scan_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id uuid NOT NULL REFERENCES public.crop_scans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  plant_part text NOT NULL DEFAULT 'leaf',
  media_kind text NOT NULL DEFAULT 'image',
  width integer,
  height integer,
  bytes integer,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crop_scan_images TO authenticated;
GRANT ALL ON public.crop_scan_images TO service_role;

ALTER TABLE public.crop_scan_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY crop_scan_images_owner_select ON public.crop_scan_images FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY crop_scan_images_owner_insert ON public.crop_scan_images FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY crop_scan_images_owner_update ON public.crop_scan_images FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY crop_scan_images_owner_delete ON public.crop_scan_images FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX crop_scan_images_scan_idx ON public.crop_scan_images (scan_id, sort_order);

CREATE TABLE public.crop_scan_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id uuid NOT NULL REFERENCES public.crop_scans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question text NOT NULL,
  help_text text,
  category text,
  input_type text NOT NULL DEFAULT 'single',
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  answer text,
  targets jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crop_scan_questions TO authenticated;
GRANT ALL ON public.crop_scan_questions TO service_role;

ALTER TABLE public.crop_scan_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY crop_scan_questions_owner_select ON public.crop_scan_questions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY crop_scan_questions_owner_insert ON public.crop_scan_questions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY crop_scan_questions_owner_update ON public.crop_scan_questions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY crop_scan_questions_owner_delete ON public.crop_scan_questions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX crop_scan_questions_scan_idx ON public.crop_scan_questions (scan_id, sort_order);