import type { VoiceAnalyticsEvent } from "@/types/voice";

/**
 * Lightweight, audio-free analytics. Never receives or stores microphone data.
 * Replace the sink later without touching call sites.
 */
export function trackVoiceEvent(
  event: VoiceAnalyticsEvent,
  payload?: Record<string, string | number | boolean>,
): void {
  if (import.meta.env.DEV) {
    console.info("[voice]", event, payload ?? {});
  }
}
