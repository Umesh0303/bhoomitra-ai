import { Loader2 } from "lucide-react";

export function MapLoading({ label = "Loading Google Maps…" }: { label?: string }) {
  return (
    <div className="grid h-[320px] place-items-center rounded-xl border border-dashed border-border bg-muted/30 text-sm text-muted-foreground sm:h-[420px]">
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        {label}
      </div>
    </div>
  );
}
