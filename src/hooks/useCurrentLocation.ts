import { useCallback, useState } from "react";
import type { LatLng } from "@/types/maps";

type State = { loading: boolean; error: string | null };

export function useCurrentLocation() {
  const [state, setState] = useState<State>({ loading: false, error: null });

  const request = useCallback((): Promise<LatLng> => {
    return new Promise((resolve, reject) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        const msg = "Your browser does not support GPS location.";
        setState({ loading: false, error: msg });
        reject(new Error(msg));
        return;
      }
      setState({ loading: true, error: null });
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setState({ loading: false, error: null });
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => {
          const msg =
            err.code === err.PERMISSION_DENIED
              ? "Location permission denied. Enable it in your browser settings."
              : err.code === err.TIMEOUT
                ? "Locating you timed out. Try again."
                : "Could not determine your location.";
          setState({ loading: false, error: msg });
          reject(new Error(msg));
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
      );
    });
  }, []);

  return { ...state, request };
}
