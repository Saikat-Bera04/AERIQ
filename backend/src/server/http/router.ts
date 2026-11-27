import type { IncomingMessage, ServerResponse } from "node:http";
import {
  ChatRequestSchema,
  CommuteSimRequestSchema,
  CreateCommunityReportRequestSchema,
  CreateFamilyMemberRequestSchema,
  CreateLocationRequestSchema,
  CreatePlannerActivityRequestSchema,
  DeleteAccountRequestSchema,
  ExposureRequestSchema,
  GeneratePlanRequestSchema,
  HotspotsQuerySchema,
  IndoorProfileSchema,
  IndoorRecommendRequestSchema,
  LoginRequestSchema,
  ModerationStatusRequestSchema,
  NotificationPrefsSchema,
  PatchLocationRequestSchema,
  PatchPlannerActivityRequestSchema,
  PatchProfileRequestSchema,
  RecommendRequestSchema,
  RegisterRequestSchema,
  SaveScenarioRequestSchema,
  SyncLocationRequestSchema,
} from "@/contracts";
import {
  runCleanup,
  runIngestForecast,
  runIngestObservations,
  runRefreshPlans,
  runStationsSync,
} from "@/server/cron/jobs";
import {
  AppError,
  SECURITY_HEADERS,
  createRequestId,
  errorEnvelope,
  logRoute,
  okEnvelope,
} from "@/server/lib/envelope";
import { signSessionToken, verifySessionToken } from "@/server/lib/privacy";
import { checkRateLimit } from "@/server/lib/redis";
import {
  addPlannerActivity,
  createCommunityReport,
  createFamilyMember,
  createLocation,
  deleteAccount,
  deleteCommunityReport,
  deleteConversation,
  deleteFamilyMember,
  deleteLocation,
  deletePlannerActivity,
  exportUserData,
  getAqiCurrent,
  getAqiHistory,
  getAssistantRecommendation,
  getCommunityHotspots,
  getConversationMessages,
  getGeminiUsageStats,
  getIndoorProfile,
  getIndoorRecommendations,
  getMe,
  getNotifications,
  getOrBuildTodayPlan,
  getWeather,
  listConversations,
  listEmissionFactors,
  listFamily,
  listLocations,
  listSimulatorScenarios,
  loginUser,
  moderateReport,
  patchLocation,
  registerUser,
  runAssistantChat,
  runCommuteSimulation,
  runExposureSimulation,
  saveSimulatorScenario,
  syncLiveLocation,
  togglePlannerActivity,
  updateIndoorProfile,
  updateNotifications,
  upsertProfile,
} from "@/server/services";

const MAX_BODY_BYTES = 64 * 1024;

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const contentType = req.headers["content-type"] ?? "";
  if (!contentType.includes("application/json")) {
    throw new AppError("VALIDATION_FAILED", 415, "Content-Type must be application/json");
  }

  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new AppError("VALIDATION_FAILED", 413, "Request body exceeds 64 KB"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new AppError("VALIDATION_FAILED", 400, "Malformed JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function corsHeaders(req: IncomingMessage): Record<string, string> {
  const origin = req.headers.origin ?? process.env.AUTH_URL ?? "http://localhost:3000";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
  };
}

function sendJson(
  req: IncomingMessage,
  res: ServerResponse,
  status: number,
  body: unknown,
  extraHeaders?: Record<string, string>
) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    ...SECURITY_HEADERS,
    ...corsHeaders(req),
    ...extraHeaders,
  });
  res.end(JSON.stringify(body));
}

function getSessionUserId(req: IncomingMessage): string | null {
  const cookieHeader = req.headers.cookie ?? "";
  const match = /aeriq_session=([^;]+)/.exec(cookieHeader);
  if (!match) return null;
  return verifySessionToken(decodeURIComponent(match[1]));
}

function sessionCookieHeader(token: string, maxAge = 2592000): string {
  const isHttps =
    process.env.NODE_ENV === "production" ||
    (process.env.AUTH_URL ?? "").startsWith("https://");
  const sameSite = isHttps ? "SameSite=None; Secure" : "SameSite=Lax";
  return `aeriq_session=${encodeURIComponent(token)}; HttpOnly; ${sameSite}; Path=/; Max-Age=${maxAge}`;
}

