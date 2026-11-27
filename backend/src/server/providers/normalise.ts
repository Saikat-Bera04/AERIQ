import crypto from "node:crypto";
import { fromZonedTime } from "date-fns-tz";
import {
  ReadingSchema,
  type Averaging,
  type Pollutant,
  type Provider,
  type Reading,
  type ReadingKind,
} from "@/contracts";
import { computeFreshness } from "@/server/engines/freshness";
import { PHYSICAL_CEILINGS, POLLUTANT_MAP } from "./constants";

export interface RawProviderSample {
  provider: Provider;
  stationId: string;
  stationName: string;
  pollutantRaw: string;
  value: number;
  unitRaw: string;
  averaging: Averaging;
  observedAtRaw: string;
  kind: ReadingKind;
}

export interface NormalisedReading extends Reading {
  rawHash: string;
}

export interface NormaliseResult {
  accepted: NormalisedReading[];
  rejected: { raw: RawProviderSample; reason: string }[];
}

export function parseProviderTimestamp(
  raw: string,
  nowMs: number = Date.now()
): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Check if timestamp already includes timezone offset or Z
  const hasZone = /([Zz]|[+-]\d{2}:?\d{2})$/.test(trimmed);
  let date: Date;

  if (hasZone) {
    date = new Date(trimmed);
  } else {
    // Support DD-MM-YYYY HH:mm:ss (data.gov.in CPCB format)
    const dmyMatch = /^(\d{2})-(\d{2})-(\d{4})[ T](\d{2}:\d{2}:\d{2})$/.exec(trimmed);
    const normalized = dmyMatch
      ? `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}T${dmyMatch[4]}`
      : trimmed.replace(" ", "T");
    // Provider times without a zone are treated as IST (Asia/Kolkata) and converted to UTC
    date = fromZonedTime(normalized, "Asia/Kolkata");
  }

  if (Number.isNaN(date.getTime())) return null;

  // Reject times more than 10 minutes in the future
  if (date.getTime() > nowMs + 10 * 60 * 1000) {
    return null;
  }

  return date.toISOString();
}

export function convertToCpcbUnit(
  pollutant: Pollutant,
  value: number,
  unitRaw: string
): { value: number; unit: "µg/m³" | "mg/m³" } | null {
  const u = unitRaw.trim().toLowerCase();

  if (pollutant === "co") {
    if (u === "mg/m3" || u === "mg/m³") {
      return { value, unit: "mg/m³" };
    }
    if (u === "ug/m3" || u === "µg/m³" || u === "μg/m³") {
      // Open-Meteo returns CO in µg/m³, divide by 1,000
      return { value: Number((value / 1000).toFixed(4)), unit: "mg/m³" };
    }
    return null;
  }

  if (u === "ug/m3" || u === "µg/m³" || u === "μg/m³") {
    return { value, unit: "µg/m³" };
  }
  if (u === "mg/m3" || u === "mg/m³") {
    return { value: Number((value * 1000).toFixed(3)), unit: "µg/m³" };
  }
  return null;
}

export function buildRawHash(input: {
  provider: Provider;
  stationId: string;
  pollutant: Pollutant;
  observedAt: string;
  value: number;
}): string {
  return crypto
    .createHash("sha256")
    .update(
      `${input.provider}|${input.stationId}|${input.pollutant}|${input.observedAt}|${input.value}`
    )
    .digest("hex");
}

export function normaliseSamples(
  samples: RawProviderSample[],
  nowMs: number = Date.now()
): NormaliseResult {
  const accepted: NormalisedReading[] = [];
  const rejected: { raw: RawProviderSample; reason: string }[] = [];

  for (const raw of samples) {
    const pollutant = POLLUTANT_MAP[raw.pollutantRaw.trim().toLowerCase()];
    if (!pollutant) {
      rejected.push({ raw, reason: `Unknown pollutant: ${raw.pollutantRaw}` });
      continue;
    }

    if (!Number.isFinite(raw.value) || raw.value < 0) {
      rejected.push({ raw, reason: `Invalid or negative value: ${raw.value}` });
      continue;
    }

    const converted = convertToCpcbUnit(pollutant, raw.value, raw.unitRaw);
    if (!converted) {
      rejected.push({ raw, reason: `Unsupported unit: ${raw.unitRaw}` });
      continue;
    }

    if (converted.value > PHYSICAL_CEILINGS[pollutant]) {
      rejected.push({
        raw,
        reason: `Exceeds physical ceiling (${converted.value} > ${PHYSICAL_CEILINGS[pollutant]})`,
      });
      continue;
    }

    const observedAt =
      raw.kind === "forecast"
        ? new Date(raw.observedAtRaw).toISOString()
        : parseProviderTimestamp(raw.observedAtRaw, nowMs);

    if (!observedAt) {
      rejected.push({
        raw,
        reason: `Invalid or future timestamp: ${raw.observedAtRaw}`,
      });
      continue;
    }

    const candidate = {
      pollutant,
      value: converted.value,
      unit: converted.unit,
      averaging: raw.averaging,
      provider: raw.provider,
      stationId: raw.stationId,
      stationName: raw.stationName,
      observedAt,
      kind: raw.kind,
      freshness: computeFreshness(observedAt, nowMs),
    };

    const parsed = ReadingSchema.safeParse(candidate);
    if (!parsed.success) {
      rejected.push({
        raw,
        reason: `Schema validation failed: ${parsed.error.issues[0]?.message ?? "invalid"}`,
      });
      continue;
    }

    accepted.push({
      ...parsed.data,
      rawHash: buildRawHash({
        provider: parsed.data.provider,
        stationId: parsed.data.stationId,
        pollutant: parsed.data.pollutant,
        observedAt: parsed.data.observedAt,
        value: parsed.data.value,
      }),
    });
  }

  return { accepted, rejected };
}
