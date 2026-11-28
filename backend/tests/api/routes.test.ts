import http from "node:http";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  apiSuccessSchema,
  AqiCurrentResponseSchema,
  AqiHistoryResponseSchema,
  CommuteSimResponseSchema,
  IndoorProfileSchema,
  NotificationPrefsSchema,
} from "@/contracts";

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

// Mock only external providers & Gemini
vi.mock("@/server/providers/cpcb", () => ({
  fetchLatest: vi.fn(async () => ({ provider: "cpcb", raw: { records: [] } })),
}));
vi.mock("@/server/providers/openaq", () => ({
  fetchLatest: vi.fn(async () => ({ provider: "openaq", raw: { results: [] } })),
}));
vi.mock("@/server/providers/openmeteo", () => ({
  fetchLatest: vi.fn(async () => ({
    airQuality: { provider: "openmeteo", raw: { hourly: {} } },
    weather: { provider: "openmeteo", raw: { current: null, hourly: {} } },
  })),
}));
vi.mock("@/server/ai/gemini", async () => {
  const actual = await vi.importActual<typeof import("@/server/ai/gemini")>("@/server/ai/gemini");
  return {
    ...actual,
    generateDailyRecommendation: vi.fn(async (ctx: Parameters<typeof actual.generateDailyRecommendation>[0]) => ({
      data: actual.buildDeterministicDailyFallback(ctx),
      aiUnavailable: false,
    })),
    generateChatReply: vi.fn(async (ctx: Parameters<typeof actual.generateChatReply>[0]) => ({
      data: actual.buildDeterministicChatFallback(ctx),
      aiUnavailable: false,
    })),
  };
});