export async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const start = Date.now();
  const requestId = createRequestId();
  const url = new URL(req.url ?? "/", "http://localhost");
  const path = url.pathname.replace(/\/{2,}/g, "/");
  const method = (req.method ?? "GET").toUpperCase();

  if (method === "OPTIONS") {
    res.writeHead(204, { ...SECURITY_HEADERS, ...corsHeaders(req) });
    res.end();
    return;
  }

  try {
    if ((path === "/" || path === "/health") && method === "GET") {
      sendJson(req, res, 200, okEnvelope({ service: "aeriq-backend", status: "ok" }));
      return;
    }

    // --- Cron routes ---
    if (path.startsWith("/api/cron/")) {
      const auth = req.headers.authorization;
      if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
        throw new AppError("UNAUTHENTICATED", 401, "Invalid cron secret");
      }
      if (path === "/api/cron/ingest-observations") {
        sendJson(req, res, 200, okEnvelope(await runIngestObservations()));
        return;
      }
      if (path === "/api/cron/ingest-forecast") {
        sendJson(req, res, 200, okEnvelope(await runIngestForecast()));
        return;
      }
      if (path === "/api/cron/refresh-plans") {
        sendJson(req, res, 200, okEnvelope(await runRefreshPlans()));
        return;
      }
      if (path === "/api/cron/stations-sync") {
        sendJson(req, res, 200, okEnvelope(await runStationsSync()));
        return;
      }
      if (path === "/api/cron/cleanup") {
        sendJson(req, res, 200, okEnvelope(await runCleanup()));
        return;
      }
      throw new AppError("NOT_FOUND", 404, "Cron route not found");
    }

    // --- Public auth routes ---
    if (path === "/api/v1/auth/register" && method === "POST") {
      const ip = req.socket.remoteAddress ?? "unknown";
      const rl = await checkRateLimit(`rl:auth:${ip}`, 10, 900);
      if (!rl.allowed) {
        throw new AppError("RATE_LIMITED", 429, "Too many requests", {
          retryAfterSec: rl.retryAfterSec,
        });
      }
      const body = RegisterRequestSchema.parse(await readJsonBody(req));
      const created = await registerUser(body);
      const token = signSessionToken(created.userId);
      sendJson(req, res, 201, okEnvelope(created), {
        "Set-Cookie": sessionCookieHeader(token),
      });
      return;
    }

    if (path === "/api/v1/auth/login" && method === "POST") {
      const ip = req.socket.remoteAddress ?? "unknown";
      const rl = await checkRateLimit(`rl:auth:${ip}`, 10, 900);
      if (!rl.allowed) {
        throw new AppError("RATE_LIMITED", 429, "Too many requests", {
          retryAfterSec: rl.retryAfterSec,
        });
      }
      const body = LoginRequestSchema.parse(await readJsonBody(req));
      const user = await loginUser(body.email, body.password);
      const token = signSessionToken(user.userId);
      sendJson(req, res, 200, okEnvelope({ user }), {
        "Set-Cookie": sessionCookieHeader(token),
      });
      return;
    }

    if (path === "/api/v1/auth/logout" && method === "POST") {
      sendJson(req, res, 200, okEnvelope({ loggedOut: true }), {
        "Set-Cookie": sessionCookieHeader("", 0),
      });
      return;
    }

    // --- Protected routes (session required) ---
    const userId = getSessionUserId(req);
    if (!userId) {
      throw new AppError("UNAUTHENTICATED", 401, "Sign in required");
    }

    const genRl = await checkRateLimit(`rl:gen:${userId}`, 300, 300);
    if (!genRl.allowed) {
      throw new AppError("RATE_LIMITED", 429, "Rate limit exceeded", {
        retryAfterSec: genRl.retryAfterSec,
      });
    }

    if (path === "/api/v1/me" && method === "GET") {
      sendJson(req, res, 200, okEnvelope(await getMe(userId)));
      return;
    }

    if (path === "/api/v1/profile" && method === "PATCH") {
      const body = PatchProfileRequestSchema.parse(await readJsonBody(req));
      sendJson(req, res, 200, okEnvelope(await upsertProfile(userId, body)));
      return;
    }

    if (path === "/api/v1/locations" && method === "GET") {
      sendJson(req, res, 200, okEnvelope(await listLocations(userId)));
      return;
    }

    if (path === "/api/v1/locations" && method === "POST") {
      const body = CreateLocationRequestSchema.parse(await readJsonBody(req));
      sendJson(req, res, 201, okEnvelope(await createLocation(userId, body)));
      return;
    }

    if (path === "/api/v1/locations/sync" && method === "POST") {
      const body = SyncLocationRequestSchema.parse(await readJsonBody(req));
      sendJson(req, res, 200, okEnvelope(await syncLiveLocation(userId, body)));
      return;
    }

    const locMatch = /^\/api\/v1\/locations\/([^/]+)$/.exec(path);
    if (locMatch) {
      if (method === "PATCH") {
        const body = PatchLocationRequestSchema.parse(await readJsonBody(req));
        sendJson(req, res, 200, okEnvelope(await patchLocation(userId, locMatch[1], body)));
        return;
      }
      if (method === "DELETE") {
        sendJson(req, res, 200, okEnvelope(await deleteLocation(userId, locMatch[1])));
        return;
      }
    }

    if (path === "/api/v1/aqi/current" && method === "GET") {
      const locId = url.searchParams.get("locationId") ?? undefined;
      const data = await getAqiCurrent(userId, locId);
      sendJson(req, res, 200, okEnvelope(data, { notices: data.notices }));
      return;
    }

    if (path === "/api/v1/aqi/history" && method === "GET") {
      const locId = url.searchParams.get("locationId") ?? undefined;
      const range = (url.searchParams.get("range") as "24h" | "7d" | "30d") ?? "24h";
      sendJson(req, res, 200, okEnvelope(await getAqiHistory(userId, locId, range)));
      return;
    }

    if (path === "/api/v1/weather" && method === "GET") {
      const hours = Number(url.searchParams.get("hours") ?? 12);
      sendJson(req, res, 200, okEnvelope(await getWeather(hours)));
      return;
    }

    if (path === "/api/v1/assistant/recommend" && method === "POST") {
      const body = RecommendRequestSchema.parse(await readJsonBody(req));
      if (body.force) {
        // Rate limit Refresh to 3 per day
        const rl = await checkRateLimit(`rl:rec:${userId}:${new Date().toISOString().slice(0, 10)}`, 3, 86400);
        if (!rl.allowed) {
          throw new AppError("RATE_LIMITED", 429, "Daily refresh limit reached (3/day)", {
            retryAfterSec: rl.retryAfterSec,
          });
        }
      }
      const rec = await getAssistantRecommendation(userId, body.locationId, body.force);
      sendJson(
        req,
        res,
        200,
        okEnvelope(rec, {
          dataAsOf: rec.dataAsOf,
          notices: rec.aiUnavailable
            ? [{ code: "AI_UNAVAILABLE", message: "Using deterministic summary." }]
            : [],
        })
      );
      return;
    }

    if (path === "/api/v1/assistant/chat" && method === "POST") {
      const rl = await checkRateLimit(`rl:chat:${userId}`, 30, 3600);
      if (!rl.allowed) {
        throw new AppError("RATE_LIMITED", 429, "Chat limit reached", {
          retryAfterSec: rl.retryAfterSec,
        });
      }
      const body = ChatRequestSchema.parse(await readJsonBody(req));
      const chatRes = await runAssistantChat(userId, body.message, body);

      res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        ...SECURITY_HEADERS,
        ...corsHeaders(req),
      });
      const sendEvent = (event: string, data: unknown) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      };
      sendEvent("context", chatRes.contextSnapshot);
      sendEvent("safety", { flag: chatRes.safetyFlag });
      sendEvent("delta", { text: chatRes.reply.text });
      sendEvent("structured", chatRes.reply);
      sendEvent("done", { messageId: chatRes.messageId, conversationId: chatRes.conversationId });
      res.end();
      return;
    }

    if (path === "/api/v1/assistant/conversations" && method === "GET") {
      sendJson(req, res, 200, okEnvelope(await listConversations(userId)));
      return;
    }

    const convMatch = /^\/api\/v1\/assistant\/conversations\/([^/]+)$/.exec(path);
    if (convMatch) {
      if (method === "GET") {
        sendJson(req, res, 200, okEnvelope(await getConversationMessages(userId, convMatch[1])));
        return;
      }
      if (method === "DELETE") {
        sendJson(req, res, 200, okEnvelope(await deleteConversation(userId, convMatch[1])));
        return;
      }
    }

    if (path === "/api/v1/planner/today" && method === "GET") {
      const locId = url.searchParams.get("locationId") ?? undefined;
      sendJson(req, res, 200, okEnvelope(await getOrBuildTodayPlan(userId, locId, false)));
      return;
    }

    if (path === "/api/v1/planner/generate" && method === "POST") {
      const rl = await checkRateLimit(`rl:plan:${userId}`, 12, 3600);
      if (!rl.allowed) {
        throw new AppError("RATE_LIMITED", 429, "Planner limit reached", {
          retryAfterSec: rl.retryAfterSec,
        });
      }
      const body = GeneratePlanRequestSchema.parse(await readJsonBody(req));
      sendJson(req, res, 200, okEnvelope(await getOrBuildTodayPlan(userId, body.locationId, true)));
      return;
    }

    if (path === "/api/v1/planner/activities" && method === "POST") {
      const body = CreatePlannerActivityRequestSchema.parse(await readJsonBody(req));
      sendJson(req, res, 201, okEnvelope(await addPlannerActivity(userId, body)));
      return;
    }

    const actMatch = /^\/api\/v1\/planner\/activities\/([^/]+)$/.exec(path);
    if (actMatch) {
      if (method === "PATCH") {
        const body = PatchPlannerActivityRequestSchema.parse(await readJsonBody(req));
        sendJson(req, res, 200, okEnvelope(await togglePlannerActivity(userId, actMatch[1], body.completed)));
        return;
      }
      if (method === "DELETE") {
        sendJson(req, res, 200, okEnvelope(await deletePlannerActivity(userId, actMatch[1])));
        return;
      }
    }

    if (path === "/api/v1/family" && method === "GET") {
      sendJson(req, res, 200, okEnvelope(await listFamily(userId)));
      return;
    }

    if (path === "/api/v1/family" && method === "POST") {
      const body = CreateFamilyMemberRequestSchema.parse(await readJsonBody(req));
      sendJson(req, res, 201, okEnvelope(await createFamilyMember(userId, body)));
      return;
    }

    const famMatch = /^\/api\/v1\/family\/([^/]+)$/.exec(path);
    if (famMatch && method === "DELETE") {
      sendJson(req, res, 200, okEnvelope(await deleteFamilyMember(userId, famMatch[1])));
      return;
    }

    if (path === "/api/v1/indoor/profile" && method === "GET") {
      sendJson(req, res, 200, okEnvelope(await getIndoorProfile(userId)));
      return;
    }

    if (path === "/api/v1/indoor/profile" && method === "PUT") {
      const body = IndoorProfileSchema.parse(await readJsonBody(req));
      sendJson(req, res, 200, okEnvelope(await updateIndoorProfile(userId, body)));
      return;
    }

    if (path === "/api/v1/indoor/recommendations" && method === "POST") {
      const body = IndoorRecommendRequestSchema.parse(await readJsonBody(req));
      sendJson(req, res, 200, okEnvelope(await getIndoorRecommendations(userId, body.locationId)));
      return;
    }

    if (path === "/api/v1/simulator/factors" && method === "GET") {
      sendJson(req, res, 200, okEnvelope({ factors: await listEmissionFactors() }));
      return;
    }

    if (path === "/api/v1/simulator/commute" && method === "POST") {
      const rl = await checkRateLimit(`rl:sim:${userId}`, 60, 3600);
      if (!rl.allowed) {
        throw new AppError("RATE_LIMITED", 429, "Simulator limit reached", {
          retryAfterSec: rl.retryAfterSec,
        });
      }
      const body = CommuteSimRequestSchema.parse(await readJsonBody(req));
      sendJson(req, res, 200, okEnvelope(await runCommuteSimulation(body)));
      return;
    }

    if (path === "/api/v1/simulator/exposure" && method === "POST") {
      const body = ExposureRequestSchema.parse(await readJsonBody(req));
      sendJson(req, res, 200, okEnvelope(runExposureSimulation(body.segments)));
      return;
    }

    if (path === "/api/v1/simulator/scenarios" && method === "GET") {
      sendJson(req, res, 200, okEnvelope(await listSimulatorScenarios(userId)));
      return;
    }

    if (path === "/api/v1/simulator/scenarios" && method === "POST") {
      const body = SaveScenarioRequestSchema.parse(await readJsonBody(req));
      sendJson(req, res, 201, okEnvelope(await saveSimulatorScenario(userId, body.inputs, body.result)));
      return;
    }

    if (path === "/api/v1/community/hotspots" && method === "GET") {
      const q = HotspotsQuerySchema.parse({
        lat: url.searchParams.get("lat") ?? undefined,
        lng: url.searchParams.get("lng") ?? undefined,
        radiusKm: url.searchParams.get("radiusKm") ?? undefined,
      });
      sendJson(req, res, 200, okEnvelope(await getCommunityHotspots(q.lat, q.lng, q.radiusKm)));
      return;
    }

    if (path === "/api/v1/community/reports" && method === "POST") {
      const rl = await checkRateLimit(`rl:rep:${userId}`, 5, 86400);
      if (!rl.allowed) {
        throw new AppError("RATE_LIMITED", 429, "Daily report limit reached", {
          retryAfterSec: rl.retryAfterSec,
        });
      }
      const body = CreateCommunityReportRequestSchema.parse(await readJsonBody(req));
      sendJson(req, res, 201, okEnvelope(await createCommunityReport(userId, body)));
      return;
    }

    const repMatch = /^\/api\/v1\/community\/reports\/([^/]+)$/.exec(path);
    if (repMatch && method === "DELETE") {
      sendJson(req, res, 200, okEnvelope(await deleteCommunityReport(userId, repMatch[1])));
      return;
    }

    const modMatch = /^\/api\/v1\/admin\/reports\/([^/]+)\/status$/.exec(path);
    if (modMatch && method === "POST") {
      const body = ModerationStatusRequestSchema.parse(await readJsonBody(req));
      sendJson(req, res, 200, okEnvelope(await moderateReport(userId, modMatch[1], body.status)));
      return;
    }

    if (path === "/api/v1/notifications" && method === "GET") {
      sendJson(req, res, 200, okEnvelope(await getNotifications(userId)));
      return;
    }

    if (path === "/api/v1/notifications" && method === "PUT") {
      const body = NotificationPrefsSchema.parse(await readJsonBody(req));
      sendJson(req, res, 200, okEnvelope(await updateNotifications(userId, body)));
      return;
    }

    if (path === "/api/v1/account/export" && method === "GET") {
      sendJson(req, res, 200, okEnvelope(await exportUserData(userId)));
      return;
    }

    if (path === "/api/v1/account" && method === "DELETE") {
      DeleteAccountRequestSchema.parse(await readJsonBody(req));
      sendJson(req, res, 200, okEnvelope(await deleteAccount(userId)), {
        "Set-Cookie": "aeriq_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0",
      });
      return;
    }

    if (path === "/api/v1/dev/gemini-usage" && method === "GET") {
      sendJson(req, res, 200, okEnvelope(await getGeminiUsageStats(userId)));
      return;
    }

    throw new AppError("NOT_FOUND", 404, `Route not found: ${method} ${path}`);
  } catch (err) {
    let appErr: AppError;
    if (err instanceof AppError) {
      appErr = err;
    } else if (err && typeof err === "object" && "issues" in err) {
      const zodErr = err as { issues: { path: (string | number)[]; message: string }[] };
      const fields: Record<string, string> = {};
      for (const issue of zodErr.issues) {
        const key = String(issue.path[0] ?? "input");
        if (!fields[key]) fields[key] = issue.message;
      }
      appErr = new AppError("VALIDATION_FAILED", 422, "Validation failed", { fields });
    } else {
      appErr = new AppError("INTERNAL", 500, "An internal error occurred");
    }

    logRoute({
      requestId,
      route: `${method} ${path}`,
      code: appErr.code,
      ms: Date.now() - start,
    });
    sendJson(req, res, appErr.status, errorEnvelope(appErr));
    return;
  } finally {
    logRoute({
      requestId,
      route: `${method} ${path}`,
      code: String(res.statusCode),
      ms: Date.now() - start,
    });
  }
}
