"use client";

import { useCallback, useEffect, useState } from "react";
import type { AqiCategory } from "@/lib/format";

export interface SyncedLocationState {
  id: string;
  city: string;
  station: string;
  provider: string;
  aqi: number;
  category: AqiCategory;
  lat: number;
  lng: number;
  observedAt: string;
  syncedAt: string;
  autoSync: boolean;
}

const CITY_CATALOG: Omit<SyncedLocationState, "syncedAt" | "autoSync">[] = [
  {
    id: "loc-kol",
    city: "Kolkata",
    station: "RABINDRA BHARATI",
    provider: "CPCB",
    aqi: 212,
    category: "Poor",
    lat: 22.575,
    lng: 88.365,
    observedAt: "2026-11-27T03:00:00.000Z",
  },
  {
    id: "loc-del",
    city: "New Delhi",
    station: "LODHI ROAD",
    provider: "CPCB",
    aqi: 286,
    category: "Poor",
    lat: 28.59,
    lng: 77.225,
    observedAt: "2026-11-27T03:00:00.000Z",
  },
  {
    id: "loc-blr",
    city: "Bengaluru",
    station: "BTM LAYOUT",
    provider: "CPCB",
    aqi: 74,
    category: "Satisfactory",
    lat: 12.915,
    lng: 77.61,
    observedAt: "2026-11-27T03:00:00.000Z",
  },
  {
    id: "loc-bom",
    city: "Mumbai",
    station: "BANDRA KURLA COMPLEX",
    provider: "CPCB",
    aqi: 138,
    category: "Moderate",
    lat: 19.065,
    lng: 72.87,
    observedAt: "2026-11-27T03:00:00.000Z",
  },
  {
    id: "loc-maa",
    city: "Chennai",
    station: "ALANDUR",
    provider: "CPCB",
    aqi: 86,
    category: "Satisfactory",
    lat: 13.0,
    lng: 80.205,
    observedAt: "2026-11-27T03:00:00.000Z",
  },
  {
    id: "loc-hyd",
    city: "Hyderabad",
    station: "JUBILEE HILLS",
    provider: "CPCB",
    aqi: 118,
    category: "Moderate",
    lat: 17.43,
    lng: 78.405,
    observedAt: "2026-11-27T03:00:00.000Z",
  },
];

const STORAGE_KEY = "aeriq_live_location";
const SYNC_EVENT = "aeriq:location-sync";

export function roundTo500m(lat: number, lng: number) {
  return {
    lat: Number((Math.round(lat / 0.005) * 0.005).toFixed(4)),
    lng: Number((Math.round(lng / 0.005) * 0.005).toFixed(4)),
  };
}

function findNearestCity(lat: number, lng: number) {
  let best = CITY_CATALOG[0];
  let bestDist = Infinity;
  for (const c of CITY_CATALOG) {
    const d = (c.lat - lat) ** 2 + (c.lng - lng) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}

const DEFAULT_STATE: SyncedLocationState = {
  ...CITY_CATALOG[0],
  syncedAt: "2026-11-27T03:00:00.000Z",
  autoSync: false,
};

export function useLiveLocation() {
  const [location, setLocation] = useState<SyncedLocationState>(DEFAULT_STATE);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hydrate from localStorage and subscribe to cross-component sync events
  useEffect(() => {
    const readStored = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          setLocation(JSON.parse(raw) as SyncedLocationState);
        }
      } catch {
        // ignore storage errors
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
      // ignore storage errors
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
        const useMocks = process.env.NEXT_PUBLIC_USE_MOCKS !== "false";
        const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

        if (!useMocks) {
          const res = await fetch(`${apiUrl}/api/v1/locations/sync`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              lat: rounded.lat,
              lng: rounded.lng,
              city: opts?.city,
              autoSync: opts?.autoSync ?? location.autoSync,
            }),
          });
          if (res.ok) {
            const json = await res.json();
            if (json.ok && json.data) {
              const d = json.data;
              commitLocation({
                id: d.location.id,
                city: d.location.city,
                station: d.station.name.toUpperCase(),
                provider: String(d.station.provider).toUpperCase(),
                aqi: d.aqi.aqi ?? 0,
                category: location.category,
                lat: d.location.roundedPoint.lat,
                lng: d.location.roundedPoint.lng,
                observedAt: d.aqi.windowEnd,
                syncedAt: d.location.syncedAt,
                autoSync: d.location.autoSync,
              });
              return;
            }
          }
        }

        const nearest = findNearestCity(rounded.lat, rounded.lng);
        const nowIso = new Date().toISOString();
        commitLocation({
          ...nearest,
          city: opts?.city ?? nearest.city,
          lat: rounded.lat,
          lng: rounded.lng,
          observedAt: nowIso,
          syncedAt: nowIso,
          autoSync: opts?.autoSync ?? location.autoSync,
        });
      } catch {
        setError("Unable to sync location right now.");
      } finally {
        setSyncing(false);
      }
    },
    [commitLocation, location.autoSync, location.category]
  );

  const syncByInput = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) return;

      // Support "lat, lng" input
      const coordMatch = /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/.exec(trimmed);
      if (coordMatch) {
        await syncCoordinates(Number(coordMatch[1]), Number(coordMatch[2]), {
          autoSync: location.autoSync,
        });
        return;
      }

      // Match city name
      const match = CITY_CATALOG.find((c) =>
        c.city.toLowerCase().includes(trimmed.toLowerCase())
      );
      if (match) {
        const nowIso = new Date().toISOString();
        commitLocation({
          ...match,
          observedAt: nowIso,
          syncedAt: nowIso,
          autoSync: location.autoSync,
        });
        return;
      }

      setError("City not found. Try Kolkata, New Delhi, Bengaluru, Mumbai, Chennai, Hyderabad, or lat, lng.");
    },
    [commitLocation, location.autoSync, syncCoordinates]
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
          autoSync: location.autoSync,
        });
      },
      () => {
        setSyncing(false);
        setError("Location permission denied. Enter a city or coordinates instead.");
      },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 12_000 }
    );
  }, [location.autoSync, syncCoordinates]);

  const toggleAutoSync = useCallback(
    (enabled: boolean) => {
      commitLocation({ ...location, autoSync: enabled });
    },
    [commitLocation, location]
  );

  // Watch browser position when autoSync is enabled
  useEffect(() => {
    if (!location.autoSync) return;
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
  }, [location.autoSync, location.lat, location.lng, syncCoordinates]);

  return {
    location,
    syncing,
    error,
    syncCoordinates,
    syncByInput,
    syncBrowserOnce,
    toggleAutoSync,
    catalog: CITY_CATALOG,
  };
}
