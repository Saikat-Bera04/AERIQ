import { and, desc, eq, gte, lt } from "drizzle-orm";
import { db } from "@/db";
import {
  aqiSnapshots,
  locations,
  plans,
  providerStatus,
  readings,
  sessions,
  stations,
  weatherReadings,
} from "@/db/schema";
import { computeCpcbAqi } from "@/server/engines/aqi";
import { fetchLatest as fetchCpcb } from "@/server/providers/cpcb";
import { fetchLatest as fetchOpenAq } from "@/server/providers/openaq";
import { fetchLatest as fetchOpenMeteo } from "@/server/providers/openmeteo";
import { normaliseSamples, type RawProviderSample } from "@/server/providers/normalise";
import type { Pollutant } from "@/contracts";

interface CpcbRecord {
  station?: string;
  city?: string;
  state?: string;
  last_update?: string;
  pollutant_id?: string;
  avg_value?: string | number;
  pollutant_avg?: string | number;
  latitude?: string | number;
  longitude?: string | number;
}

async function recordProviderSuccess(provider: "cpcb" | "openaq" | "openmeteo") {
  await db
    .insert(providerStatus)
    .values({
      provider,
      lastSuccessAt: new Date(),
      consecutiveFailures: 0,
    })
    .onConflictDoUpdate({
      target: providerStatus.provider,
      set: { lastSuccessAt: new Date(), consecutiveFailures: 0 },
    });
}

async function recordProviderFailure(
  provider: "cpcb" | "openaq" | "openmeteo",
  code: string
) {
  const existing = await db.query.providerStatus.findFirst({
    where: eq(providerStatus.provider, provider),
  });
  await db
    .insert(providerStatus)
    .values({
      provider,
      lastErrorAt: new Date(),
      lastErrorCode: code,
      consecutiveFailures: (existing?.consecutiveFailures ?? 0) + 1,
    })
    .onConflictDoUpdate({
      target: providerStatus.provider,
      set: {
        lastErrorAt: new Date(),
        lastErrorCode: code,
        consecutiveFailures: (existing?.consecutiveFailures ?? 0) + 1,
      },
    });
}

