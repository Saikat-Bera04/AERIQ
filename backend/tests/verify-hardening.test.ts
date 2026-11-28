import type http from "node:http";
import { PassThrough } from "node:stream";
import { beforeEach, describe, expect, it, vi } from "vitest";

let dbShouldFail = false;

const mockState = {
  userId: "user-1",
  familyOwnerId: "user-1",
  reportOwnerId: "user-owner",
  reportFlags: new Set<string>(),
  reportFlagCount: 0,
  reportStatus: "pending" as string,
};

vi.mock("@/db", () => {
  return {
    db: {
      execute: async () => {
        if (dbShouldFail) throw new Error("DB down");
        return [];
      },
      insert: () => ({
        values: async (row: { sessionToken?: string; reportId?: string; userId?: string }) => {
          if (row.reportId && row.userId) {
            mockState.reportFlags.add(`${row.reportId}:${row.userId}`);
          }
          return {
            returning: async () => [row],
            onConflictDoUpdate: async () => [row],
          };
        },
      }),
      query: {
        providerStatus: {
          findMany: async () => [],
          findFirst: async () => undefined,
        },
        sessions: {
          findFirst: async () => ({
            sessionToken: "hash",
            userId: mockState.userId,
            expires: new Date(Date.now() + 60_000),
          }),
        },
        users: {
          findFirst: async () => ({
            id: mockState.userId,
            email: "test@example.com",
            name: "Test User",
            role: "user",
            avatarColour: "#10291a",
            passwordHash: "hash",
          }),
        },
        profiles: { findFirst: async () => ({ userId: mockState.userId, lifestyle: "professional", activities: [], onboardedAt: new Date() }) },
        locations: { findFirst: async () => ({ id: "loc-1", userId: mockState.userId, city: "Kolkata", label: "Home", roundedPoint: { lat: 22.575, lng: 88.365 }, nearestStationId: "st-1", isDefault: true }) },
        stations: { findFirst: async () => ({ id: "st-1", name: "Bidhannagar", city: "Kolkata", provider: "cpcb" }) },
        aqiSnapshots: { findFirst: async () => ({ stationId: "st-1", aqi: 120, category: "moderate", dominantPollutant: "pm25", subIndices: [], windowEnd: new Date(), computedAt: new Date(), engineVersion: "cpcb-naqi-2014.1", unavailableReason: null }) },
        weatherReadings: { findFirst: async () => null },
        familyMembers: { findMany: async () => [] },
        plans: { findMany: async () => [] },
        communityReports: {
          findFirst: async () => ({
            id: "rep-1",
            userId: mockState.reportOwnerId,
            flagCount: mockState.reportFlagCount,
            status: mockState.reportStatus,
          }),
        },
        reportFlags: {
          findFirst: async () => {
            return mockState.reportFlags.has(`rep-1:${mockState.userId}`)
              ? { id: "flag-1", reportId: "rep-1", userId: mockState.userId }
              : undefined;
          },
        },
      },
      select: () => ({
        from: () => ({
          where: () => ({
            orderBy: () => {
              const rows = [
                {
                  windowEnd: new Date("2026-11-28T05:00:00Z"),
                  aqi: 120,
                  category: "moderate",
                },
              ];
              return Object.assign(Promise.resolve(rows), {
                limit: async () => [],
              });
            },
          }),
        }),
      }),
      update: () => ({
        set: (vals: { flagCount?: number; status?: string; name?: string; expires?: Date }) => ({
          where: () => {
            if (vals.flagCount !== undefined) mockState.reportFlagCount = vals.flagCount;
            if (vals.status !== undefined) mockState.reportStatus = vals.status;
            return {
              returning: async () => {
                if (vals.name !== undefined && mockState.userId !== mockState.familyOwnerId) {
                  return [];
                }
                return [
                  {
                    id: "rep-1",
                    flagCount: mockState.reportFlagCount,
                    status: mockState.reportStatus,
                    name: vals.name ?? "Member",
                    ageGroup: "adult",
                    lifestyle: "professional",
                  },
                ];
              },
            };
          },
        }),
      }),
      delete: () => ({ where: async () => [] }),
    },
  };
});

vi.mock("@/server/lib/privacy", async () => {
  const actual = await vi.importActual<typeof import("@/server/lib/privacy")>("@/server/lib/privacy");
  return {
    ...actual,
    verifyPassword: vi.fn(async () => true),
    createSession: vi.fn(async () => "raw-session-token-32bytes-minimum"),
    validateAndSlideSession: vi.fn(async () => mockState.userId),
  };
});

