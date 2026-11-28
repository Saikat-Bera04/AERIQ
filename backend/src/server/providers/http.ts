import { z } from "zod";
import type { Provider } from "@/contracts";
import { AppError } from "@/server/lib/envelope";
import { cacheGet, cacheSet, checkRateLimit, redis } from "@/server/lib/redis";

export const RawCpcbPayloadSchema = z.object({
  records: z
    .array(
      z
        .object({
          station: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          last_update: z.string().optional(),
          pollutant_id: z.string().optional(),
          avg_value: z.union([z.string(), z.number()]).optional(),
          pollutant_avg: z.union([z.string(), z.number()]).optional(),
          latitude: z.union([z.string(), z.number()]).optional(),
          longitude: z.union([z.string(), z.number()]).optional(),
        })
        .passthrough()
    )
    .default([]),
});

export const RawOpenAqPayloadSchema = z.object({
  results: z
    .array(
      z
        .object({
          id: z.union([z.number(), z.string()]).optional(),
          name: z.string().optional(),
        })
        .passthrough()
    )
    .default([]),
});

export const RawOpenMeteoAqPayloadSchema = z.object({
  hourly: z
    .object({
      time: z.array(z.string()).default([]),
      pm2_5: z.array(z.number().nullable()).optional(),
      pm10: z.array(z.number().nullable()).optional(),
    })
    .passthrough()
    .optional(),
});

export const RawOpenMeteoWeatherPayloadSchema = z.object({
  current: z
    .object({
      time: z.string(),
      temperature_2m: z.number(),
      relative_humidity_2m: z.number(),
      wind_speed_10m: z.number(),
      wind_direction_10m: z.number(),
      precipitation: z.number(),
    })
    .optional(),
  hourly: z.record(z.unknown()).optional(),
});

const PROVIDER_TIMEOUT_MS = 8_000;
const MAX_RETRIES = 2;
const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_PAUSE_SEC = 900; // 15 minutes

async function isCircuitOpen(provider: Provider): Promise<boolean> {
  const open = await cacheGet<string>(`cb:open:${provider}`);
  return Boolean(open);
}

async function recordCircuitSuccess(provider: Provider): Promise<void> {
  if (redis) {
    await redis.del(`cb:failures:${provider}`);
    await redis.del(`cb:open:${provider}`);
  }
}

async function recordCircuitFailure(provider: Provider): Promise<void> {
  const rl = await checkRateLimit(
    `cb:failures:${provider}`,
    CIRCUIT_BREAKER_THRESHOLD - 1,
    CIRCUIT_BREAKER_PAUSE_SEC
  );
  if (!rl.allowed) {
    await cacheSet(`cb:open:${provider}`, "1", CIRCUIT_BREAKER_PAUSE_SEC);
  }
}

export async function fetchProviderJson<T>(
  provider: Provider,
  url: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
  backoffBaseMs = 250
): Promise<T> {
  if (await isCircuitOpen(provider)) {
    throw new AppError(
      "PROVIDER_UNAVAILABLE",
      503,
      `${provider.toUpperCase()} circuit breaker open`
    );
  }

  let lastError: unknown = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
      });
      if (!res.ok) {
        throw new Error(`${provider} HTTP ${res.status}`);
      }
      const raw = await res.json();
      const parsed = schema.safeParse(raw);
      if (!parsed.success) {
        await recordCircuitFailure(provider);
        throw new Error(`${provider} INVALID_PAYLOAD: ${parsed.error.issues[0]?.message ?? "schema mismatch"}`);
      }
      await recordCircuitSuccess(provider);
      return parsed.data;
    } catch (err) {
      lastError = err;
      // Do not retry schema validation errors
      if (err instanceof Error && err.message.includes("INVALID_PAYLOAD")) {
        throw err;
      }
      if (attempt < MAX_RETRIES) {
        const delayMs = backoffBaseMs * 2 ** attempt;
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }

  await recordCircuitFailure(provider);
  throw lastError instanceof Error ? lastError : new Error(`${provider} fetch failed`);
}
