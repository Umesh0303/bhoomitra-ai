import { useEffect, useRef } from "react";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";
import { MapLoading } from "./MapLoading";
import { MapError } from "./MapError";
import type { LatLng } from "@/types/maps";

type Props = {
  center: LatLng;
  zoom?: number;
  className?: string;
  draggableMarker?: boolean;
  onMapClick?: (pos: LatLng) => void;
  onMarkerDragEnd?: (pos: LatLng) => void;
  onZoomChange?: (zoom: number) => void;
  readOnly?: boolean;
};

export function GoogleMap({
  center,
  zoom = 16,
  className = "h-[320px] sm:h-[420px]",
  draggableMarker = true,
  onMapClick,
  onMarkerDragEnd,
  onZoomChange,
  readOnly = false,
}: Props) {
  const { ready, error } = useGoogleMaps();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  // Init map once
  useEffect(() => {
    if (!ready || !containerRef.current || mapRef.current) return;
    const map = new google.maps.Map(containerRef.current, {
      center,
      zoom,
      mapTypeControl: !readOnly,
      streetViewControl: false,
      fullscreenControl: false,
      clickableIcons: false,
      gestureHandling: "greedy",
    });
    mapRef.current = map;

    const marker = new google.maps.Marker({
      position: center,
      map,
      draggable: draggableMarker && !readOnly,
      animation: google.maps.Animation.DROP,
    });
    markerRef.current = marker;

    if (!readOnly) {
      if (onMapClick) {
        map.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
          marker.setPosition(pos);
          onMapClick(pos);
        });
      }
      if (onMarkerDragEnd) {
        marker.addListener("dragend", () => {
          const p = marker.getPosition();
          if (!p) return;
          onMarkerDragEnd({ lat: p.lat(), lng: p.lng() });
        });
      }
      if (onZoomChange) {
        map.addListener("zoom_changed", () => {
          const z = map.getZoom();
          if (typeof z === "number") onZoomChange(z);
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Sync center + marker on prop change
  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    const current = markerRef.current.getPosition();
    if (!current || current.lat() !== center.lat || current.lng() !== center.lng) {
      markerRef.current.setPosition(center);
      mapRef.current.panTo(center);
    }
  }, [center.lat, center.lng]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (mapRef.current.getZoom() !== zoom) mapRef.current.setZoom(zoom);
  }, [zoom]);

  if (error) {
    return (
      <MapError
        title="Google Maps failed to load"
        message={error}
        onRetry={() => window.location.reload()}
      />
    );
  }
  if (!ready) return <MapLoading />;
  return <div ref={containerRef} className={`w-full overflow-hidden rounded-xl border border-border ${className}`} />;
}
