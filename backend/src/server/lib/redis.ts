import { Redis } from "@upstash/redis";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

export const redis =
  redisUrl && redisToken
    ? new Redis({ url: redisUrl, token: redisToken })
    : null;

// In-memory fallback for local dev / tests when Upstash env vars are not set
const memoryBuckets = new Map<string, { count: number; resetAt: number }>();
const memoryCache = new Map<string, { value: unknown; expiresAt: number }>();
const memoryLocks = new Map<string, number>();

export async function acquireLock(
  key: string,
  ttlSeconds = 600
): Promise<boolean> {
  if (redis) {
    const res = await redis.set(key, "1", { nx: true, ex: ttlSeconds });
    return res === "OK";
  }
  const now = Date.now();
  const existing = memoryLocks.get(key);
  if (existing && existing > now) {
    return false;
  }
  memoryLocks.set(key, now + ttlSeconds * 1000);
  return true;
}

export async function releaseLock(key: string): Promise<void> {
  if (redis) {
    await redis.del(key);
    return;
  }
  memoryLocks.delete(key);
}

export async function pingRedis(): Promise<"ok" | "unconfigured" | "error"> {
  if (!redis) return "unconfigured";
  try {
    const res = await redis.ping();
    return res === "PONG" ? "ok" : "error";
  } catch {
    return "error";
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (redis) {
    return (await redis.get<T>(key)) ?? null;
  }
  const hit = memoryCache.get(key);
  if (!hit || hit.expiresAt < Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  return hit.value as T;
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number
): Promise<void> {
  if (redis) {
    await redis.set(key, value, { ex: ttlSeconds });
    return;
  }
  memoryCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export async function checkRateLimit(
  bucketKey: string,
  maxRequests: number,
  windowSeconds: number
): Promise<{ allowed: boolean; retryAfterSec: number }> {
  if (redis) {
    const count = await redis.incr(bucketKey);
    if (count === 1) {
      await redis.expire(bucketKey, windowSeconds);
    }
    const ttl = await redis.ttl(bucketKey);
    return {
      allowed: count <= maxRequests,
      retryAfterSec: Math.max(1, ttl > 0 ? ttl : windowSeconds),
    };
  }

  const now = Date.now();
  const cur = memoryBuckets.get(bucketKey);
  if (!cur || cur.resetAt <= now) {
    memoryBuckets.set(bucketKey, {
      count: 1,
      resetAt: now + windowSeconds * 1000,
    });
    return { allowed: true, retryAfterSec: 0 };
  }
  cur.count += 1;
  return {
    allowed: cur.count <= maxRequests,
    retryAfterSec: Math.max(1, Math.ceil((cur.resetAt - now) / 1000)),
  };
}
