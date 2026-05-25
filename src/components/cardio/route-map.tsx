"use client";

import { useMemo } from "react";
import polyline from "@mapbox/polyline";
import { MapContainer, Polyline, TileLayer } from "react-leaflet";
import type { LatLngBoundsExpression, LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";

// Decodes a Strava summary polyline and renders the route on a free OSM map.
export function RouteMap({
  encoded,
  className = "h-72 w-full",
}: {
  encoded?: string | null;
  className?: string;
}) {
  const points = useMemo<LatLngExpression[]>(() => {
    if (!encoded) return [];
    try {
      return polyline.decode(encoded) as LatLngExpression[];
    } catch {
      return [];
    }
  }, [encoded]);

  if (points.length === 0) {
    return (
      <div
        className={`bg-muted text-muted-foreground flex items-center justify-center rounded-lg text-sm ${className}`}
      >
        No GPS route for this activity.
      </div>
    );
  }

  const bounds = points as LatLngBoundsExpression;

  return (
    <MapContainer
      bounds={bounds}
      scrollWheelZoom={false}
      className={`overflow-hidden rounded-lg ${className}`}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Polyline positions={points} pathOptions={{ color: "#ef4444", weight: 4 }} />
    </MapContainer>
  );
}
