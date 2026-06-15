"use client";

import "leaflet/dist/leaflet.css";

import type {
  LatLngExpression,
  LayerGroup,
  Map as LeafletMap,
} from "leaflet";
import { useEffect, useRef, useState } from "react";

import type { City } from "@/lib/types";
import type { Journey, TransportMode } from "./types";

interface RouteMapProps {
  cities: City[];
  journey: Journey | null;
}

const LINE_COLOR: Record<TransportMode, string> = {
  flight: "#0284c7", // sky-600
  bus: "#d97706", // amber-600
  train: "#7c3aed", // violet-600
};

/** Quadratic-bezier arc points, so flight legs curve like Rome2Rio. */
function arcPoints(
  a: [number, number],
  b: [number, number],
): [number, number][] {
  const [lat1, lng1] = a;
  const [lat2, lng2] = b;
  const mx = (lat1 + lat2) / 2;
  const my = (lng1 + lng2) / 2;
  const dx = lat2 - lat1;
  const dy = lng2 - lng1;
  const curvature = 0.18;
  const cx = mx - dy * curvature;
  const cy = my + dx * curvature;
  const points: [number, number][] = [];
  for (let t = 0; t <= 1.0001; t += 0.05) {
    const lat = (1 - t) ** 2 * lat1 + 2 * (1 - t) * t * cx + t ** 2 * lat2;
    const lng = (1 - t) ** 2 * lng1 + 2 * (1 - t) * t * cy + t ** 2 * lng2;
    points.push([lat, lng]);
  }
  return points;
}

export function RouteMap({ cities, journey }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const [ready, setReady] = useState(false);

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;
      const map = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: false,
      }).setView([46, 6], 4);
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        { subdomains: "abcd", maxZoom: 19, attribution: "© OpenStreetMap, © CARTO" },
      ).addTo(map);
      layerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setReady(true);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
      setReady(false);
    };
  }, []);

  // Redraw the active route whenever it (or the city list) changes.
  useEffect(() => {
    if (!ready) return;
    void (async () => {
      const L = (await import("leaflet")).default;
      const map = mapRef.current;
      const layer = layerRef.current;
      if (!map || !layer) return;
      layer.clearLayers();

      const coords = new Map<string, [number, number]>(
        cities.map((c) => [c.name.toLowerCase(), [c.latitude, c.longitude]]),
      );

      if (!journey) {
        map.setView([46, 6], 4);
        return;
      }

      const bounds: [number, number][] = [];
      const seenCity = new Set<string>();

      const addStop = (city: string, point: [number, number]) => {
        if (seenCity.has(city)) return;
        seenCity.add(city);
        L.circleMarker(point, {
          radius: 5,
          color: "#1e293b",
          weight: 2,
          fillColor: "#ffffff",
          fillOpacity: 1,
        })
          .bindTooltip(city, { direction: "top", offset: [0, -4] })
          .addTo(layer);
      };

      journey.segments.forEach((segment) => {
        const a = coords.get(segment.origin_city.toLowerCase());
        const b = coords.get(segment.destination_city.toLowerCase());
        if (!a || !b) return;
        const color = LINE_COLOR[segment.transport_type];
        const path: LatLngExpression[] =
          segment.transport_type === "flight" ? arcPoints(a, b) : [a, b];
        L.polyline(path, {
          color,
          weight: 3,
          opacity: 0.9,
          dashArray: segment.transport_type === "flight" ? "6 7" : undefined,
        }).addTo(layer);
        addStop(segment.origin_city, a);
        addStop(segment.destination_city, b);
        bounds.push(a, b);
      });

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [48, 48], maxZoom: 7 });
      }
    })();
  }, [ready, journey, cities]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full bg-slate-100"
      role="img"
      aria-label="Map of the selected journey route"
    />
  );
}
