import { VOICE_LANGUAGES } from "@/types/voice";

const SCRIPT_RANGES: Array<{ code: string; re: RegExp }> = [
  { code: "te-IN", re: /[\u0C00-\u0C7F]/ },
  { code: "ta-IN", re: /[\u0B80-\u0BFF]/ },
  { code: "kn-IN", re: /[\u0C80-\u0CFF]/ },
  // Devanagari covers both Hindi and Marathi; Hindi is the safer default.
  { code: "hi-IN", re: /[\u0900-\u097F]/ },
];

/**
 * Detects the BCP-47 language of a transcript from its script.
 * Falls back to the user's preferred language when nothing matches.
 */
export function detectLanguage(text: string, fallback: string): string {
  for (const { code, re } of SCRIPT_RANGES) {
    if (re.test(text)) {
      // Keep Marathi if the user explicitly prefers it (same script as Hindi).
      if (code === "hi-IN" && fallback === "mr-IN") return "mr-IN";
      return code;
    }
  }
  return fallback;
}

export function isSupportedLanguage(code: string): boolean {
  return VOICE_LANGUAGES.some((l) => l.code === code);
}

export function languageLabel(code: string): string {
  return VOICE_LANGUAGES.find((l) => l.code === code)?.label ?? code;
}