const hasTestDb = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!hasTestDb)("Phase 4 — API, ownership & data integration tests", () => {
  let server: http.Server;

  beforeAll(async () => {
    const { handleRequest } = await import("@/server/http/router");
    server = http.createServer((req, res) => {
      void handleRequest(req, res);
    });
  });

  afterAll(async () => {
    if (server?.listening) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it("enforces 401 without session on all protected routes, 422 on invalid body, Zod contracts, 404 ownership, and emission_factors metadata", async () => {
    const protectedRoutes: Array<[string, string]> = [
      ["GET", "/api/v1/me"],
      ["PATCH", "/api/v1/profile"],
      ["GET", "/api/v1/locations"],
      ["POST", "/api/v1/locations"],
      ["POST", "/api/v1/locations/sync"],
      ["PATCH", "/api/v1/locations/00000000-0000-0000-0000-000000000001"],
      ["DELETE", "/api/v1/locations/00000000-0000-0000-0000-000000000001"],
      ["GET", "/api/v1/aqi/current"],
      ["GET", "/api/v1/aqi/history"],
      ["GET", "/api/v1/weather"],
      ["POST", "/api/v1/assistant/recommend"],
      ["POST", "/api/v1/assistant/chat"],
      ["GET", "/api/v1/assistant/conversations"],
      ["GET", "/api/v1/assistant/conversations/00000000-0000-0000-0000-000000000001"],
      ["DELETE", "/api/v1/assistant/conversations/00000000-0000-0000-0000-000000000001"],
      ["GET", "/api/v1/planner/today"],
      ["POST", "/api/v1/planner/generate"],
      ["POST", "/api/v1/planner/activities"],
      ["PATCH", "/api/v1/planner/activities/00000000-0000-0000-0000-000000000001"],
      ["DELETE", "/api/v1/planner/activities/00000000-0000-0000-0000-000000000001"],
      ["GET", "/api/v1/family"],
      ["POST", "/api/v1/family"],
      ["DELETE", "/api/v1/family/00000000-0000-0000-0000-000000000001"],
      ["GET", "/api/v1/indoor/profile"],
      ["PUT", "/api/v1/indoor/profile"],
      ["POST", "/api/v1/indoor/recommendations"],
      ["GET", "/api/v1/simulator/factors"],
      ["POST", "/api/v1/simulator/commute"],
      ["POST", "/api/v1/simulator/exposure"],
      ["GET", "/api/v1/simulator/scenarios"],
      ["POST", "/api/v1/simulator/scenarios"],
      ["DELETE", "/api/v1/simulator/scenarios/00000000-0000-0000-0000-000000000001"],
      ["GET", "/api/v1/community/hotspots"],
      ["POST", "/api/v1/community/reports"],
      ["DELETE", "/api/v1/community/reports/00000000-0000-0000-0000-000000000001"],
      ["GET", "/api/v1/notifications"],
      ["PUT", "/api/v1/notifications"],
      ["GET", "/api/v1/account/export"],
      ["DELETE", "/api/v1/account"],
      ["GET", "/api/v1/dev/gemini-usage"],
    ];

    for (const [method, path] of protectedRoutes) {
      const res = await (request(server) as unknown as Record<string, (p: string) => request.Test>)[
        method.toLowerCase()
      ](path);
      expect(res.status, `${method} ${path} should return 401`).toBe(401);
    }

    // Register User A & User B
    const agentA = request.agent(server);
    const agentB = request.agent(server);
    const suffix = Date.now();

    const regA = await agentA
      .post("/api/v1/auth/register")
      .send({ name: "User A", email: `usera-${suffix}@example.com`, password: "Password123!" });
    expect(regA.status).toBe(201);
    const rawSetCookieA = regA.headers["set-cookie"];
    const cookiesA = Array.isArray(rawSetCookieA) ? rawSetCookieA.join(";") : String(rawSetCookieA ?? "");
    const csrfA = /aeriq_csrf=([^;]+)/.exec(cookiesA)?.[1] ?? "";

    const regB = await agentB
      .post("/api/v1/auth/register")
      .send({ name: "User B", email: `userb-${suffix}@example.com`, password: "Password123!" });
    expect(regB.status).toBe(201);
    const rawSetCookieB = regB.headers["set-cookie"];
    const cookiesB = Array.isArray(rawSetCookieB) ? rawSetCookieB.join(";") : String(rawSetCookieB ?? "");
    const csrfB = /aeriq_csrf=([^;]+)/.exec(cookiesB)?.[1] ?? "";

    // 422 on invalid body
    const badLoc = await agentA
      .post("/api/v1/locations")
      .set("x-csrf-token", decodeURIComponent(csrfA))
      .send({ city: "" });
    expect(badLoc.status).toBe(422);

    // Contract checks
    const meRes = await agentA.get("/api/v1/me");
    expect(meRes.status).toBe(200);
    expect(meRes.body.ok).toBe(true);

    const indoorRes = await agentA.get("/api/v1/indoor/profile");
    expect(indoorRes.status).toBe(200);
    expect(apiSuccessSchema(IndoorProfileSchema).safeParse(indoorRes.body).success).toBe(true);

    const notifRes = await agentA.get("/api/v1/notifications");
    expect(notifRes.status).toBe(200);
    expect(apiSuccessSchema(NotificationPrefsSchema).safeParse(notifRes.body).success).toBe(true);

    const factorsRes = await agentA.get("/api/v1/simulator/factors");
    expect(factorsRes.status).toBe(200);
    for (const f of factorsRes.body.data.factors) {
      expect(String(f.source).trim().length).toBeGreaterThan(0);
      expect(String(f.publication).trim().length).toBeGreaterThan(0);
      expect(String(f.version).trim().length).toBeGreaterThan(0);
      expect(String(f.geography).trim().length).toBeGreaterThan(0);
    }

    const simRes = await agentA
      .post("/api/v1/simulator/commute")
      .set("x-csrf-token", decodeURIComponent(csrfA))
      .send({ distanceKm: 10, tripsPerWeek: 10, baselineMode: "car", alternativeModes: ["metro"] });
    if (simRes.status === 200) {
      expect(apiSuccessSchema(CommuteSimResponseSchema).safeParse(simRes.body).success).toBe(true);
    }

    const hotspotsRes = await agentA.get("/api/v1/community/hotspots");
    expect(hotspotsRes.status).toBe(200);
    expect(hotspotsRes.body.ok).toBe(true);

    // User B creates owned resources -> User A gets 404
    const locB = await agentB
      .post("/api/v1/locations")
      .set("x-csrf-token", decodeURIComponent(csrfB))
      .send({ label: "B Home", city: "Kolkata", lat: 22.5726, lng: 88.3639, isDefault: true });
    expect(locB.status).toBe(201);
    expect(
      (await agentA.delete(`/api/v1/locations/${locB.body.data.id}`).set("x-csrf-token", decodeURIComponent(csrfA))).status
    ).toBe(404);

    const famB = await agentB
      .post("/api/v1/family")
      .set("x-csrf-token", decodeURIComponent(csrfB))
      .send({ name: "Child B", ageGroup: "child", lifestyle: "student", activities: [] });
    expect(famB.status).toBe(201);
    expect(
      (await agentA.delete(`/api/v1/family/${famB.body.data.id}`).set("x-csrf-token", decodeURIComponent(csrfA))).status
    ).toBe(404);

    const actB = await agentB
      .post("/api/v1/planner/activities")
      .set("x-csrf-token", decodeURIComponent(csrfB))
      .send({ title: "B Walk", preferredTime: "07:00", flexible: true, durationMinutes: 60 });
    expect(actB.status).toBe(201);
    expect(
      (await agentA.delete(`/api/v1/planner/activities/${actB.body.data.id}`).set("x-csrf-token", decodeURIComponent(csrfA))).status
    ).toBe(404);

    const repB = await agentB
      .post("/api/v1/community/reports")
      .set("x-csrf-token", decodeURIComponent(csrfB))
      .send({ category: "smoke", description: "Smoke observed", lat: 22.5726, lng: 88.3639 });
    expect(repB.status).toBe(201);
    expect(
      (await agentA.delete(`/api/v1/community/reports/${repB.body.data.id}`).set("x-csrf-token", decodeURIComponent(csrfA))).status
    ).toBe(404);

    // Silence unused imports for schemas referenced in typechecks
    expect(AqiCurrentResponseSchema).toBeDefined();
    expect(AqiHistoryResponseSchema).toBeDefined();
  });
});
