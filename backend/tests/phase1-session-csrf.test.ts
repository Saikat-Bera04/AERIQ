import crypto from "node:crypto";
import type http from "node:http";
import { PassThrough } from "node:stream";
import { beforeEach, describe, expect, it, vi } from "vitest";

const sessionStore = new Map<string, { sessionToken: string; userId: string; expires: Date }>();

vi.mock("@/db", () => {
  return {
    db: {
      insert: () => ({
        values: async (row: { sessionToken: string; userId: string; expires: Date }) => {
          sessionStore.set(row.sessionToken, row);
          return [row];
        },
      }),
      query: {
        sessions: {
          findFirst: async () => {
            const now = Date.now();
            for (const row of sessionStore.values()) {
              if (row.expires.getTime() > now) return row;
            }
            return undefined;
          },
        },
      },
      update: () => ({
        set: (vals: { expires: Date }) => ({
          where: async () => {
            for (const row of sessionStore.values()) {
              row.expires = vals.expires;
            }
          },
        }),
      }),
      delete: () => ({
        where: async () => {
          sessionStore.clear();
        },
      }),
    },
  };
});

vi.mock("@/server/services", () => ({
  loginUser: vi.fn(async () => ({
    userId: "user-123",
    email: "test@example.com",
    name: "Test User",
  })),
  getMe: vi.fn(async (userId: string) => ({
    user: { id: userId, email: "test@example.com", name: "Test User", role: "user", avatarColour: "#10291a" },
    onboarded: true,
    profile: null,
    locations: [],
  })),
  upsertProfile: vi.fn(async (_userId: string, body: unknown) => ({ updated: true, body })),
  registerUser: vi.fn(),
  listLocations: vi.fn(),
  createLocation: vi.fn(),
  syncLiveLocation: vi.fn(),
  patchLocation: vi.fn(),
  deleteLocation: vi.fn(),
  getAqiCurrent: vi.fn(),
  getAqiHistory: vi.fn(),
  getWeather: vi.fn(),
  getAssistantRecommendation: vi.fn(),
  runAssistantChat: vi.fn(),
  listConversations: vi.fn(),
  getConversationMessages: vi.fn(),
  deleteConversation: vi.fn(),
  getOrBuildTodayPlan: vi.fn(),
  addPlannerActivity: vi.fn(),
  togglePlannerActivity: vi.fn(),
  deletePlannerActivity: vi.fn(),
  listFamily: vi.fn(),
  createFamilyMember: vi.fn(),
  deleteFamilyMember: vi.fn(),
  getIndoorProfile: vi.fn(),
  updateIndoorProfile: vi.fn(),
  getIndoorRecommendations: vi.fn(),
  listEmissionFactors: vi.fn(),
  runCommuteSimulation: vi.fn(),
  runExposureSimulation: vi.fn(),
  listSimulatorScenarios: vi.fn(),
  saveSimulatorScenario: vi.fn(),
  getCommunityHotspots: vi.fn(),
  createCommunityReport: vi.fn(),
  deleteCommunityReport: vi.fn(),
  moderateReport: vi.fn(),
  getNotifications: vi.fn(),
  updateNotifications: vi.fn(),
  exportUserData: vi.fn(),
  deleteAccount: vi.fn(),
  getGeminiUsageStats: vi.fn(),
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
    headers: resHeaders,
    setCookies,
    bodyText: Buffer.concat(chunks).toString("utf8"),
  };
}

function extractCookie(setCookies: string[], name: string): string | null {
  for (const line of setCookies) {
    const match = new RegExp(`^${name}=([^;]+)`).exec(line);
    if (match) return decodeURIComponent(match[1]);
  }
  return null;
}

describe("Phase 1 — Same-origin sessions & CSRF", () => {
  beforeEach(() => {
    process.env.APP_URL = "http://localhost:3000";
    sessionStore.clear();
  });

  it("login sets HttpOnly SameSite=Lax session cookie (stored as SHA-256 hash) and CSRF cookie; logout revokes it", async () => {
    const loginRes = await invoke({
      method: "POST",
      url: "/api/v1/auth/login",
      headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
      body: { email: "test@example.com", password: "password123" },
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.headers["access-control-allow-credentials"]).toBeUndefined();

    const rawSession = extractCookie(loginRes.setCookies, "aeriq_session");
    const csrfToken = extractCookie(loginRes.setCookies, "aeriq_csrf");
    expect(rawSession).toBeTruthy();
    expect(csrfToken).toBeTruthy();

    const sessionCookieLine =
      loginRes.setCookies.find((c) => c.startsWith("aeriq_session=")) ?? "";
    expect(sessionCookieLine).toContain("HttpOnly");
    expect(sessionCookieLine).toContain("SameSite=Lax");
    expect(sessionCookieLine).toContain("Path=/");

    const expectedHash = crypto.createHash("sha256").update(rawSession!).digest("hex");
    expect(sessionStore.has(expectedHash)).toBe(true);
    expect(sessionStore.has(rawSession!)).toBe(false);

    const cookieHeader = `aeriq_session=${rawSession}; aeriq_csrf=${csrfToken}`;

    // Mutation without x-csrf-token gets 403
    const noCsrfRes = await invoke({
      method: "PATCH",
      url: "/api/v1/profile",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
        Origin: "http://localhost:3000",
      },
      body: { lifestyle: "student" },
    });
    expect(noCsrfRes.status).toBe(403);

    // Mutation with wrong Origin gets 403
    const badOriginRes = await invoke({
      method: "PATCH",
      url: "/api/v1/profile",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
        Origin: "https://evil.example.com",
        "x-csrf-token": csrfToken!,
      },
      body: { lifestyle: "student" },
    });
    expect(badOriginRes.status).toBe(403);

    // Mutation with valid CSRF header + Origin succeeds
    const validPatchRes = await invoke({
      method: "PATCH",
      url: "/api/v1/profile",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
        Origin: "http://localhost:3000",
        "x-csrf-token": csrfToken!,
      },
      body: { lifestyle: "student" },
    });
    expect(validPatchRes.status).toBe(200);

    // Logout revokes session
    const logoutRes = await invoke({
      method: "POST",
      url: "/api/v1/auth/logout",
      headers: {
        Cookie: cookieHeader,
        Origin: "http://localhost:3000",
        "x-csrf-token": csrfToken!,
      },
    });
    expect(logoutRes.status).toBe(200);
    expect(sessionStore.size).toBe(0);

    // Old cookie gets 401
    const afterLogoutRes = await invoke({
      method: "GET",
      url: "/api/v1/me",
      headers: { Cookie: cookieHeader },
    });
    expect(afterLogoutRes.status).toBe(401);
  });
});