export async function runStationsSync(cities = ["Kolkata", "Delhi", "Bengaluru", "Mumbai"]) {
  let synced = 0;

  for (const city of cities) {
    try {
      const { raw } = await fetchCpcb({ city });
      const payload = raw as { records?: CpcbRecord[] };
      const records = payload.records ?? [];

      const seenStations = new Set<string>();
      for (const rec of records) {
        const name = rec.station?.trim();
        if (!name || seenStations.has(name)) continue;
        seenStations.add(name);

        const lat = Number(rec.latitude);
        const lng = Number(rec.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

        const providerStationId = `cpcb-${city.toLowerCase()}-${name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")}`;

        await db
          .insert(stations)
          .values({
            provider: "cpcb",
            providerStationId,
            name,
            city: rec.city?.trim() || city,
            state: rec.state?.trim() || "India",
            point: { lat, lng },
            active: true,
          })
          .onConflictDoUpdate({
            target: [stations.provider, stations.providerStationId],
            set: { name, active: true },
          });
        synced++;
      }
      await recordProviderSuccess("cpcb");
    } catch (err) {
      await recordProviderFailure("cpcb", err instanceof Error ? err.message : "SYNC_ERROR");
    }
  }

  return { job: "stations-sync", status: "ok", synced };
}

export async function runIngestObservations() {
  const activeStations = await db.query.stations.findMany({
    where: eq(stations.active, true),
  });

  if (activeStations.length === 0) {
    await runStationsSync(["Kolkata", "Delhi"]);
  }

  const allStations = await db.query.stations.findMany({
    where: eq(stations.active, true),
  });

  const cities = Array.from(new Set(allStations.map((s) => s.city)));
  const touchedStationIds = new Set<string>();

  for (const city of cities) {
    try {
      const { raw } = await fetchCpcb({ city });
      const records = (raw as { records?: CpcbRecord[] }).records ?? [];
      const samples: RawProviderSample[] = [];

      const cityStations = allStations.filter((s) => s.city === city);
      const stationByName = new Map(cityStations.map((s) => [s.name.toLowerCase(), s]));

      for (const rec of records) {
        const stName = rec.station?.trim();
        if (!stName) continue;
        const station = stationByName.get(stName.toLowerCase());
        if (!station) continue;

        const val = Number(rec.avg_value ?? rec.pollutant_avg);
        if (!Number.isFinite(val) || !rec.pollutant_id || !rec.last_update) continue;

        const pid = rec.pollutant_id.trim().toLowerCase();
        const isEightHour = pid === "co" || pid === "o3" || pid === "ozone";
        samples.push({
          provider: "cpcb",
          stationId: station.id,
          stationName: station.name,
          pollutantRaw: rec.pollutant_id,
          value: val,
          // data.gov.in CPCB dataset reports all pollutants (including CO) in µg/m³
          unitRaw: "µg/m³",
          averaging: isEightHour ? "8h" : "24h",
          observedAtRaw: rec.last_update,
          kind: "observation",
        });
      }

      const { accepted } = normaliseSamples(samples);
      if (accepted.length > 0) {
        await db
          .insert(readings)
          .values(
            accepted.map((r) => ({
              stationId: r.stationId,
              pollutant: r.pollutant,
              value: String(r.value),
              unit: r.unit,
              averaging: r.averaging,
              observedAt: new Date(r.observedAt),
              kind: r.kind,
              rawHash: r.rawHash,
            }))
          )
          .onConflictDoNothing();
        for (const r of accepted) {
          touchedStationIds.add(r.stationId);
        }
      }

      await recordProviderSuccess("cpcb");
    } catch (err) {
      await recordProviderFailure("cpcb", err instanceof Error ? err.message : "INGEST_ERROR");
    }
  }

  // Also fetch OpenAQ nearby for saved locations (never feeds CPCB AQI)
  const savedLocs = await db.query.locations.findMany();
  for (const loc of savedLocs.slice(0, 5)) {
    try {
      await fetchOpenAq({
        lat: loc.roundedPoint.lat,
        lng: loc.roundedPoint.lng,
      });
      await recordProviderSuccess("openaq");
    } catch (err) {
      await recordProviderFailure("openaq", err instanceof Error ? err.message : "OPENAQ_ERROR");
    }
  }

  // Compute AQI snapshot for each touched CPCB station
  const now = new Date();
  const since = new Date(now.getTime() - 24 * 3600 * 1000);
  for (const stationId of touchedStationIds) {
    const st = allStations.find((s) => s.id === stationId);
    if (!st || st.provider !== "cpcb") continue;

    const rows = await db
      .select()
      .from(readings)
      .where(
        and(
          eq(readings.stationId, stationId),
          eq(readings.kind, "observation"),
          gte(readings.observedAt, since)
        )
      )
      .orderBy(desc(readings.observedAt));

    const aqiRes = computeCpcbAqi(
      rows.map((row) => ({
        pollutant: row.pollutant as Pollutant,
        value: Number(row.value),
        unit: row.unit,
        averaging: row.averaging as "hourly" | "8h" | "24h" | "instant",
        observedAt: row.observedAt.toISOString(),
        provider: "cpcb",
        stationId: st.id,
        stationName: st.name,
      })),
      now.toISOString(),
      { stationId: st.id, stationName: st.name }
    );

    await db.insert(aqiSnapshots).values({
      stationId: st.id,
      windowEnd: new Date(aqiRes.windowEnd),
      aqi: aqiRes.aqi,
      category: aqiRes.category,
      dominantPollutant: aqiRes.dominantPollutants[0] ?? null,
      subIndices: aqiRes.subIndices,
      unavailableReason: aqiRes.unavailableReason,
      engineVersion: aqiRes.engineVersion,
    });
  }

  return {
    job: "ingest-observations",
    status: "ok",
    touchedStations: touchedStationIds.size,
  };
}

export async function runIngestForecast() {
  const savedLocs = await db.query.locations.findMany();
  const distinctKeys = new Map<string, { lat: number; lng: number }>();
  for (const loc of savedLocs) {
    const key = `${loc.roundedPoint.lat},${loc.roundedPoint.lng}`;
    distinctKeys.set(key, loc.roundedPoint);
  }
  if (distinctKeys.size === 0) {
    distinctKeys.set("22.575,88.365", { lat: 22.575, lng: 88.365 });
  }

  let updatedLocations = 0;
  for (const [locationKey, pt] of distinctKeys) {
    try {
      const { weather } = await fetchOpenMeteo(pt);
      const wx = weather.raw as {
        current?: {
          time: string;
          temperature_2m: number;
          relative_humidity_2m: number;
          wind_speed_10m: number;
          wind_direction_10m: number;
          precipitation: number;
        };
      };
      if (wx.current) {
        await db.insert(weatherReadings).values({
          locationKey,
          observedAt: new Date(wx.current.time),
          kind: "observation",
          tempC: String(wx.current.temperature_2m),
          rhPct: String(wx.current.relative_humidity_2m),
          windKph: String(wx.current.wind_speed_10m),
          windDirDeg: Math.round(wx.current.wind_direction_10m),
          precipMm: String(wx.current.precipitation),
          provider: "openmeteo",
        });
      }
      await recordProviderSuccess("openmeteo");
      updatedLocations++;
    } catch (err) {
      await recordProviderFailure("openmeteo", err instanceof Error ? err.message : "FORECAST_ERROR");
    }
  }

  return { job: "ingest-forecast", status: "ok", updatedLocations };
}

export async function runRefreshPlans() {
  const updated = await db
    .update(plans)
    .set({ status: "stale", updatedAt: new Date() })
    .where(eq(plans.status, "current"))
    .returning({ id: plans.id });

  return { job: "refresh-plans", status: "ok", markedStale: updated.length };
}

export async function runCleanup(now = new Date()) {
  const cutoffReadings = new Date(now.getTime() - 400 * 86400 * 1000);
  const cutoffForecasts = new Date(now.getTime() - 7 * 86400 * 1000);

  await db.delete(readings).where(lt(readings.observedAt, cutoffReadings));
  await db
    .delete(readings)
    .where(and(eq(readings.kind, "forecast"), lt(readings.observedAt, cutoffForecasts)));
  await db.delete(sessions).where(lt(sessions.expires, now));

  return {
    job: "cleanup",
    status: "ok",
    cutoffReadings: cutoffReadings.toISOString(),
    cutoffForecasts: cutoffForecasts.toISOString(),
  };
}
