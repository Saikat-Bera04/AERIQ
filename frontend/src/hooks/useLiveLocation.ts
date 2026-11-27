"use client";

import { useCallback, useEffect, useState } from "react";
import type { AqiCategory } from "@/lib/format";
import { api } from "@/lib/api";

export interface SyncedLocationState {
  id: string;
  city: string;
  station: string;
  provider: string;
  aqi: number | null;
  category: AqiCategory;
  lat: number;
  lng: number;
  observedAt: string;
  syncedAt: string;
  autoSync: boolean;
}

const STORAGE_KEY = "aeriq_live_location";
const SYNC_EVENT = "aeriq:location-sync";

export function roundTo500m(lat: number, lng: number) {
  return {
    lat: Number((Math.round(lat / 0.005) * 0.005).toFixed(4)),
    lng: Number((Math.round(lng / 0.005) * 0.005).toFixed(4)),
  };
}

export function mapCategorySlug(slug: string | null | undefined): AqiCategory {
  switch (slug) {
    case "good":
      return "Good";
    case "satisfactory":
      return "Satisfactory";
    case "moderate":
      return "Moderate";
    case "poor":
      return "Poor";
    case "very_poor":
      return "Very Poor";
    case "severe":
      return "Severe";
    default:
      return "Unavailable";
  }
}

export function useLiveLocation() {
  const [location, setLocation] = useState<SyncedLocationState | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const readStored = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          setLocation(JSON.parse(raw) as SyncedLocationState);
        }
      } catch {
        // ignore
      }
    };
    const raf = requestAnimationFrame(readStored);
    const onSyncEvent = (e: Event) => {
      const detail = (e as CustomEvent<SyncedLocationState>).detail;
      if (detail) setLocation(detail);
    };
    window.addEventListener(SYNC_EVENT, onSyncEvent);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener(SYNC_EVENT, onSyncEvent);
    };
  }, []);

  const commitLocation = useCallback((next: SyncedLocationState) => {
    setLocation(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: next }));
    } catch {
      // ignore
    }
  }, []);

  const syncCoordinates = useCallback(
    async (
      rawLat: number,
      rawLng: number,
      opts?: { city?: string; autoSync?: boolean }
    ) => {
      const rounded = roundTo500m(rawLat, rawLng);
      setSyncing(true);
      setError(null);

      try {
        const { data } = await api.post<{
          location: {
            id: string;
            city: string;
            roundedPoint: { lat: number; lng: number };
            autoSync: boolean;
            syncedAt: string;
          };
          station: { name: string; provider: string };
          aqi: { aqi: number | null; category: string | null; windowEnd: string };
        }>("/api/v1/locations/sync", {
          lat: rounded.lat,
          lng: rounded.lng,
          city: opts?.city,
          autoSync: opts?.autoSync ?? location?.autoSync ?? false,
        });

        commitLocation({
          id: data.location.id,
          city: data.location.city,
          station: data.station.name.toUpperCase(),
          provider: data.station.provider.toUpperCase(),
          aqi: data.aqi.aqi,
          category: mapCategorySlug(data.aqi.category),
          lat: data.location.roundedPoint.lat,
          lng: data.location.roundedPoint.lng,
          observedAt: data.aqi.windowEnd,
          syncedAt: data.location.syncedAt,
          autoSync: data.location.autoSync,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to sync location.");
      } finally {
        setSyncing(false);
      }
    },
    [commitLocation, location]
  );

  const syncByInput = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) return;

      const coordMatch = /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/.exec(trimmed);
      if (coordMatch) {
        await syncCoordinates(Number(coordMatch[1]), Number(coordMatch[2]), {
          autoSync: location?.autoSync ?? false,
        });
        return;
      }

      // Send city hint to backend sync
      await syncCoordinates(location?.lat ?? 22.575, location?.lng ?? 88.365, {
        city: trimmed,
        autoSync: location?.autoSync ?? false,
      });
    },
    [location?.autoSync, location?.lat, location?.lng, syncCoordinates]
  );

  const syncBrowserOnce = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Geolocation is not supported in this browser.");
      return;
    }
    setSyncing(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void syncCoordinates(pos.coords.latitude, pos.coords.longitude, {
          autoSync: location?.autoSync ?? false,
        });
      },
      () => {
        setSyncing(false);
        setError("Location permission denied. Enter a city or coordinates.");
      },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 12_000 }
    );
  }, [location?.autoSync, syncCoordinates]);

  const toggleAutoSync = useCallback(
    (enabled: boolean) => {
      if (!location) return;
      commitLocation({ ...location, autoSync: enabled });
    },
    [commitLocation, location]
  );

  useEffect(() => {
    if (!location?.autoSync) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const rounded = roundTo500m(pos.coords.latitude, pos.coords.longitude);
        if (rounded.lat !== location.lat || rounded.lng !== location.lng) {
          void syncCoordinates(rounded.lat, rounded.lng, { autoSync: true });
        }
      },
      () => {
        setError("Live tracking paused — browser location unavailable.");
      },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 15_000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [location?.autoSync, location?.lat, location?.lng, syncCoordinates]);

  return {
    location,
    syncing,
    error,
    commitLocation,
    syncCoordinates,
    syncByInput,
    syncBrowserOnce,
    toggleAutoSync,
  };
}
