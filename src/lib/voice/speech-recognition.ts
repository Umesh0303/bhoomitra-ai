import type { RecognitionHandlers, SpeechRecognitionProvider, VoiceError } from "@/types/voice";

// Browser-only module. Never import this at module scope from an SSR route —
// it is loaded lazily after hydration.

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
};

type RecognitionCtor = new () => SpeechRecognitionLike;

function getCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function mapError(raw: string): VoiceError {
  switch (raw) {
    case "not-allowed":
    case "service-not-allowed":
      return {
        code: "permission-denied",
        message: "Microphone access is blocked. Allow it in your browser settings and try again.",
        retryable: true,
      };
    case "audio-capture":
      return {
        code: "no-microphone",
        message: "No microphone was found. Connect one and try again.",
        retryable: true,
      };
    case "no-speech":
      return {
        code: "recognition-timeout",
        message: "I didn't hear anything. Tap the mic and speak again.",
        retryable: true,
      };
    case "aborted":
      return { code: "recognition-aborted", message: "Listening stopped.", retryable: true };
    default:
      return {
        code: "recognition-failed",
        message: "Speech recognition failed. You can retry or type your question.",
        retryable: true,
      };
  }
}

/** Web Speech API adapter. Swap this file to move to Google/Deepgram/OpenAI. */
export class WebSpeechRecognitionProvider implements SpeechRecognitionProvider {
  readonly id = "web-speech";
  private instance: SpeechRecognitionLike | null = null;
  private stopping = false;

  isSupported(): boolean {
    return getCtor() !== null;
  }

  start(language: string, handlers: RecognitionHandlers): void {
    const Ctor = getCtor();
    if (!Ctor) {
      handlers.onError({
        code: "unsupported",
        message: "Voice input isn't supported in this browser. Please type instead.",
        retryable: false,
      });
      return;
    }

    this.abort();
    const rec = new Ctor();
    rec.lang = language;
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    this.stopping = false;

    rec.onstart = () => handlers.onStart?.();

    rec.onresult = (event: unknown) => {
      const e = event as {
        resultIndex: number;
        results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
      };
      let transcript = "";
      let isFinal = false;
      for (let i = 0; i < e.results.length; i++) {
        const result = e.results[i];
        transcript += result[0]?.transcript ?? "";
        if (result.isFinal) isFinal = true;
      }
      handlers.onResult({ transcript: transcript.trim(), isFinal });
    };

    rec.onerror = (event: unknown) => {
      const raw = (event as { error?: string }).error ?? "unknown";
      if (this.stopping && raw === "aborted") return;
      handlers.onError(mapError(raw));
    };

    rec.onend = () => {
      handlers.onEnd();
      this.instance = null;
    };

    this.instance = rec;
    try {
      rec.start();
    } catch {
      handlers.onError(mapError("recognition-failed"));
    }
  }

  stop(): void {
    this.stopping = true;
    try {
      this.instance?.stop();
    } catch {
      /* already stopped */
    }
  }

  abort(): void {
    this.stopping = true;
    const rec = this.instance;
    this.instance = null;
    if (!rec) return;
    rec.onresult = null;
    rec.onerror = null;
    rec.onend = null;
    rec.onstart = null;
    try {
      rec.abort();
    } catch {
      /* noop */
    }
  }
}
