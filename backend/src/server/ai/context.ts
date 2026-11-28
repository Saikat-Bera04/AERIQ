import type { AqiResult, Reading, WeatherPoint } from "@/contracts";

export interface AiContext {
  location?: {
    city: string;
    areaLabel: string;
    stationName: string;
    distanceKm: number;
  };
  air?: {
    aqi: number | null;
    category: AqiResult["category"];
    dominantPollutants: string[];
    unavailableReason: string | null;
    provider: string;
    observedAt: string;
    freshness: string;
  };
  pollutants?: {
    pollutant: string;
    value: number;
    unit: string;
    averaging: string;
    observedAt: string;
    kind: string;
  }[];
  forecast?: {
    hourLabel: string;
    category: string;
    kind: "forecast";
  }[];
  weather?: {
    tempC: number;
    rhPct: number;
    windKph: number;
    windDirDeg: number;
    observedAt: string;
  } | null;
  profile?: {
    firstName: string;
    lifestyle: string;
    transportModes: string[];
    activities: { name: string; preferredTime: string }[];
  };
  family?: {
    ageGroup: string;
    lifestyle: string;
  }[];
  plan?: {
    title: string;
    setting: string;
    expectedCategory: string | null;
  }[];
  savedScenarios?: {
    baselineMode: string;
    avoidedPerWeek: number;
    avoidedPerYear: number;
  }[];
  advisoryCodes?: string[];
  advisories?: { code: string; activity: string; text: string }[];
  limits: string[];
}

export function buildContext(
  raw: {
    location: NonNullable<AiContext["location"]>;
    aqi: AqiResult;
    readings: Reading[];
    forecast: NonNullable<AiContext["forecast"]>;
    weather: WeatherPoint | null;
    profile: NonNullable<AiContext["profile"]>;
    family: { ageGroup: string; lifestyle: string }[];
    plan?: NonNullable<AiContext["plan"]>;
    savedScenarios?: NonNullable<AiContext["savedScenarios"]>;
    advisories?: { code: string; activity: string; text: string }[];
  },
  excludeContext: string[] = []
): AiContext {
  const excluded = new Set(excludeContext);
  const limits: string[] = [];

  if (raw.aqi.aqi === null && raw.aqi.unavailableReason) {
    limits.push(raw.aqi.unavailableReason);
  }
  for (const r of raw.readings) {
    if (r.freshness === "stale") {
      limits.push(`${r.pollutant.toUpperCase()} reading is stale (${r.observedAt})`);
    }
  }
  if (raw.forecast.length > 0) {
    limits.push("Future hourly windows are Open-Meteo model forecasts, not station observations.");
  }

  const ctx: AiContext = { limits };

  if (!excluded.has("location")) ctx.location = raw.location;
  if (!excluded.has("air")) {
    ctx.air = {
      aqi: raw.aqi.aqi,
      category: raw.aqi.category,
      dominantPollutants: raw.aqi.dominantPollutants,
      unavailableReason: raw.aqi.unavailableReason,
      provider: raw.aqi.provider,
      observedAt: raw.aqi.windowEnd,
      freshness: raw.readings[0]?.freshness ?? "fresh",
    };
  }
  if (!excluded.has("pollutants")) {
    ctx.pollutants = raw.readings.map((r) => ({
      pollutant: r.pollutant,
      value: r.value,
      unit: r.unit,
      averaging: r.averaging,
      observedAt: r.observedAt,
      kind: r.kind,
    }));
  }
  if (!excluded.has("forecast")) ctx.forecast = raw.forecast.slice(0, 12);
  if (!excluded.has("weather")) {
    ctx.weather = raw.weather
      ? {
          tempC: raw.weather.tempC,
          rhPct: raw.weather.rhPct,
          windKph: raw.weather.windKph,
          windDirDeg: raw.weather.windDirDeg,
          observedAt: raw.weather.observedAt,
        }
      : null;
  }
  if (!excluded.has("profile")) ctx.profile = raw.profile;
  if (!excluded.has("family")) {
    // First names removed for privacy
    ctx.family = raw.family.map((m) => ({
      ageGroup: m.ageGroup,
      lifestyle: m.lifestyle,
    }));
  }
  if (!excluded.has("plan") && raw.plan) ctx.plan = raw.plan;
  if (!excluded.has("savedScenarios") && raw.savedScenarios) {
    ctx.savedScenarios = raw.savedScenarios;
  }
  if (raw.advisories && raw.advisories.length > 0) {
    ctx.advisories = raw.advisories;
    ctx.advisoryCodes = raw.advisories.map((a) => a.code);
  }

  return ctx;
}
