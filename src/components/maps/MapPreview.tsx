import { GoogleMap } from "./GoogleMap";
import type { LatLng } from "@/types/maps";

export function MapPreview({ lat, lng, zoom = 15 }: LatLng & { zoom?: number }) {
  return (
    <GoogleMap
      center={{ lat, lng }}
      zoom={zoom}
      readOnly
      draggableMarker={false}
      className="h-[260px] sm:h-[320px]"
    />
  );
}
