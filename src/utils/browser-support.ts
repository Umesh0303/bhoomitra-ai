import type { VoiceSupport } from "@/types/voice";

export function detectVoiceSupport(): VoiceSupport {
  if (typeof window === "undefined") return { recognition: false, synthesis: false };
  const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
  return {
    recognition: Boolean(w.SpeechRecognition ?? w.webkitSpeechRecognition),
    synthesis: "speechSynthesis" in window,
  };
}

/** True once React has hydrated, so browser-only UI can mount safely. */
export function isBrowser(): boolean {
  return typeof window !== "undefined";
}
