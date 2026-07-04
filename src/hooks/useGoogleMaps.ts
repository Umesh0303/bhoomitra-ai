import { useEffect, useState } from "react";
import { loadGoogleMaps } from "@/services/googleMapsService";

export function useGoogleMaps() {
  const [ready, setReady] = useState<boolean>(
    typeof window !== "undefined" && !!window.google?.maps,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready) return;
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [ready]);

  return { ready, error };
}
