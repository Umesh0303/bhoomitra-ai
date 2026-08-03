import type { SpeakOptions, SpeechSynthesisProvider, VoiceError } from "@/types/voice";

// Browser-only module, loaded lazily after hydration.

function synth(): SpeechSynthesis | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  return window.speechSynthesis;
}

/** Web SpeechSynthesis adapter. Swap this file for Cloud TTS / ElevenLabs / Polly. */
export class WebSpeechSynthesisProvider implements SpeechSynthesisProvider {
  readonly id = "web-speech-synthesis";
  private current: SpeechSynthesisUtterance | null = null;

  isSupported(): boolean {
    return synth() !== null;
  }

  listVoices(): Array<{ name: string; lang: string }> {
    const s = synth();
    if (!s) return [];
    return s.getVoices().map((v) => ({ name: v.name, lang: v.lang }));
  }

  private pickVoice(language: string, voiceName?: string | null): SpeechSynthesisVoice | null {
    const s = synth();
    if (!s) return null;
    const voices = s.getVoices();
    if (voices.length === 0) return null;
    if (voiceName) {
      const exact = voices.find((v) => v.name === voiceName);
      if (exact) return exact;
    }
    const base = language.split("-")[0];
    return (
      voices.find((v) => v.lang === language) ??
      voices.find((v) => v.lang.replace("_", "-").startsWith(base)) ??
      voices.find((v) => v.lang.startsWith("en")) ??
      null
    );
  }

  speak(options: SpeakOptions): void {
    const s = synth();
    if (!s) {
      options.onError?.(unsupportedError());
      return;
    }
    this.cancel();

    const utterance = new SpeechSynthesisUtterance(options.text);
    utterance.lang = options.language;
    utterance.rate = options.rate;
    utterance.pitch = options.pitch;
    const voice = this.pickVoice(options.language, options.voiceName);
    if (voice) utterance.voice = voice;

    utterance.onstart = () => options.onStart?.();
    utterance.onend = () => {
      this.current = null;
      options.onEnd?.();
    };
    utterance.onerror = (event) => {
      this.current = null;
      const reason = (event as SpeechSynthesisErrorEvent).error;
      if (reason === "canceled" || reason === "interrupted") {
        options.onEnd?.();
        return;
      }
      options.onError?.({
        code: "synthesis-failed",
        message: "I couldn't read that out loud. The text answer is still available.",
        retryable: true,
      });
    };

    this.current = utterance;
    // Some engines need a cancel/flush tick before a new utterance is accepted.
    window.setTimeout(() => {
      if (this.current !== utterance) return;
      s.speak(utterance);
    }, 0);
  }

  pause(): void {
    synth()?.pause();
  }

  resume(): void {
    synth()?.resume();
  }

  cancel(): void {
    this.current = null;
    try {
      synth()?.cancel();
    } catch {
      /* noop */
    }
  }
}

function unsupportedError(): VoiceError {
  return {
    code: "unsupported",
    message: "Spoken replies aren't supported in this browser.",
    retryable: false,
  };
}

/** Single shared synthesis instance across the app. */
let singleton: WebSpeechSynthesisProvider | null = null;
export function getSynthesisProvider(): WebSpeechSynthesisProvider {
  if (!singleton) singleton = new WebSpeechSynthesisProvider();
  return singleton;
}
