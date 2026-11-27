import { z } from "zod";

export const TransportModeSchema = z.enum([
  "car",
  "two_wheeler",
  "auto",
  "bus",
  "metro",
  "cycling",
  "walking",
]);
export type TransportMode = z.infer<typeof TransportModeSchema>;

export const EmissionFactorSchema = z.object({
  mode: TransportModeSchema,
  kgCo2ePerPkm: z.number().nonnegative(),
  source: z.string(),
  publication: z.string(),
  version: z.string(),
  geography: z.string(),
  occupancyAssumption: z.string(),
});
export type EmissionFactor = z.infer<typeof EmissionFactorSchema>;

export const CommuteSimRequestSchema = z.object({
  distanceKm: z.number().positive().max(300),
  tripsPerWeek: z.number().int().min(1).max(40),
  baselineMode: TransportModeSchema,
  alternativeModes: z.array(TransportModeSchema).min(1).max(3),
});
export type CommuteSimRequest = z.infer<typeof CommuteSimRequestSchema>;

export const CommuteSimResponseSchema = z.object({
  perMode: z.array(
    z.object({
      mode: TransportModeSchema,
      kgPerWeek: z.number().nonnegative(),
      kgPerYear: z.number().nonnegative(),
      isBaseline: z.boolean(),
      label: z.string().optional(),
    })
  ),
  avoidedPerWeek: z.number().nonnegative(),
  avoidedPerYear: z.number().nonnegative(),
  best: TransportModeSchema,
  formula: z.string(),
  assumptions: z.array(EmissionFactorSchema),
  factorVersion: z.string(),
});
export type CommuteSimResponse = z.infer<typeof CommuteSimResponseSchema>;

export const ExposureRequestSchema = z.object({
  locationId: z.string().uuid().optional(),
  segments: z
    .array(
      z.object({
        mode: TransportModeSchema,
        minutes: z.number().int().positive().max(720),
      })
    )
    .min(1),
});

export const ExposureResponseSchema = z.union([
  z.object({
    available: z.literal(true),
    unit: z.literal("µg/m³·h"),
    note: z.literal(
      "This is a planning indicator, not a measured dose or health risk score."
    ),
    perOption: z.array(
      z.object({
        mode: TransportModeSchema,
        indicator: z.number().int().nonnegative(),
      })
    ),
  }),
  z.object({
    available: z.literal(false),
    reason: z.string(),
  }),
]);
export type ExposureResponse = z.infer<typeof ExposureResponseSchema>;

export const SaveScenarioRequestSchema = z.object({
  inputs: CommuteSimRequestSchema,
  result: CommuteSimResponseSchema,
});
