-- Additive: optional sowing_date on farms (used to anchor the crop calendar)
ALTER TABLE public.farms ADD COLUMN IF NOT EXISTS sowing_date DATE;

-- Weather cache
CREATE TABLE IF NOT EXISTS public.weather_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  current JSONB NOT NULL,
  hourly JSONB NOT NULL DEFAULT '[]'::jsonb,
  daily JSONB NOT NULL DEFAULT '[]'::jsonb,
  alerts JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS weather_cache_farm_uidx ON public.weather_cache(farm_id);
CREATE INDEX IF NOT EXISTS weather_cache_user_idx ON public.weather_cache(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.weather_cache TO authenticated;
GRANT ALL ON public.weather_cache TO service_role;
ALTER TABLE public.weather_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "weather_cache_owner_select" ON public.weather_cache FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "weather_cache_owner_insert" ON public.weather_cache FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "weather_cache_owner_update" ON public.weather_cache FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "weather_cache_owner_delete" ON public.weather_cache FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_weather_cache_updated_at
  BEFORE UPDATE ON public.weather_cache
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Calendar tasks
CREATE TABLE IF NOT EXISTS public.calendar_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  crop_name TEXT NOT NULL,
  stage TEXT NOT NULL,
  stage_id TEXT,
  task_name TEXT NOT NULL,
  task_type TEXT NOT NULL,
  task_date DATE NOT NULL,
  day_offset INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'upcoming',
  priority TEXT NOT NULL DEFAULT 'normal',
  notes TEXT,
  source TEXT NOT NULL DEFAULT 'template',
  template_hash TEXT NOT NULL,
  estimated_duration_days INTEGER,
  water_requirement TEXT,
  fertilizer_category TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS calendar_tasks_hash_uidx ON public.calendar_tasks(template_hash);
CREATE INDEX IF NOT EXISTS calendar_tasks_farm_date_idx ON public.calendar_tasks(farm_id, task_date);
CREATE INDEX IF NOT EXISTS calendar_tasks_user_idx ON public.calendar_tasks(user_id);
CREATE INDEX IF NOT EXISTS calendar_tasks_status_idx ON public.calendar_tasks(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_tasks TO authenticated;
GRANT ALL ON public.calendar_tasks TO service_role;
ALTER TABLE public.calendar_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_tasks_owner_select" ON public.calendar_tasks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "calendar_tasks_owner_insert" ON public.calendar_tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "calendar_tasks_owner_update" ON public.calendar_tasks FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "calendar_tasks_owner_delete" ON public.calendar_tasks FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_calendar_tasks_updated_at
  BEFORE UPDATE ON public.calendar_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();