import { z } from "zod";

export const FreshnessSchema = z.enum(["fresh", "aging", "stale"]);
export type Freshness = z.infer<typeof FreshnessSchema>;

export const ProviderSchema = z.enum(["cpcb", "openaq", "openmeteo"]);
export type Provider = z.infer<typeof ProviderSchema>;

export const PollutantSchema = z.enum([
  "pm25",
  "pm10",
  "no2",
  "o3",
  "so2",
  "co",
  "nh3",
  "pb",
]);
export type Pollutant = z.infer<typeof PollutantSchema>;

export const ReadingKindSchema = z.enum(["observation", "forecast"]);
export type ReadingKind = z.infer<typeof ReadingKindSchema>;

export const AveragingSchema = z.enum(["hourly", "8h", "24h", "instant"]);
export type Averaging = z.infer<typeof AveragingSchema>;

export const ReadingSchema = z.object({
  pollutant: PollutantSchema,
  value: z.number().finite().nonnegative(),
  unit: z.enum(["µg/m³", "mg/m³"]),
  averaging: AveragingSchema,
  provider: ProviderSchema,
  stationId: z.string().min(1),
  stationName: z.string().min(1),
  observedAt: z.string().datetime({ offset: true }),
  kind: ReadingKindSchema,
  freshness: FreshnessSchema,
});
export type Reading = z.infer<typeof ReadingSchema>;

export const ProviderOutageNoticeSchema = z.object({
  code: z.literal("provider_outage"),
  provider: z.string(),
  lastSuccessAt: z.string().datetime({ offset: true }).nullable(),
});

export const AiUnavailableNoticeSchema = z.object({
  code: z.literal("AI_UNAVAILABLE"),
  message: z.string(),
});

export const NoticeSchema = z.union([
  ProviderOutageNoticeSchema,
  AiUnavailableNoticeSchema,
]);
export type Notice = z.infer<typeof NoticeSchema>;

export const ResponseMetaSchema = z.object({
  dataAsOf: z.string().datetime({ offset: true }),
  freshnessThresholds: z.object({
    freshMin: z.number().int().positive(),
    agingMin: z.number().int().positive(),
  }),
  notices: z.array(NoticeSchema).default([]),
});
export type ResponseMeta = z.infer<typeof ResponseMetaSchema>;

export const ErrorCodeSchema = z.enum([
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "VALIDATION_FAILED",
  "RATE_LIMITED",
  "PROVIDER_UNAVAILABLE",
  "AI_UNAVAILABLE",
  "INTERNAL",
]);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const ApiErrorSchema = z.object({
  ok: z.literal(false),
  error: z.object({
    code: ErrorCodeSchema,
    message: z.string(),
    fields: z.record(z.string()).optional(),
    retryAfterSec: z.number().int().nonnegative().optional(),
    lastSuccessAt: z.string().datetime({ offset: true }).nullable().optional(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export function apiSuccessSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    ok: z.literal(true),
    data: dataSchema,
    meta: ResponseMetaSchema,
  });
}
