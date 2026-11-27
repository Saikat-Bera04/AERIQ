"use client";

import React, { useEffect, useRef } from "react";
import type { CommunityReport, OfficialStationPin } from "@/types";
import { Mist } from "@/components/ui-aeriq";

export function LeafletMap({
  center = [22.5726, 88.3639],
  zoom = 12,
  reports,
  stations,
  userLocation,
  selectedReportId,
  onSelectReport,
  onMapClick,
  height = "100%",
}: {
  center?: [number, number];
  zoom?: number;
  reports: CommunityReport[];
  stations: OfficialStationPin[];
  userLocation?: { lat: number; lng: number; label?: string } | null;
  selectedReportId?: string | null;
  onSelectReport?: (id: string) => void;
  onMapClick?: (lat: number, lng: number) => void;
  height?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const layerRef = useRef<import("leaflet").LayerGroup | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const L = (await import("leaflet")).default;
      if (!mounted || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        center,
        zoom,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
      }).addTo(map);

      if (onMapClick) {
        map.on("click", (e: import("leaflet").LeafletMouseEvent) => {
          onMapClick(e.latlng.lat, e.latlng.lng);
        });
      }

      const layer = L.layerGroup().addTo(map);
      mapRef.current = map;
      layerRef.current = layer;
    })();

    return () => {
      mounted = false;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !layerRef.current || !mapRef.current) return;
      const layer = layerRef.current;
      layer.clearLayers();

      // User's live rounded location (~500 m)
      if (userLocation) {
        const userIcon = L.divIcon({
          className: "",
          iconSize: [20, 20],
          html: `<div style="width:20px;height:20px;border-radius:999px;background:rgba(198,243,92,0.35);display:flex;align-items:center;justify-content:center;"><span style="width:11px;height:11px;border-radius:999px;background:#10291a;border:2.5px solid #c6f35c;box-shadow:0 0 0 2px #fff"></span></div>`,
        });
        L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
          .bindPopup(
            `<div style="font-family:var(--mono);font-size:10px;text-transform:uppercase"><strong>${userLocation.label ?? "Your area (~500 m)"}</strong><br/>${userLocation.lat}, ${userLocation.lng}</div>`
          )
          .addTo(layer);
        mapRef.current.setView([userLocation.lat, userLocation.lng], zoom);
      }

      // Official monitoring stations: 18px ink squares with white dot
      stations.forEach((st) => {
        const icon = L.divIcon({
          className: "",
          iconSize: [18, 18],
          html: `<div style="width:18px;height:18px;background:#10291a;border-radius:3px;display:flex;align-items:center;justify-content:center;border:1.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.25)"><span style="width:5px;height:5px;background:#fff;border-radius:999px"></span></div>`,
        });
        L.marker([st.lat, st.lng], { icon })
          .bindPopup(
            `<div style="font-family:var(--mono);font-size:10px;text-transform:uppercase"><strong>${st.provider} · ${st.name}</strong><br/>AQI ${st.aqi ?? "N/A"} (${st.category})</div>`
          )
          .addTo(layer);
      });

      // Community reports: lime Hotspot dots
      reports.forEach((rep) => {
        const isSelected = selectedReportId === rep.id;
        const icon = L.divIcon({
          className: "",
          iconSize: [22, 22],
          html: `<div style="width:22px;height:22px;background:#c6f35c;border-radius:999px;display:flex;align-items:center;justify-content:center;border:${isSelected ? "2.5px solid #10291a" : "1.5px solid #10291a"};box-shadow:0 0 0 ${isSelected ? "8px rgba(198,243,92,0.45)" : "0px rgba(198,243,92,0)"}"><span style="width:8px;height:1.5px;background:#10291a;position:absolute"></span><span style="width:1.5px;height:8px;background:#10291a;position:absolute"></span></div>`,
        });
        const marker = L.marker([rep.lat, rep.lng], { icon }).bindPopup(
          `<div style="font-family:var(--sans);font-size:12px;max-width:200px"><strong>${rep.category}</strong> · <em>${rep.status}</em><p style="margin:4px 0 0">${rep.description}</p></div>`
        );
        marker.on("click", () => onSelectReport?.(rep.id));
        marker.addTo(layer);
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [reports, stations, userLocation, zoom, selectedReportId, onSelectReport]);

  return (
    <div className="relative w-full overflow-hidden" style={{ height }}>
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{
          filter: "grayscale(0.7) sepia(0.15) brightness(1.05) contrast(0.95)",
        }}
      />
      <Mist opacity={0.35} />
    </div>
  );
}
