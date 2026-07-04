import { useEffect, useRef, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";
import { parseAddressComponents } from "@/utils/mapHelpers";
import type { FarmLocation, LatLng, ParsedAddress } from "@/types/maps";

type Suggestion = {
  placeId: string;
  primary: string;
  secondary: string;
  prediction: google.maps.places.AutocompletePrediction | unknown;
};

type Props = {
  onSelect: (loc: LatLng & ParsedAddress & { zoom?: number }) => void;
  placeholder?: string;
};

export function SearchLocationInput({ onSelect, placeholder = "Search village, town, or landmark…" }: Props) {
  const { ready } = useGoogleMaps();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const sessionRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setItems([]);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      try {
        setBusy(true);
        const placesLib = (await google.maps.importLibrary("places")) as google.maps.PlacesLibrary;
        const { AutocompleteSuggestion, AutocompleteSessionToken } = placesLib;
        if (!sessionRef.current) {
          sessionRef.current = new AutocompleteSessionToken();
        }
        const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: query,
          sessionToken: sessionRef.current,
          includedRegionCodes: ["in"],
        });
        setItems(
          suggestions
            .map((s: google.maps.places.AutocompleteSuggestion): Suggestion | null => {
              const p = s.placePrediction;
              if (!p) return null;
              return {
                placeId: p.placeId,
                primary: p.mainText?.text ?? p.text?.text ?? "",
                secondary: p.secondaryText?.text ?? "",
                prediction: p,
              };
            })
            .filter((x): x is Suggestion => x !== null),
        );
        setOpen(true);
      } catch (e) {
        console.warn("Autocomplete failed", e);
        setItems([]);
      } finally {
        setBusy(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, ready]);

  const choose = async (s: Suggestion) => {
    try {
      setOpen(false);
      setBusy(true);
      const pred = s.prediction as {
        toPlace: () => google.maps.places.Place;
      };
      const place = pred.toPlace();
      await place.fetchFields({
        fields: ["location", "formattedAddress", "addressComponents", "id"],
      });
      const loc = place.location;
      if (!loc) return;
      const components = (place.addressComponents ?? []).map((c) => ({
        long_name: c.longText ?? "",
        short_name: c.shortText ?? "",
        types: c.types ?? [],
      }));
      const parsed = parseAddressComponents(
        components,
        place.formattedAddress ?? "",
        place.id ?? s.placeId,
      );
      onSelect({
        lat: loc.lat(),
        lng: loc.lng(),
        ...parsed,
        zoom: 16,
      } satisfies FarmLocation & { zoom: number });
      setQuery(place.formattedAddress ?? s.primary);
      sessionRef.current = null; // end session after selection
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => items.length && setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          disabled={!ready}
          placeholder={ready ? placeholder : "Loading maps…"}
          className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-9 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        {busy && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>
      {open && items.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-border bg-popover p-1 shadow-lg">
          {items.map((it) => (
            <li key={it.placeId}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(it)}
                className="flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <Search className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                <span className="flex-1">
                  <span className="font-medium">{it.primary}</span>
                  {it.secondary && (
                    <span className="ml-1 text-xs text-muted-foreground">{it.secondary}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
