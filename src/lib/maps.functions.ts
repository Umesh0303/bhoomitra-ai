import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

type ReverseGeocodeResult = {
  formatted_address: string;
  place_id: string;
  address_components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
};

/**
 * Server-side reverse geocode via the Lovable Google Maps connector gateway.
 * The browser key is NOT authorized for the Geocoding API, so this must run
 * on the server with the connector's server key.
 */
export const reverseGeocode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { lat: number; lng: number }) => {
    if (
      typeof data?.lat !== "number" ||
      typeof data?.lng !== "number" ||
      Math.abs(data.lat) > 90 ||
      Math.abs(data.lng) > 180
    ) {
      throw new Error("Invalid coordinates");
    }
    return { lat: data.lat, lng: data.lng };
  })
  .handler(async ({ data }): Promise<ReverseGeocodeResult | null> => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const gmKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!lovableKey || !gmKey) {
      throw new Error("Google Maps connector is not configured");
    }
    const url = `${GATEWAY_URL}/maps/api/geocode/json?latlng=${data.lat},${data.lng}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": gmKey,
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Geocoding failed (${res.status}): ${body.slice(0, 200)}`);
    }
    const json = (await res.json()) as {
      status: string;
      results?: ReverseGeocodeResult[];
    };
    if (json.status !== "OK" || !json.results?.length) return null;
    return json.results[0];
  });