vi.mock("@/server/providers/openmeteo", () => ({
  fetchLatest: vi.fn(async () => ({
    airQuality: {
      provider: "openmeteo",
      raw: {
        hourly: {
          time: ["2026-11-28T06:00Z", "2026-11-28T07:00Z"],
          pm2_5: [35, 45],
        },
      },
    },
    weather: { provider: "openmeteo", raw: { current: null, hourly: {} } },
  })),
}));

import { handleRequest } from "@/server/http/router";

async function invoke(opts: {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
}) {
  const reqStream = new PassThrough() as unknown as http.IncomingMessage;
  reqStream.method = opts.method;
  reqStream.url = opts.url;
  reqStream.headers = Object.fromEntries(
    Object.entries(opts.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v])
  );
  (reqStream as unknown as { socket: { remoteAddress: string } }).socket = {
    remoteAddress: "127.0.0.1",
  };

  let statusCode = 200;
  const resHeaders: Record<string, string | string[]> = {};
  const chunks: Buffer[] = [];
  let resolveDone!: () => void;
  const done = new Promise<void>((r) => {
    resolveDone = r;
  });

  const res = {
    get statusCode() {
      return statusCode;
    },
    set statusCode(v: number) {
      statusCode = v;
    },
    writeHead(status: number, headers?: Record<string, string | string[]>) {
      statusCode = status;
      if (headers) {
        for (const [k, v] of Object.entries(headers)) {
          resHeaders[k.toLowerCase()] = v;
        }
      }
      return this;
    },
    write(chunk: string | Buffer) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      return true;
    },
    end(chunk?: string | Buffer) {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      resolveDone();
      return this;
    },
  } as unknown as http.ServerResponse;

  const p = handleRequest(reqStream, res);
  if (opts.body !== undefined) {
    (reqStream as unknown as PassThrough).end(JSON.stringify(opts.body));
  } else {
    (reqStream as unknown as PassThrough).end();
  }
  await Promise.all([p, done]);

  const rawSetCookie = resHeaders["set-cookie"];
  const setCookies = Array.isArray(rawSetCookie)
    ? rawSetCookie
    : rawSetCookie
      ? [rawSetCookie]
      : [];

  return {
    status: statusCode,
    setCookies,
    json: JSON.parse(Buffer.concat(chunks).toString("utf8")),
  };
}

