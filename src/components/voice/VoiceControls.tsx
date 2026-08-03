import { Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VoiceVisualizer } from "./VoiceVisualizer";
import { VoiceErrorNotice } from "./VoiceErrorNotice";
import type { VoiceConversation } from "@/hooks/useVoiceConversation";

type Props = {
  voice: VoiceConversation;
  disabled?: boolean;
};

const STATE_LABEL: Record<string, string> = {
  idle: "Voice ready",
  listening: "Listening…",
  processing: "Thinking…",
  speaking: "Speaking…",
  paused: "Paused",
  error: "Voice error",
};

/** Microphone control mounted beside the existing Send button. */
export function VoiceControls({ voice, disabled }: Props) {
  const listening = voice.state === "listening";
  const unsupported = !voice.support.recognition;

  return (
    <div className="flex flex-col items-end">
      <div className="flex items-center gap-2">
        {listening && <VoiceVisualizer level={voice.level} active />}
        <Button
          type="button"
          variant={listening ? "destructive" : "outline"}
          size="icon"
          className="min-h-11 min-w-11 rounded-full"
          disabled={disabled || unsupported}
          title={
            unsupported
              ? "Voice input isn't supported in this browser"
              : listening
                ? "Stop listening"
                : "Speak your question"
          }
          aria-label={listening ? "Stop listening" : "Start voice input"}
          aria-pressed={listening}
          onClick={() => (listening ? voice.stopListening() : void voice.startListening())}
        >
          {listening ? <Square className="h-4 w-4" /> : <Mic className="h-5 w-5" />}
        </Button>
      </div>

      <span className="sr-only" aria-live="polite">
        {STATE_LABEL[voice.state] ?? ""}
      </span>

      {voice.error && (
        <VoiceErrorNotice
          error={voice.error}
          onRetry={() => {
            voice.clearError();
            void voice.startListening();
          }}
          onDismiss={voice.clearError}
        />
      )}
    </div>
  );
}
