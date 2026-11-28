import crypto from "node:crypto";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import {
  ChatReplySchema,
  DailyRecommendationSchema,
  type ChatReply,
  type DailyRecommendation,
} from "@/contracts";
import { db } from "@/db";
import { geminiUsage } from "@/db/schema";
import { cacheGet, cacheSet, checkRateLimit } from "@/server/lib/redis";
import type { AiContext } from "./context";
import { AERIQ_SYSTEM_PROMPT } from "./prompts";

export interface GeminiClientLike {
  generateJson(params: {
    systemInstruction: string;
    prompt: string;
    temperature?: number;
    maxOutputTokens?: number;
  }): Promise<{ text: string; tokensIn?: number; tokensOut?: number }>;
}

export function createSdkGeminiClient(): GeminiClientLike | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const ai = new GoogleGenAI({ apiKey });
  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

  return {
    async generateJson({
      systemInstruction,
      prompt,
      temperature = 0.3,
      maxOutputTokens = 600,
    }) {
      const controller = new AbortController();
      const timeoutMs = Number(process.env.GEMINI_TIMEOUT_MS ?? 20000);
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction,
            temperature,
            maxOutputTokens,
            responseMimeType: "application/json",
            abortSignal: controller.signal,
          },
        });
        return {
          text: res.text ?? "{}",
          tokensIn: res.usageMetadata?.promptTokenCount ?? 0,
          tokensOut: res.usageMetadata?.candidatesTokenCount ?? 0,
        };
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

export function hashUserId(userId: string): string {
  return crypto.createHash("sha256").update(userId).digest("hex").slice(0, 16);
}

async function logGeminiCall(entry: {
  route: string;
  userId: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  cacheHit: boolean;
}) {
  if (process.env.NODE_ENV === "test") return;
  try {
    await db.insert(geminiUsage).values({
      route: entry.route,
      userIdHash: hashUserId(entry.userId),
      model: entry.model,
      tokensIn: entry.tokensIn,
      tokensOut: entry.tokensOut,
      cacheHit: entry.cacheHit,
    });
  } catch {
    // Do not fail request if usage logging fails
  }
}

export async function checkGeminiBudget(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  const day = new Date().toISOString().slice(0, 10);
  const userCap = 10;
  const appCap = Number(process.env.GEMINI_DAILY_CAP ?? 200);

  const userKey = `gemini:user:${hashUserId(userId)}:${day}`;
  const appKey = `gemini:app:${day}`;

  const u = await checkRateLimit(userKey, userCap, 86400);
  if (!u.allowed) {
    return {
      allowed: false,
      reason: "AI explanations are paused for today. Your data and plan still update.",
    };
  }
  const a = await checkRateLimit(appKey, appCap, 86400);
  if (!a.allowed) {
    return {
      allowed: false,
      reason: "AI explanations are paused for today. Your data and plan still update.",
    };
  }
  return { allowed: true };
}

function stripNulls(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(stripNulls);
  if (obj && typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== null && v !== undefined) {
        out[k] = stripNulls(v);
      }
    }
    return out;
  }
  return obj;
}

function extractContextNumbers(ctx: AiContext): Set<number> {
  const nums = new Set<number>();
  const walk = (val: unknown) => {
    if (typeof val === "number" && Number.isFinite(val)) {
      nums.add(val);
      nums.add(Math.round(val));
    } else if (Array.isArray(val)) {
      val.forEach(walk);
    } else if (val && typeof val === "object") {
      Object.values(val).forEach(walk);
    }
  };
  walk(ctx);
  return nums;
}

export function findInventedNumber(text: string, ctx: AiContext): number | null {
  const allowed = extractContextNumbers(ctx);
  const patterns = [
    /(?:AQI|aqi)\s*(?:of|is|:)?\s*(\d+(?:\.\d+)?)/g,
    /(\d+(?:\.\d+)?)\s*(?:µg\/m³|ug\/m3|mg\/m³|mg\/m3|°C|%|km\/h|kph|AQI)/gi,
  ];
  for (const re of patterns) {
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      const n = Number(match[1]);
      if (Number.isFinite(n) && !allowed.has(n)) {
        return n;
      }
    }
  }
  return null;
}

function collectStrings(obj: unknown): string {
  if (typeof obj === "string") return obj;
  if (Array.isArray(obj)) return obj.map(collectStrings).join(" ");
  if (obj && typeof obj === "object") {
    return Object.values(obj).map(collectStrings).join(" ");
  }
  return "";
}

