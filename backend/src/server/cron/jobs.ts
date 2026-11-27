import { lt } from "drizzle-orm";
import { db } from "@/db";
import { readings, sessions } from "@/db/schema";

export async function runIngestObservations() {
  return { job: "ingest-observations", status: "ok", touchedStations: 0 };
}

export async function runIngestForecast() {
  return { job: "ingest-forecast", status: "ok", updatedLocations: 0 };
}

export async function runRefreshPlans() {
  return { job: "refresh-plans", status: "ok", markedStale: 0 };
}

export async function runStationsSync() {
  return { job: "stations-sync", status: "ok", synced: 0 };
}

export async function runCleanup(now = new Date()) {
  const cutoffReadings = new Date(now.getTime() - 400 * 86400 * 1000);
  const cutoffForecasts = new Date(now.getTime() - 7 * 86400 * 1000);

  if (process.env.USE_MOCKS === "true") {
    return {
      job: "cleanup",
      status: "ok",
      cutoffReadings: cutoffReadings.toISOString(),
      cutoffForecasts: cutoffForecasts.toISOString(),
    };
  }

  await db.delete(readings).where(lt(readings.observedAt, cutoffReadings));
  await db.delete(sessions).where(lt(sessions.expires, now));

  return {
    job: "cleanup",
    status: "ok",
    cutoffReadings: cutoffReadings.toISOString(),
    cutoffForecasts: cutoffForecasts.toISOString(),
  };
}