describe("Verification pass — CSRF, Cookies, Health, Forecast, Family PATCH, Flagging", () => {
  beforeEach(() => {
    dbShouldFail = false;
    mockState.userId = "user-1";
    mockState.familyOwnerId = "user-1";
    mockState.reportOwnerId = "user-owner";
    mockState.reportFlags.clear();
    mockState.reportFlagCount = 0;
    mockState.reportStatus = "pending";
    process.env.CRON_SECRET = "test-cron-secret";
    process.env.APP_URL = "https://aeriq-silk.vercel.app";
    process.env.ALLOWED_PREVIEW_ORIGIN = "^https://aeriq-.*\\.vercel\\.app$";
    process.env.NODE_ENV = "test";
  });

  it("cron POST with no Origin + valid bearer -> 200; wrong bearer -> 401", async () => {
    const okRes = await invoke({
      method: "POST",
      url: "/api/cron/refresh-plans",
      headers: { Authorization: "Bearer test-cron-secret" },
    });
    expect(okRes.status).toBe(200);

    const badRes = await invoke({
      method: "POST",
      url: "/api/cron/refresh-plans",
      headers: { Authorization: "Bearer wrong-secret" },
    });
    expect(badRes.status).toBe(401);
  });

  it("browser POST from ALLOWED_PREVIEW_ORIGIN is allowed; disallowed origin -> 403", async () => {
    const authHeaders = {
      "Content-Type": "application/json",
      Cookie: "aeriq_session=raw-session-token-32bytes-minimum; aeriq_csrf=csrf123",
      "x-csrf-token": "csrf123",
    };

    const previewRes = await invoke({
      method: "PATCH",
      url: "/api/v1/family/fam-1",
      headers: { ...authHeaders, Origin: "https://aeriq-git-preview.vercel.app" },
      body: { name: "Updated" },
    });
    expect(previewRes.status).toBe(200);

    const evilRes = await invoke({
      method: "PATCH",
      url: "/api/v1/family/fam-1",
      headers: { ...authHeaders, Origin: "https://evil.vercel.app" },
      body: { name: "Updated" },
    });
    expect(evilRes.status).toBe(403);
  });

  it("Set-Cookie has no Domain, Path=/, SameSite=Lax, and Secure only in production", async () => {
    const devLogin = await invoke({
      method: "POST",
      url: "/api/v1/auth/login",
      headers: { "Content-Type": "application/json" },
      body: { email: "test@example.com", password: "Password123!" },
    });
    expect(devLogin.status).toBe(200);
    for (const c of devLogin.setCookies) {
      expect(c).not.toMatch(/Domain=/i);
      expect(c).toContain("Path=/");
      expect(c).toContain("SameSite=Lax");
      expect(c).not.toContain("Secure");
    }

    process.env.NODE_ENV = "production";
    const prodLogin = await invoke({
      method: "POST",
      url: "/api/v1/auth/login",
      headers: { "Content-Type": "application/json" },
      body: { email: "test@example.com", password: "Password123!" },
    });
    for (const c of prodLogin.setCookies) {
      expect(c).not.toMatch(/Domain=/i);
      expect(c).toContain("Path=/");
      expect(c).toContain("SameSite=Lax");
      expect(c).toContain("Secure");
    }
  });

  it("/health/live returns 200 with no DB; /health returns 503 when DB is down", async () => {
    dbShouldFail = true;
    const liveRes = await invoke({ method: "GET", url: "/health/live" });
    expect(liveRes.status).toBe(200);

    const healthRes = await invoke({ method: "GET", url: "/health" });
    expect(healthRes.status).toBe(503);
    expect(healthRes.json.data.db).toBe("error");
  });

  it("GET /api/v1/aqi/forecast returns kind='forecast' & provider='Open-Meteo'; /aqi/history returns observations only", async () => {
    const headers = { Cookie: "aeriq_session=raw-session-token-32bytes-minimum" };
    const fRes = await invoke({ method: "GET", url: "/api/v1/aqi/forecast?hours=2", headers });
    expect(fRes.status).toBe(200);
    expect(fRes.json.data.points.length).toBeGreaterThan(0);
    for (const pt of fRes.json.data.points) {
      expect(pt.kind).toBe("forecast");
      expect(pt.provider).toBe("Open-Meteo");
    }

    const hRes = await invoke({ method: "GET", url: "/api/v1/aqi/history?range=24h", headers });
    expect(hRes.status).toBe(200);
    for (const pt of hRes.json.data.points) {
      expect(pt.kind).toBe("observation");
    }
  });

  it("PATCH /api/v1/family/:id succeeds for owner and returns 404 for another user", async () => {
    const headers = {
      "Content-Type": "application/json",
      Cookie: "aeriq_session=raw-session-token-32bytes-minimum; aeriq_csrf=c1",
      "x-csrf-token": "c1",
    };

    const okRes = await invoke({
      method: "PATCH",
      url: "/api/v1/family/fam-1",
      headers,
      body: { name: "Owner Edit" },
    });
    expect(okRes.status).toBe(200);

    mockState.userId = "user-2";
    const otherRes = await invoke({
      method: "PATCH",
      url: "/api/v1/family/fam-1",
      headers,
      body: { name: "Hacker Edit" },
    });
    expect(otherRes.status).toBe(404);
  });

  it("flagging: owner cannot flag own report (403); duplicate flag counts once (422); 3rd distinct user removes report", async () => {
    const makeHeaders = () => ({
      Cookie: "aeriq_session=raw-session-token-32bytes-minimum; aeriq_csrf=c1",
      "x-csrf-token": "c1",
    });

    // Owner cannot flag own report
    mockState.userId = "user-owner";
    const ownerFlag = await invoke({
      method: "POST",
      url: "/api/v1/community/reports/rep-1/flag",
      headers: makeHeaders(),
    });
    expect(ownerFlag.status).toBe(403);

    // User A flags once -> count 1
    mockState.userId = "user-a";
    const flag1 = await invoke({
      method: "POST",
      url: "/api/v1/community/reports/rep-1/flag",
      headers: makeHeaders(),
    });
    expect(flag1.status).toBe(200);
    expect(flag1.json.data.flagCount).toBe(1);

    // User A flags again -> 422, count stays 1
    const flag1Dup = await invoke({
      method: "POST",
      url: "/api/v1/community/reports/rep-1/flag",
      headers: makeHeaders(),
    });
    expect(flag1Dup.status).toBe(422);
    expect(mockState.reportFlagCount).toBe(1);

    // User B flags -> count 2
    mockState.userId = "user-b";
    const flag2 = await invoke({
      method: "POST",
      url: "/api/v1/community/reports/rep-1/flag",
      headers: makeHeaders(),
    });
    expect(flag2.status).toBe(200);
    expect(flag2.json.data.flagCount).toBe(2);
    expect(flag2.json.data.status).toBe("pending");

    // User C flags -> count 3, status becomes "removed"
    mockState.userId = "user-c";
    const flag3 = await invoke({
      method: "POST",
      url: "/api/v1/community/reports/rep-1/flag",
      headers: makeHeaders(),
    });
    expect(flag3.status).toBe(200);
    expect(flag3.json.data.flagCount).toBe(3);
    expect(flag3.json.data.status).toBe("removed");
  });
});
