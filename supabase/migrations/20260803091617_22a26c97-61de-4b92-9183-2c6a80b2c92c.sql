CREATE TABLE public.voice_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  auto_play BOOLEAN NOT NULL DEFAULT true,
  preferred_language TEXT NOT NULL DEFAULT 'en-IN',
  speech_rate REAL NOT NULL DEFAULT 1.0,
  speech_pitch REAL NOT NULL DEFAULT 1.0,
  voice_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.voice_settings TO authenticated;
GRANT ALL ON public.voice_settings TO service_role;

ALTER TABLE public.voice_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "voice_settings_owner_select" ON public.voice_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "voice_settings_owner_insert" ON public.voice_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "voice_settings_owner_update" ON public.voice_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "voice_settings_owner_delete" ON public.voice_settings FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_voice_settings_updated_at
BEFORE UPDATE ON public.voice_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();