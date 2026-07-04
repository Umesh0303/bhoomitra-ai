import { useCallback, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { reverseGeocode } from "@/lib/maps.functions";
import { parseAddressComponents } from "@/utils/mapHelpers";
import type { LatLng, ParsedAddress } from "@/types/maps";

const cache = new Map<string, ParsedAddress | null>();

function key({ lat, lng }: LatLng) {
  return `${lat.toFixed(5)},${lng.toFixed(5)}`;
}

export function useReverseGeocoding() {
  const callFn = useServerFn(reverseGeocode);
  const inflight = useRef<Map<string, Promise<ParsedAddress | null>>>(new Map());

  const lookup = useCallback(
    async (coords: LatLng): Promise<ParsedAddress | null> => {
      const k = key(coords);
      if (cache.has(k)) return cache.get(k) ?? null;
      const running = inflight.current.get(k);
      if (running) return running;

      const p = (async () => {
        try {
          const res = await callFn({ data: coords });
          if (!res) {
            cache.set(k, null);
            return null;
          }
          const parsed = parseAddressComponents(
            res.address_components,
            res.formatted_address,
            res.place_id,
          );
          cache.set(k, parsed);
          return parsed;
        } finally {
          inflight.current.delete(k);
        }
      })();

      inflight.current.set(k, p);
      return p;
    },
    [callFn],
  );

  return { lookup };
}
