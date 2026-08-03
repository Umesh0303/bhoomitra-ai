import type { VoiceError, VoiceState } from "@/types/voice";

/**
 * Single centralized voice state machine.
 * idle → listening → processing → speaking → (paused) → idle, with errors from
 * listening/processing/speaking.
 */
export type VoiceAction =
  | { type: "START_LISTENING" }
  | { type: "TRANSCRIPT"; transcript: string }
  | { type: "SUBMIT" }
  | { type: "SPEAK_START" }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "DONE" }
  | { type: "CANCEL" }
  | { type: "FAIL"; error: VoiceError }
  | { type: "CLEAR_ERROR" };

export type VoiceMachineState = {
  state: VoiceState;
  transcript: string;
  error: VoiceError | null;
};

export const initialVoiceState: VoiceMachineState = {
  state: "idle",
  transcript: "",
  error: null,
};

const CAN_FAIL: VoiceState[] = ["listening", "processing", "speaking", "paused"];

export function voiceReducer(current: VoiceMachineState, action: VoiceAction): VoiceMachineState {
  switch (action.type) {
    case "START_LISTENING":
      if (current.state === "listening") return current;
      return { state: "listening", transcript: "", error: null };

    case "TRANSCRIPT":
      if (current.state !== "listening") return current;
      return { ...current, transcript: action.transcript };

    case "SUBMIT":
      if (current.state !== "listening" && current.state !== "idle") return current;
      return { ...current, state: "processing", error: null };

    case "SPEAK_START":
      if (current.state === "speaking") return current;
      return { ...current, state: "speaking", error: null };

    case "PAUSE":
      if (current.state !== "speaking") return current;
      return { ...current, state: "paused" };

    case "RESUME":
      if (current.state !== "paused") return current;
      return { ...current, state: "speaking" };

    case "DONE":
    case "CANCEL":
      return { state: "idle", transcript: "", error: null };

    case "FAIL":
      if (!CAN_FAIL.includes(current.state) && current.state !== "idle") return current;
      return { state: "error", transcript: current.transcript, error: action.error };

    case "CLEAR_ERROR":
      return { ...current, state: "idle", error: null };

    default:
      return current;
  }
}

export function isBusy(state: VoiceState): boolean {
  return state === "listening" || state === "processing" || state === "speaking";
}
