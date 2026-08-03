// Provider-agnostic voice types. UI never touches browser APIs directly.

export type VoiceState = "idle" | "listening" | "processing" | "speaking" | "paused" | "error";

export type VoiceErrorCode =
  | "unsupported"
  | "permission-denied"
  | "no-microphone"
  | "recognition-timeout"
  | "recognition-aborted"
  | "recognition-failed"
  | "synthesis-failed"
  | "voice-unavailable"
  | "navigation-failed";

export type VoiceError = {
  code: VoiceErrorCode;
  message: string;
  /** Whether retrying the same action is likely to help. */
  retryable: boolean;
};

export type VoiceLanguage = {
  /** BCP-47 tag used by both recognition and synthesis. */
  code: string;
  label: string;
  nativeLabel: string;
};

export const VOICE_LANGUAGES: VoiceLanguage[] = [
  { code: "en-IN", label: "English", nativeLabel: "English" },
  { code: "hi-IN", label: "Hindi", nativeLabel: "हिन्दी" },
  { code: "te-IN", label: "Telugu", nativeLabel: "తెలుగు" },
  { code: "ta-IN", label: "Tamil", nativeLabel: "தமிழ்" },
  { code: "kn-IN", label: "Kannada", nativeLabel: "ಕನ್ನಡ" },
  { code: "mr-IN", label: "Marathi", nativeLabel: "मराठी" },
];

export type VoiceSettings = {
  enabled: boolean;
  autoPlay: boolean;
  preferredLanguage: string;
  speechRate: number;
  speechPitch: number;
  voiceName: string | null;
};

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  enabled: true,
  autoPlay: true,
  preferredLanguage: "en-IN",
  speechRate: 1,
  speechPitch: 1,
  voiceName: null,
};

export type VoiceSupport = {
  recognition: boolean;
  synthesis: boolean;
};

// ---------- Provider interfaces (swap adapters, never the UI) ----------

export type RecognitionResult = {
  transcript: string;
  isFinal: boolean;
};

export type RecognitionHandlers = {
  onResult: (result: RecognitionResult) => void;
  onError: (error: VoiceError) => void;
  onEnd: () => void;
  onStart?: () => void;
};

export interface SpeechRecognitionProvider {
  readonly id: string;
  isSupported(): boolean;
  start(language: string, handlers: RecognitionHandlers): void;
  stop(): void;
  abort(): void;
}

export type SpeakOptions = {
  text: string;
  language: string;
  rate: number;
  pitch: number;
  voiceName?: string | null;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: VoiceError) => void;
};

export interface SpeechSynthesisProvider {
  readonly id: string;
  isSupported(): boolean;
  listVoices(): Array<{ name: string; lang: string }>;
  speak(options: SpeakOptions): void;
  pause(): void;
  resume(): void;
  cancel(): void;
}

export type VoiceAnalyticsEvent =
  | "voice_started"
  | "voice_cancelled"
  | "voice_completed"
  | "command_executed"
  | "speech_replayed"
  | "voice_disabled"
  | "browser_unsupported";
