import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DEFAULT_VOICE_SETTINGS, type VoiceSettings } from "@/types/voice";

const STORAGE_KEY = "bhoomitra.voice.settings";

function readCache(): VoiceSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return { ...DEFAULT_VOICE_SETTINGS, ...(JSON.parse(raw) as Partial<VoiceSettings>) };
  } catch {
    return null;
  }
}

function writeCache(settings: VoiceSettings) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* storage unavailable */
  }
}

/**
 * Voice preferences with an optimistic localStorage cache backed by the
 * owner-only `voice_settings` table.
 */
export function useVoiceSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<VoiceSettings>(DEFAULT_VOICE_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const cached = readCache();
    if (cached) setSettings(cached);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setLoaded(true);
      return;
    }
    void (async () => {
      const { data } = await supabase
        .from("voice_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        const next: VoiceSettings = {
          enabled: data.enabled,
          autoPlay: data.auto_play,
          preferredLanguage: data.preferred_language,
          speechRate: data.speech_rate,
          speechPitch: data.speech_pitch,
          voiceName: data.voice_name,
        };
        setSettings(next);
        writeCache(next);
      }
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const update = useCallback(
    (patch: Partial<VoiceSettings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...patch };
        writeCache(next);
        if (user) {
          if (saveTimer.current) clearTimeout(saveTimer.current);
          saveTimer.current = setTimeout(() => {
            void supabase.from("voice_settings").upsert(
              {
                user_id: user.id,
                enabled: next.enabled,
                auto_play: next.autoPlay,
                preferred_language: next.preferredLanguage,
                speech_rate: next.speechRate,
                speech_pitch: next.speechPitch,
                voice_name: next.voiceName,
              },
              { onConflict: "user_id" },
            );
          }, 500);
        }
        return next;
      });
    },
    [user],
  );

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    [],
  );

  return { settings, update, loaded };
}