export function buildDeterministicDailyFallback(
  ctx: AiContext,
  pausedMessage?: string
): DailyRecommendation {
  const aqiStr =
    ctx.air?.aqi !== null && ctx.air?.aqi !== undefined
      ? `${ctx.air.category ?? "unknown"} (CPCB AQI ${ctx.air.aqi})`
      : `AQI unavailable (${ctx.air?.unavailableReason ?? "insufficient data"})`;

  const limits = [...ctx.limits];
  if (pausedMessage) limits.unshift(pausedMessage);

  const firstScenario = ctx.savedScenarios?.[0];
  const impactExplanation = firstScenario
    ? `Your saved ${firstScenario.baselineMode} commute scenario avoids ${firstScenario.avoidedPerWeek} kg CO2e/week (${firstScenario.avoidedPerYear} kg CO2e/year).`
    : "No saved commute simulator scenarios yet; run the simulator to calculate your CO2e savings.";

  const advByAct = (act: string) =>
    (ctx.advisories ?? []).filter((a) => a.activity === act).map((a) => a.text);

  const commuteAdvisories = advByAct("commute");
  const studyAdvisories = advByAct("study");
  const exerciseAdvisories = advByAct("exercise");
  const indoorAdvisories = advByAct("indoor");
  const generalAdvisories = advByAct("general");

  return {
    dailySummary:
      generalAdvisories[0] ??
      `Current air quality in ${ctx.location?.city ?? "your city"} is ${aqiStr}.`,
    airQualityStatus: `Status: ${aqiStr} from ${ctx.air?.provider ?? "CPCB"}.`,
    commute: {
      summary:
        commuteAdvisories[0] ??
        "Prefer covered transit and avoid prolonged roadside waiting during peak traffic.",
      actions:
        commuteAdvisories.length > 0
          ? commuteAdvisories
          : [
              "Check station readings before leaving.",
              "Use metro or closed-window transit when air is Poor or worse.",
            ],
    },
    study: {
      summary:
        studyAdvisories[0] ??
        "Keep study spaces indoors during peak particulate hours.",
      actions:
        studyAdvisories.length > 0
          ? studyAdvisories
          : ["Ventilate briefly during afternoon moderate windows."],
    },
    exercise: {
      summary:
        exerciseAdvisories[0] ??
        "Time outdoor workouts to cleaner hours or switch indoors when air is Poor.",
      actions:
        exerciseAdvisories.length > 0
          ? exerciseAdvisories
          : ["Use the planner to shift runs to lower-AQI hours."],
    },
    indoorAirRecommendations:
      indoorAdvisories.length > 0
        ? indoorAdvisories
        : [
            "Keep street-facing windows closed during Poor air and run kitchen exhaust while cooking.",
            "Damp-mop dust instead of dry sweeping.",
          ],
    sustainableActions: {
      summary: "Public transit, cycling, or walking cut tailpipe emissions.",
      actions: ["Compare commute modes in the simulator."],
    },
    impactExplanation,
    dataLimitations:
      limits.length > 0
        ? limits
        : ["Deterministic summary used while AI explanation is unavailable."],
  };
}

export function buildDeterministicChatFallback(
  ctx: AiContext,
  pausedMessage?: string
): ChatReply {
  const aqiStr =
    ctx.air?.aqi !== null && ctx.air?.aqi !== undefined
      ? `CPCB AQI is ${ctx.air.aqi} (${ctx.air.category})`
      : `CPCB AQI is unavailable (${ctx.air?.unavailableReason ?? "insufficient data"})`;

  const limits = [...ctx.limits];
  if (pausedMessage) limits.unshift(pausedMessage);

  return {
    text: pausedMessage
      ? `${pausedMessage} In ${ctx.location?.city ?? "your area"}, ${aqiStr}.`
      : `In ${ctx.location?.city ?? "your area"}, ${aqiStr}. Prefer cleaner afternoon windows for outdoor activity and ventilate only when outdoor air improves.`,
    dataLimitations:
      limits.length > 0
        ? limits
        : ["Deterministic summary used while AI explanation is unavailable."],
  };
}

function isQuotaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("429") || /quota|rate.?limit|RESOURCE_EXHAUSTED/i.test(msg);
}

