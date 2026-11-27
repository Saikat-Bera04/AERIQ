import type { IncomingMessage, ServerResponse } from "node:http";
import {
  ChatRequestSchema,
  CommuteSimRequestSchema,
  CreateCommunityReportRequestSchema,
  ExposureRequestSchema,
  IndoorProfileSchema,
  IndoorRecommendRequestSchema,
  LoginRequestSchema,
  RecommendRequestSchema,
  RegisterRequestSchema,
  SyncLocationRequestSchema,
} from "@/contracts";
import { MOCK_EMISSION_FACTORS } from "@/mocks/fixtures";
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
  createCommunityReport,
  getAqiCurrent,
  getAssistantRecommendation,
  getIndoorRecommendations,
  getTodayPlan,
  loginUser,
  registerUser,
  runAssistantChat,
  runCommuteSimulation,
  runExposureSimulation,
  syncLiveLocation,
} from "@/server/services";

const MAX_BODY_BYTES = 64 * 1024; // 64 KB limit

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const contentType = req.headers["content-type"] ?? "";
  if (!contentType.includes("application/json")) {
    throw new AppError(
      "VALIDATION_FAILED",
      415,
      "Content-Type must be application/json"
    );
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

function sendJson(
  res: ServerResponse,
  status: number,
  body: unknown,
  extraHeaders?: Record<string, string>
) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    ...SECURITY_HEADERS,
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

export async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const start = Date.now();
  const requestId = createRequestId();
  const url = new URL(req.url ?? "/", "http://localhost");
  const path = url.pathname;
  const method = (req.method ?? "GET").toUpperCase();

  try {
    // Health check
    if (path === "/health" && method === "GET") {
      sendJson(res, 200, okEnvelope({ status: "ok" }));
      return;
    }

    // Cron routes (protected by CRON_SECRET)
    if (path.startsWith("/api/cron/")) {
      const auth = req.headers.authorization;
      const expected = `Bearer ${process.env.CRON_SECRET ?? "replace-with-cron-secret"}`;
      if (auth !== expected) {
        throw new AppError("UNAUTHENTICATED", 401, "Invalid cron secret");
      }
      if (path === "/api/cron/ingest-observations") {
        sendJson(res, 200, okEnvelope(await runIngestObservations()));
        return;
      }
      if (path === "/api/cron/ingest-forecast") {
        sendJson(res, 200, okEnvelope(await runIngestForecast()));
        return;
      }
      if (path === "/api/cron/refresh-plans") {
        sendJson(res, 200, okEnvelope(await runRefreshPlans()));
        return;
      }
      if (path === "/api/cron/stations-sync") {
        sendJson(res, 200, okEnvelope(await runStationsSync()));
        return;
      }
      if (path === "/api/cron/cleanup") {
        sendJson(res, 200, okEnvelope(await runCleanup()));
        return;
      }
      throw new AppError("NOT_FOUND", 404, "Cron route not found");
    }

    // Public auth routes
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
      sendJson(res, 201, okEnvelope(created));
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
      sendJson(res, 200, okEnvelope({ user }), {
        "Set-Cookie": `aeriq_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000`,
      });
      return;
    }

    // Session required for all other /api/v1/* routes
    const userId = getSessionUserId(req);
    if (!userId && process.env.USE_MOCKS !== "true") {
      throw new AppError("UNAUTHENTICATED", 401, "Sign in required");
    }
    const effectiveUserId = userId ?? "mock-user-1";

    // General rate limit (300 per 5 min)
    const genRl = await checkRateLimit(`rl:gen:${effectiveUserId}`, 300, 300);
    if (!genRl.allowed) {
      throw new AppError("RATE_LIMITED", 429, "Rate limit exceeded", {
        retryAfterSec: genRl.retryAfterSec,
      });
    }

    if (path === "/api/v1/aqi/current" && method === "GET") {
      sendJson(res, 200, okEnvelope(await getAqiCurrent()));
      return;
    }

    if (path === "/api/v1/locations/sync" && method === "POST") {
      const body = SyncLocationRequestSchema.parse(await readJsonBody(req));
      const synced = await syncLiveLocation(effectiveUserId, body);
      sendJson(res, 200, okEnvelope(synced));
      return;
    }

    if (path === "/api/v1/assistant/recommend" && method === "POST") {
      const body = RecommendRequestSchema.parse(await readJsonBody(req));
      if (body.force) {
        const rl = await checkRateLimit(`rl:rec:${effectiveUserId}`, 6, 3600);
        if (!rl.allowed) {
          throw new AppError("RATE_LIMITED", 429, "Refresh limit reached", {
            retryAfterSec: rl.retryAfterSec,
          });
        }
      }
      const rec = await getAssistantRecommendation();
      sendJson(
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
      const rl = await checkRateLimit(`rl:chat:${effectiveUserId}`, 30, 3600);
      if (!rl.allowed) {
        throw new AppError("RATE_LIMITED", 429, "Chat limit reached", {
          retryAfterSec: rl.retryAfterSec,
        });
      }
      const body = ChatRequestSchema.parse(await readJsonBody(req));
      const chatRes = await runAssistantChat(body.message, body.excludeContext);

      res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        ...SECURITY_HEADERS,
      });
      const sendEvent = (event: string, data: unknown) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      };
      sendEvent("context", chatRes.contextSnapshot);
      sendEvent("safety", { flag: chatRes.safetyFlag });
      sendEvent("delta", { text: chatRes.reply.text });
      sendEvent("structured", chatRes.reply);
      sendEvent("done", { messageId: createRequestId() });
      res.end();
      return;
    }

    if (path === "/api/v1/planner/today" && method === "GET") {
      sendJson(res, 200, okEnvelope(getTodayPlan()));
      return;
    }

    if (path === "/api/v1/indoor/recommendations" && method === "POST") {
      const raw = await readJsonBody(req);
      IndoorRecommendRequestSchema.parse(raw);
      const defaultProfile = IndoorProfileSchema.parse({
        cookingFuel: "lpg",
        incense: false,
        indoorSmoking: false,
        pets: false,
        constructionNearby: true,
        hasPurifier: true,
        roomSizeM2: 24,
      });
      sendJson(res, 200, okEnvelope(getIndoorRecommendations(defaultProfile)));
      return;
    }

    if (path === "/api/v1/simulator/factors" && method === "GET") {
      sendJson(res, 200, okEnvelope({ factors: MOCK_EMISSION_FACTORS }));
      return;
    }

    if (path === "/api/v1/simulator/commute" && method === "POST") {
      const rl = await checkRateLimit(`rl:sim:${effectiveUserId}`, 60, 3600);
      if (!rl.allowed) {
        throw new AppError("RATE_LIMITED", 429, "Simulator limit reached", {
          retryAfterSec: rl.retryAfterSec,
        });
      }
      const body = CommuteSimRequestSchema.parse(await readJsonBody(req));
      sendJson(res, 200, okEnvelope(runCommuteSimulation(body)));
      return;
    }

    if (path === "/api/v1/simulator/exposure" && method === "POST") {
      const body = ExposureRequestSchema.parse(await readJsonBody(req));
      sendJson(res, 200, okEnvelope(runExposureSimulation(body.segments)));
      return;
    }

    if (path === "/api/v1/community/reports" && method === "POST") {
      const rl = await checkRateLimit(`rl:rep:${effectiveUserId}`, 5, 86400);
      if (!rl.allowed) {
        throw new AppError("RATE_LIMITED", 429, "Daily report limit reached", {
          retryAfterSec: rl.retryAfterSec,
        });
      }
      const body = CreateCommunityReportRequestSchema.parse(await readJsonBody(req));
      sendJson(res, 201, okEnvelope(createCommunityReport(body)));
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
      appErr = new AppError("VALIDATION_FAILED", 422, "Validation failed", {
        fields,
      });
    } else {
      appErr = new AppError("INTERNAL", 500, "An internal error occurred");
    }

    logRoute({
      requestId,
      route: `${method} ${path}`,
      code: appErr.code,
      ms: Date.now() - start,
    });
    sendJson(res, appErr.status, errorEnvelope(appErr));
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
