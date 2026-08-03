import { Pause, Play, RotateCcw, Square, Volume2 } from "lucide-react";
import type { VoiceConversation } from "@/hooks/useVoiceConversation";

type Props = {
  voice: VoiceConversation;
  messageId: string;
  text: string;
  /** True only when this message is the one currently being spoken. */
  isActive: boolean;
};

/** Playback controls under a finished assistant message. */
export function VoicePlayer({ voice, messageId, text, isActive }: Props) {
  if (!voice.support.synthesis || !text.trim()) return null;

  const speaking = isActive && voice.state === "speaking";
  const paused = isActive && voice.state === "paused";

  return (
    <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
      {!speaking && !paused && (
        <button
          type="button"
          onClick={() => void voice.speak(messageId, text, { replay: true })}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-background"
          aria-label="Play response aloud"
        >
          <Volume2 className="h-3.5 w-3.5" /> Listen
        </button>
      )}
      {speaking && (
        <button
          type="button"
          onClick={voice.pauseSpeaking}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-background"
          aria-label="Pause playback"
        >
          <Pause className="h-3.5 w-3.5" /> Pause
        </button>
      )}
      {paused && (
        <button
          type="button"
          onClick={voice.resumeSpeaking}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-background"
          aria-label="Resume playback"
        >
          <Play className="h-3.5 w-3.5" /> Resume
        </button>
      )}
      {(speaking || paused) && (
        <button
          type="button"
          onClick={voice.stopSpeaking}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-background"
          aria-label="Stop playback"
        >
          <Square className="h-3.5 w-3.5" /> Stop
        </button>
      )}
      {!speaking && !paused && (
        <button
          type="button"
          onClick={() => void voice.speak(messageId, text, { replay: true })}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-background"
          aria-label="Replay response"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Replay
        </button>
      )}
    </div>
  );
}