export async function generateValidatedJson<T>(params: {
  route: string;
  userId: string;
  schema: z.ZodType<T>;
  ctx: AiContext;
  userPrompt: string;
  fallback: (pausedMessage?: string) => T;
  client?: GeminiClientLike | null;
  cacheKey?: string;
  skipBudget?: boolean;
}): Promise<{ data: T; aiUnavailable: boolean; retried: boolean; cacheHit: boolean }> {
  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

  if (params.cacheKey) {
    const cached = await cacheGet<T>(params.cacheKey);
    if (cached) {
      await logGeminiCall({
        route: params.route,
        userId: params.userId,
        model,
        tokensIn: 0,
        tokensOut: 0,
        cacheHit: true,
      });
      return { data: cached, aiUnavailable: false, retried: false, cacheHit: true };
    }
  }

  const client =
    params.client === undefined ? createSdkGeminiClient() : params.client;
  if (!client) {
    return { data: params.fallback(), aiUnavailable: true, retried: false, cacheHit: false };
  }

  if (!params.skipBudget) {
    const budget = await checkGeminiBudget(params.userId);
    if (!budget.allowed) {
      return {
        data: params.fallback(budget.reason),
        aiUnavailable: true,
        retried: false,
        cacheHit: false,
      };
    }
  }

  const compactCtx = JSON.stringify(stripNulls(params.ctx));
  let prompt = `CONTEXT:${compactCtx}\nTASK:${params.userPrompt}`;
  let retried = false;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await client.generateJson({
        systemInstruction: AERIQ_SYSTEM_PROMPT,
        prompt,
        temperature: 0.3,
        maxOutputTokens: 600,
      });

      await logGeminiCall({
        route: params.route,
        userId: params.userId,
        model,
        tokensIn: res.tokensIn ?? 0,
        tokensOut: res.tokensOut ?? 0,
        cacheHit: false,
      });

      const parsed = params.schema.safeParse(JSON.parse(res.text));
      if (!parsed.success) {
        retried = true;
        prompt = `${prompt}\nInvalid JSON schema. Reply only with valid JSON matching the schema.`;
        continue;
      }

      const invented = findInventedNumber(collectStrings(parsed.data), params.ctx);
      if (invented !== null) {
        retried = true;
        prompt = `${prompt}\nYou used a number not in CONTEXT: ${invented}. Use only numbers from CONTEXT.`;
        continue;
      }

      if (params.cacheKey) {
        await cacheSet(params.cacheKey, parsed.data, 1800); // 30 min cache
      }
      return { data: parsed.data, aiUnavailable: false, retried, cacheHit: false };
    } catch (err) {
      if (isQuotaError(err)) {
        // On 429/quota errors, do NOT retry
        return {
          data: params.fallback("AI explanations are paused for today. Your data and plan still update."),
          aiUnavailable: true,
          retried: false,
          cacheHit: false,
        };
      }
      retried = true;
    }
  }

  return { data: params.fallback(), aiUnavailable: true, retried, cacheHit: false };
}

export async function generateDailyRecommendation(
  ctx: AiContext,
  userId = "anonymous",
  client?: GeminiClientLike | null
) {
  return generateValidatedJson({
    route: "/api/v1/assistant/recommend",
    userId,
    schema: DailyRecommendationSchema,
    ctx,
    userPrompt:
      "Generate today's DailyRecommendation JSON with dailySummary, airQualityStatus, commute, study, exercise, indoorAirRecommendations, sustainableActions, impactExplanation (derived strictly from CONTEXT.savedScenarios if present, otherwise state none saved), and dataLimitations.",
    fallback: (msg) => buildDeterministicDailyFallback(ctx, msg),
    client,
  });
}

export async function generateChatReply(
  ctx: AiContext,
  message: string,
  userId = "anonymous",
  history: { role: string; content: string }[] = [],
  client?: GeminiClientLike | null
) {
  const last6 = history
    .slice(-6)
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");
  const questionWithHistory = last6
    ? `Recent:\n${last6}\nQuestion: ${message}`
    : `Question: ${message}`;

  const cacheHash = crypto
    .createHash("sha256")
    .update(`${message}|${JSON.stringify(stripNulls(ctx))}`)
    .digest("hex")
    .slice(0, 24);

  return generateValidatedJson({
    route: "/api/v1/assistant/chat",
    userId,
    schema: ChatReplySchema,
    ctx,
    userPrompt: `Answer using CONTEXT only. ${questionWithHistory}`,
    fallback: (msg) => buildDeterministicChatFallback(ctx, msg),
    client,
    cacheKey: `chat:cache:${cacheHash}`,
  });
}
