import { useState } from "react";
import { Copy, Check, ExternalLink, MapPin } from "lucide-react";
import { formatCoords, googleMapsUrl } from "@/utils/mapHelpers";

export function AddressCard({
  lat,
  lng,
  formattedAddress,
}: {
  lat: number;
  lng: number;
  formattedAddress?: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(formatCoords(lat, lng));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };
  return (
    <div className="rounded-xl border border-border bg-card/50 p-4 text-sm">
      <div className="flex items-start gap-2">
        <MapPin className="mt-0.5 h-4 w-4 text-primary" />
        <div className="flex-1">
          {formattedAddress && <div className="font-medium">{formattedAddress}</div>}
          <div className="mt-1 text-xs text-muted-foreground">{formatCoords(lat, lng)}</div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copy}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium hover:bg-muted"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy coordinates"}
        </button>
        <a
          href={googleMapsUrl(lat, lng)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium hover:bg-muted"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Open in Google Maps
        </a>
      </div>
    </div>
  );
}
