import type { AqiResult, Pollutant, SubIndex } from "@/contracts";
import {
  AQI_ENGINE_VERSION,
  AVERAGING_WINDOW_HOURS,
  CPCB_BREAKPOINTS,
  MIN_HOURS_REQUIRED,
  categoryFromAqi,
} from "./aqi-breakpoints";

export interface StationHourlyReading {
  pollutant: Pollutant;
  value: number;
  unit: string;
  averaging?: "hourly" | "8h" | "24h" | "instant";
  observedAt: string;
  provider: string;
  stationId: string;
  stationName: string;
}

export function computeSubIndex(pollutant: Pollutant, concentration: number): number {
  const bands = CPCB_BREAKPOINTS[pollutant];
  const c = Math.max(0, concentration);

  for (const band of bands) {
    if (c <= band.bHi) {
      // Worked check: PM2.5 at 45 => 50 + (45 - 30) * (100 - 50) / (60 - 30) = 75
      // Note: use continuous iLo floor (0, 50, 100, 200, 300, 400) for linear interpolation
      const iFloor = band.iLo === 0 ? 0 : band.iLo - 1;
      const raw = iFloor + ((c - band.bLo) * (band.iHi - iFloor)) / (band.bHi - band.bLo);
      return Math.min(500, Math.round(raw));
    }
  }
  return 500;
}

export function computeCpcbAqi(
  stationReadings: StationHourlyReading[],
  windowEndIso: string,
  meta: { stationId: string; stationName: string; computedAtIso?: string } = {
    stationId: "unknown",
    stationName: "Unknown",
  }
): AqiResult {
  const windowEndMs = new Date(windowEndIso).getTime();
  const computedAt = meta.computedAtIso ?? new Date(windowEndMs).toISOString();

  // Validate provider & units upfront
  for (const r of stationReadings) {
    if (r.provider !== "cpcb") {
      throw new Error(`Only CPCB readings may feed computeCpcbAqi (got ${r.provider})`);
    }
    if (r.pollutant === "co" && r.unit === "µg/m³") {
      throw new Error("CO must be in mg/m³, not µg/m³");
    }
  }

  const pollutants: Pollutant[] = [
    "pm25",
    "pm10",
    "no2",
    "o3",
    "co",
    "so2",
    "nh3",
    "pb",
  ];

  const subIndices: SubIndex[] = [];

  for (const pollutant of pollutants) {
    const windowHours = AVERAGING_WINDOW_HOURS[pollutant];
    const hoursRequired = MIN_HOURS_REQUIRED[windowHours];
    const windowStartMs = windowEndMs - windowHours * 3600 * 1000;

    const inWindow = stationReadings.filter((r) => {
      if (r.pollutant !== pollutant) return false;
      const t = new Date(r.observedAt).getTime();
      return t > windowStartMs && t <= windowEndMs && Number.isFinite(r.value) && r.value >= 0;
    });

    if (inWindow.length === 0) continue;

    // If CPCB already provided a pre-computed 24h/8h running average (e.g. data.gov.in avg_value),
    // treat it as satisfying the averaging period; otherwise enforce hourly count (16/24h or 6/8h).
    const preAveraged = inWindow.find(
      (r) => r.averaging === "24h" || r.averaging === "8h"
    );
    const effectiveHours = preAveraged ? hoursRequired : inWindow.length;
    const avg = preAveraged
      ? preAveraged.value
      : inWindow.reduce((sum, r) => sum + r.value, 0) / inWindow.length;

    if (effectiveHours < hoursRequired) {
      subIndices.push({
        pollutant,
        value: Number(avg.toFixed(2)),
        average: Number(avg.toFixed(2)),
        subIndex: null,
        hoursAvailable: effectiveHours,
        hoursRequired,
        status: "incomplete",
      });
    } else {
      const idx = computeSubIndex(pollutant, avg);
      subIndices.push({
        pollutant,
        value: Number(avg.toFixed(2)),
        average: Number(avg.toFixed(2)),
        subIndex: idx,
        hoursAvailable: effectiveHours,
        hoursRequired,
        status: "ok",
      });
    }
  }

  const valid = subIndices.filter(
    (s): s is SubIndex & { subIndex: number } =>
      s.status === "ok" && s.subIndex !== null
  );

  const hasPm = valid.some(
    (s) => s.pollutant === "pm25" || s.pollutant === "pm10"
  );

  if (valid.length < 3 || !hasPm) {
    const incompletePm = subIndices.find(
      (s) =>
        (s.pollutant === "pm25" || s.pollutant === "pm10") &&
        s.status === "incomplete"
    );

    let unavailableReason: string;
    if (incompletePm) {
      unavailableReason = `${incompletePm.pollutant.toUpperCase()} averaging period incomplete (${incompletePm.hoursAvailable} of ${incompletePm.hoursRequired} hours)`;
    } else if (!hasPm) {
      unavailableReason = "Neither PM2.5 nor PM10 has sufficient hourly readings";
    } else {
      unavailableReason = `At least 3 pollutants required for CPCB AQI (${valid.length} available)`;
    }

    return {
      aqi: null,
      category: null,
      dominantPollutants: [],
      subIndices,
      unavailableReason,
      windowEnd: windowEndIso,
      computedAt,
      provider: "cpcb",
      stationId: meta.stationId,
      stationName: meta.stationName,
      engineVersion: AQI_ENGINE_VERSION,
    };
  }

  const maxSubIndex = Math.min(
    500,
    Math.max(...valid.map((s) => s.subIndex))
  );
  const dominantPollutants = valid
    .filter((s) => s.subIndex === maxSubIndex)
    .map((s) => s.pollutant);

  return {
    aqi: maxSubIndex,
    category: categoryFromAqi(maxSubIndex),
    dominantPollutants,
    subIndices,
    unavailableReason: null,
    windowEnd: windowEndIso,
    computedAt,
    provider: "cpcb",
    stationId: meta.stationId,
    stationName: meta.stationName,
    engineVersion: AQI_ENGINE_VERSION,
  };
}
