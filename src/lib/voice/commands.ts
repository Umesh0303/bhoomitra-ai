export type VoiceCommand = {
  id: string;
  to: string;
  label: string;
  phrases: string[];
};

/**
 * Navigation command registry. Matched commands never reach the AI model.
 * Routes below already exist in the app.
 */
export const VOICE_COMMANDS: VoiceCommand[] = [
  {
    id: "farms",
    to: "/app/farms",
    label: "My Farms",
    phrases: ["open my farms", "my farms", "show my farms", "open farms", "show farms"],
  },
  {
    id: "weather",
    to: "/app/weather",
    label: "Weather",
    phrases: ["show weather", "open weather", "weather", "show me the weather"],
  },
  {
    id: "calendar",
    to: "/app/calendar",
    label: "Crop Calendar",
    phrases: ["open crop calendar", "crop calendar", "show crop calendar", "open calendar"],
  },
  {
    id: "knowledge",
    to: "/app/knowledge",
    label: "Farm Knowledge",
    phrases: [
      "open farm knowledge",
      "farm knowledge",
      "open knowledge",
      "show knowledge base",
      "knowledge base",
    ],
  },
  {
    id: "dashboard",
    to: "/app/dashboard",
    label: "Dashboard",
    phrases: ["open dashboard", "dashboard", "show dashboard", "go to dashboard"],
  },
  {
    id: "home",
    to: "/",
    label: "Home",
    phrases: ["go home", "open home", "home page", "go to home"],
  },
  {
    id: "settings",
    to: "/app/settings",
    label: "Settings",
    phrases: ["open settings", "settings", "show settings", "go to settings"],
  },
];

export function normalizeTranscript(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Returns a matching navigation command, or null when the transcript is a question. */
export function matchCommand(transcript: string): VoiceCommand | null {
  const normalized = normalizeTranscript(transcript);
  if (!normalized || normalized.split(" ").length > 6) return null;
  for (const command of VOICE_COMMANDS) {
    for (const phrase of command.phrases) {
      if (normalized === phrase) return command;
      if (normalized === `please ${phrase}` || normalized === `${phrase} please`) return command;
    }
  }
  return null;
}
