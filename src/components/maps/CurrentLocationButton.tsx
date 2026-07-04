import { Loader2, LocateFixed } from "lucide-react";
import { useCurrentLocation } from "@/hooks/useCurrentLocation";
import type { LatLng } from "@/types/maps";

export function CurrentLocationButton({ onLocated }: { onLocated: (p: LatLng) => void }) {
  const { loading, error, request } = useCurrentLocation();
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={loading}
        onClick={() => request().then(onLocated).catch(() => {})}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-background px-3 text-sm font-medium hover:bg-muted disabled:opacity-70"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
        Use current location
      </button>
      {error && <span className="text-[11px] text-destructive">{error}</span>}
    </div>
  );
}
