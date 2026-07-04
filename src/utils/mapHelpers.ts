import type { ParsedAddress } from "@/types/maps";

type AddressComponent = {
  long_name?: string;
  short_name?: string;
  types?: string[];
};

/** Parse Google Geocoding / Places address_components into our flat shape. */
export function parseAddressComponents(
  components: AddressComponent[] | undefined,
  formattedAddress = "",
  placeId = "",
): ParsedAddress {
  const pick = (type: string): string => {
    const c = components?.find((x) => x.types?.includes(type));
    return c?.long_name ?? "";
  };

  const village =
    pick("locality") ||
    pick("sublocality") ||
    pick("sublocality_level_1") ||
    pick("village") ||
    pick("neighborhood") ||
    pick("administrative_area_level_3") ||
    "";

  const district =
    pick("administrative_area_level_2") ||
    pick("administrative_area_level_3") ||
    "";

  return {
    formatted_address: formattedAddress,
    village,
    district,
    state: pick("administrative_area_level_1"),
    country: pick("country"),
    postal_code: pick("postal_code"),
    google_place_id: placeId,
  };
}

export function formatCoords(lat: number | null | undefined, lng: number | null | undefined) {
  if (lat == null || lng == null) return "";
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

export function googleMapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}
