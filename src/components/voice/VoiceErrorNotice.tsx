import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VoiceError } from "@/types/voice";

type Props = {
  error: VoiceError;
  onRetry: () => void;
  onDismiss: () => void;
};

export function VoiceErrorNotice({ error, onRetry, onDismiss }: Props) {
  return (
    <div
      role="alert"
      className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
    >
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="flex-1">{error.message}</span>
      {error.retryable && (
        <Button type="button" size="sm" variant="outline" onClick={onRetry}>
          <RotateCcw className="h-3.5 w-3.5" /> Retry
        </Button>
      )}
      <Button type="button" size="sm" variant="ghost" onClick={onDismiss}>
        Continue with text
      </Button>
    </div>
  );
}
