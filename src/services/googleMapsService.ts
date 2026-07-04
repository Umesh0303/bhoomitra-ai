/**
 * Single-instance loader for the Google Maps JavaScript API.
 * Uses loading=async + a global callback per the Google guidance.
 */
let loadPromise: Promise<typeof google> | null = null;

declare global {
  interface Window {
    __bhoomitraInitMap?: () => void;
    google?: typeof google;
  }
}

export function loadGoogleMaps(): Promise<typeof google> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only load in the browser"));
  }
  if (window.google?.maps) return Promise.resolve(window.google);
  if (loadPromise) return loadPromise;

  const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as
    | string
    | undefined;
  const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as
    | string
    | undefined;
  if (!key) {
    return Promise.reject(new Error("Google Maps browser key is not configured"));
  }

  loadPromise = new Promise((resolve, reject) => {
    window.__bhoomitraInitMap = () => {
      if (window.google?.maps) resolve(window.google);
      else reject(new Error("Google Maps failed to initialise"));
    };

    const script = document.createElement("script");
    const params = new URLSearchParams({
      key,
      v: "weekly",
      libraries: "places,marker",
      loading: "async",
      callback: "__bhoomitraInitMap",
    });
    if (channel) params.set("channel", channel);
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("Failed to load Google Maps script"));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
