import { z } from "zod";
import { PollutantSchema, ReadingKindSchema, ReadingSchema } from "./common";

export const AqiCategoryEnum = z.enum([
  "good",
  "satisfactory",
  "moderate",
  "poor",
  "very_poor",
  "severe",
]);
export type AqiCategorySlug = z.infer<typeof AqiCategoryEnum>;

export const SubIndexSchema = z.object({
  pollutant: PollutantSchema,
  value: z.number().nullable(),
  average: z.number().nullable(),
  subIndex: z.number().int().min(0).max(500).nullable(),
  hoursAvailable: z.number().int().nonnegative(),
  hoursRequired: z.number().int().positive(),
  status: z.enum(["ok", "incomplete"]),
});
export type SubIndex = z.infer<typeof SubIndexSchema>;

export const AqiResultSchema = z.object({
  aqi: z.number().int().min(0).max(500).nullable(),
  category: AqiCategoryEnum.nullable(),
  dominantPollutants: z.array(PollutantSchema),
  subIndices: z.array(SubIndexSchema),
  unavailableReason: z.string().nullable(),
  windowEnd: z.string().datetime({ offset: true }),
  computedAt: z.string().datetime({ offset: true }),
  provider: z.literal("cpcb"),
  stationId: z.string(),
  stationName: z.string(),
  engineVersion: z.string(),
});
export type AqiResult = z.infer<typeof AqiResultSchema>;

export const WeatherPointSchema = z.object({
  observedAt: z.string().datetime({ offset: true }),
  kind: ReadingKindSchema,
  tempC: z.number(),
  rhPct: z.number().min(0).max(100),
  windKph: z.number().nonnegative(),
  windDirDeg: z.number().min(0).max(360),
  precipMm: z.number().nonnegative(),
  provider: z.literal("openmeteo"),
});
export type WeatherPoint = z.infer<typeof WeatherPointSchema>;

export const AqiCurrentResponseSchema = z.object({
  aqi: AqiResultSchema,
  pollutants: z.array(ReadingSchema),
  weather: WeatherPointSchema.nullable(),
  station: z.object({
    id: z.string(),
    name: z.string(),
    city: z.string(),
    provider: z.string(),
  }),
});

export const AqiHistoryResponseSchema = z.object({
  range: z.enum(["24h", "7d", "30d"]),
  points: z.array(
    z.object({
      t: z.string().datetime({ offset: true }),
      aqi: z.number().int().min(0).max(500).nullable(),
      category: AqiCategoryEnum.nullable(),
      kind: z.literal("observation"),
    })
  ),
});

export const AqiForecastResponseSchema = z.object({
  hours: z.number().int().positive(),
  points: z.array(
    z.object({
      t: z.string().datetime({ offset: true }),
      value: z.number().nonnegative(),
      category: AqiCategoryEnum,
      provider: z.literal("Open-Meteo"),
      kind: z.literal("forecast"),
    })
  ),
});
