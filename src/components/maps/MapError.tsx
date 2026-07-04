import { AlertTriangle } from "lucide-react";

export function MapError({
  title = "Map unavailable",
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
        <div className="flex-1">
          <div className="font-medium text-destructive">{title}</div>
          <p className="mt-0.5 text-muted-foreground">{message}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
