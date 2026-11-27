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

  const syncWithPayload = useCallback(
    async (payload: {
      lat?: number;
      lng?: number;
      city?: string;
      autoSync: boolean;
    }) => {
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
        }>("/api/v1/locations/sync", payload);

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
    [commitLocation]
  );

  const syncCoordinates = useCallback(
    async (
      rawLat: number,
      rawLng: number,
      opts?: { city?: string; autoSync?: boolean }
    ) => {
      const rounded = roundTo500m(rawLat, rawLng);
      await syncWithPayload({
        lat: rounded.lat,
        lng: rounded.lng,
        city: opts?.city,
        autoSync: opts?.autoSync ?? location?.autoSync ?? false,
      });
    },
    [location, syncWithPayload]
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

      // City-only sync so backend resolves the city's station and rounded coordinates
      await syncWithPayload({
        city: trimmed,
        autoSync: location?.autoSync ?? false,
      });
    },
    [location, syncCoordinates, syncWithPayload]
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
      (geoErr) => {
        setSyncing(false);
        if (geoErr.code === 1) {
          setError("Location permission denied. Enter a city or coordinates.");
        } else if (geoErr.code === 3) {
          setError("Location timed out. Enter a city or coordinates.");
        } else {
          setError("Location unavailable. Enter a city or coordinates.");
        }
      },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 }
    );
  }, [location, syncCoordinates]);

  const toggleAutoSync = useCallback(
    (enabled: boolean) => {
      if (!location) return;
      commitLocation({ ...location, autoSync: enabled });
      if (enabled) {
        void syncWithPayload({
          lat: location.lat,
          lng: location.lng,
          city: location.city,
          autoSync: true,
        });
      }
    },
    [commitLocation, location, syncWithPayload]
  );

  // Periodic auto-sync every 60s + optional browser watchPosition when autoSync is enabled
  useEffect(() => {
    if (!location?.autoSync) return;

    const intervalId = window.setInterval(() => {
      void syncWithPayload({
        lat: location.lat,
        lng: location.lng,
        city: location.city,
        autoSync: true,
      });
    }, 60_000);

    let watchId: number | null = null;
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const rounded = roundTo500m(pos.coords.latitude, pos.coords.longitude);
          if (rounded.lat !== location.lat || rounded.lng !== location.lng) {
            void syncCoordinates(rounded.lat, rounded.lng, { autoSync: true });
          }
        },
        () => {
          // Keep periodic city auto-sync running even if browser GPS is blocked
        },
        { enableHighAccuracy: false, maximumAge: 60_000, timeout: 15_000 }
      );
    }

    return () => {
      window.clearInterval(intervalId);
      if (watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [location?.autoSync, location?.city, location?.lat, location?.lng, syncCoordinates, syncWithPayload]);

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
