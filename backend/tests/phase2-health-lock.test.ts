import { describe, expect, it, vi } from "vitest";
import { acquireLock, releaseLock } from "@/server/lib/redis";

describe("Phase 2 — Redis locks", () => {
  it("acquireLock prevents concurrent acquisition until released", async () => {
    const key = "cron:lock:test-phase2";
    await releaseLock(key);
    expect(await acquireLock(key, 600)).toBe(true);
    expect(await acquireLock(key, 600)).toBe(false);
    await releaseLock(key);
    expect(await acquireLock(key, 600)).toBe(true);
    await releaseLock(key);
  });

  it("withCronLock returns { skipped: 'locked' } when locked", async () => {
    vi.resetModules();
    const { acquireLock: lockFn, releaseLock: unlockFn } = await import("@/server/lib/redis");
    const { runRefreshPlans } = await import("@/server/cron/jobs");
    await lockFn("cron:lock:refresh-plans", 600);
    const res = await runRefreshPlans();
    expect(res).toEqual({ skipped: "locked" });
    await unlockFn("cron:lock:refresh-plans");
  });
});
