import { useCallback, useRef, useState } from "react";
import { GoogleMap } from "./GoogleMap";
import { SearchLocationInput } from "./SearchLocationInput";
import { CurrentLocationButton } from "./CurrentLocationButton";
import { AddressCard } from "./AddressCard";
import { useReverseGeocoding } from "@/hooks/useReverseGeocoding";
import type { FarmLocation, LatLng, ParsedAddress } from "@/types/maps";

const DEFAULT_CENTER: LatLng = { lat: 12.2958, lng: 76.6394 }; // Mysuru, Karnataka

type Props = {
  value: Partial<FarmLocation> | null;
  onChange: (loc: Partial<FarmLocation>) => void;
};

export function FarmLocationPicker({ value, onChange }: Props) {
  const [center, setCenter] = useState<LatLng>(
    value?.lat != null && value?.lng != null
      ? { lat: value.lat, lng: value.lng }
      : DEFAULT_CENTER,
  );
  const [zoom, setZoom] = useState<number>(value?.map_zoom ?? 15);
  const [address, setAddress] = useState<string>(value?.formatted_address ?? "");
  const [pending, setPending] = useState(false);
  const { lookup } = useReverseGeocoding();
  const debounceRef = useRef<number | null>(null);

  const commitAddress = useCallback(
    (parsed: ParsedAddress | null, pos: LatLng, z: number) => {
      onChange({
        lat: pos.lat,
        lng: pos.lng,
        map_zoom: z,
        formatted_address: parsed?.formatted_address ?? "",
        village: parsed?.village ?? value?.village ?? "",
        district: parsed?.district ?? value?.district ?? "",
        state: parsed?.state ?? value?.state ?? "",
        country: parsed?.country ?? value?.country ?? "",
        postal_code: parsed?.postal_code ?? value?.postal_code ?? "",
        google_place_id: parsed?.google_place_id ?? "",
      });
    },
    [onChange, value?.country, value?.district, value?.postal_code, value?.state, value?.village],
  );

  const resolveFromCoords = useCallback(
    (pos: LatLng, z: number) => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(async () => {
        try {
          setPending(true);
          const parsed = await lookup(pos);
          setAddress(parsed?.formatted_address ?? "");
          commitAddress(parsed, pos, z);
        } catch (e) {
          console.warn("Reverse geocode failed", e);
          commitAddress(null, pos, z);
        } finally {
          setPending(false);
        }
      }, 350);
    },
    [commitAddress, lookup],
  );

  const handleSearch = (r: LatLng & ParsedAddress & { zoom?: number }) => {
    const pos = { lat: r.lat, lng: r.lng };
    const z = r.zoom ?? 16;
    setCenter(pos);
    setZoom(z);
    setAddress(r.formatted_address);
    commitAddress(r, pos, z);
  };

  const handleGps = (pos: LatLng) => {
    setCenter(pos);
    setZoom(17);
    resolveFromCoords(pos, 17);
  };

  const handleMapChange = (pos: LatLng) => {
    setCenter(pos);
    resolveFromCoords(pos, zoom);
  };

  const handleZoom = (z: number) => {
    setZoom(z);
    if (value?.lat != null && value?.lng != null) {
      onChange({ ...value, map_zoom: z });
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <SearchLocationInput onSelect={handleSearch} />
        <CurrentLocationButton onLocated={handleGps} />
      </div>
      <GoogleMap
        center={center}
        zoom={zoom}
        onMapClick={handleMapChange}
        onMarkerDragEnd={handleMapChange}
        onZoomChange={handleZoom}
      />
      {value?.lat != null && value?.lng != null ? (
        <AddressCard
          lat={value.lat}
          lng={value.lng}
          formattedAddress={pending ? "Resolving address…" : address || null}
        />
      ) : (
        <p className="text-xs text-muted-foreground">
          Search a location, use current location, or tap the map to pin your farm.
        </p>
      )}
    </div>
  );
}
