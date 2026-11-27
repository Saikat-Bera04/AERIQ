import { z } from "zod";
import {
  ChatReplySchema,
  DailyRecommendationSchema,
  type ChatReply,
  type DailyRecommendation,
} from "@/contracts";
import { MOCK_DAILY_RECOMMENDATION } from "@/mocks/fixtures";
import type { AiContext } from "./context";
import { AERIQ_SYSTEM_PROMPT } from "./prompts";
import { createSdkGeminiClient, type GeminiClientLike } from "./safety";

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

/**
 * Scans generated text for any number paired with a unit or the word AQI.
 * Returns the first number not present in CONTEXT, or null if all match.
 */
export function findInventedNumber(
  text: string,
  ctx: AiContext
): number | null {
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
  ctx: AiContext
): DailyRecommendation {
  const aqiStr =
    ctx.air?.aqi !== null && ctx.air?.aqi !== undefined
      ? `${ctx.air.category ?? "unknown"} (CPCB AQI ${ctx.air.aqi})`
      : `AQI unavailable (${ctx.air?.unavailableReason ?? "insufficient data"})`;

  return {
    ...MOCK_DAILY_RECOMMENDATION,
    dailySummary: `Current air quality in ${ctx.location?.city ?? "your city"} is ${aqiStr}.`,
    airQualityStatus: `Status: ${aqiStr} from ${ctx.air?.provider ?? "CPCB"}.`,
    dataLimitations:
      ctx.limits.length > 0
        ? ctx.limits
        : ["Deterministic summary used while AI explanation is unavailable."],
  };
}

export function buildDeterministicChatFallback(ctx: AiContext): ChatReply {
  const aqiStr =
    ctx.air?.aqi !== null && ctx.air?.aqi !== undefined
      ? `CPCB AQI is ${ctx.air.aqi} (${ctx.air.category})`
      : `CPCB AQI is unavailable (${ctx.air?.unavailableReason ?? "insufficient data"})`;

  return {
    text: `In ${ctx.location?.city ?? "your area"}, ${aqiStr}. Prefer cleaner afternoon windows for outdoor activity and keep indoor spaces ventilated only when outdoor air improves.`,
    dataLimitations:
      ctx.limits.length > 0
        ? ctx.limits
        : ["Deterministic summary used while AI explanation is unavailable."],
  };
}

export async function generateValidatedJson<T>(params: {
  schema: z.ZodType<T>;
  ctx: AiContext;
  userPrompt: string;
  fallback: () => T;
  client?: GeminiClientLike | null;
}): Promise<{ data: T; aiUnavailable: boolean; retried: boolean }> {
  const client =
    params.client === undefined ? createSdkGeminiClient() : params.client;
  if (!client) {
    return { data: params.fallback(), aiUnavailable: true, retried: false };
  }

  let prompt = `CONTEXT:\n${JSON.stringify(params.ctx)}\n\nTASK:\n${params.userPrompt}`;
  let retried = false;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await client.generateJson({
        systemInstruction: AERIQ_SYSTEM_PROMPT,
        prompt,
        temperature: 0.3,
        maxOutputTokens: 1024,
      });

      const parsed = params.schema.safeParse(JSON.parse(raw));
      if (!parsed.success) {
        retried = true;
        prompt = `${prompt}\n\nYour previous response did not match the JSON schema. Reply only with valid JSON matching the schema.`;
        continue;
      }

      const invented = findInventedNumber(collectStrings(parsed.data), params.ctx);
      if (invented !== null) {
        retried = true;
        prompt = `${prompt}\n\nYou used a number not in CONTEXT: ${invented}. Use only numbers from CONTEXT.`;
        continue;
      }

      return { data: parsed.data, aiUnavailable: false, retried };
    } catch {
      retried = true;
    }
  }

  return { data: params.fallback(), aiUnavailable: true, retried };
}

export async function generateDailyRecommendation(
  ctx: AiContext,
  client?: GeminiClientLike | null
) {
  return generateValidatedJson({
    schema: DailyRecommendationSchema,
    ctx,
    userPrompt:
      "Generate today's DailyRecommendation JSON explaining the validated readings and forecast windows.",
    fallback: () => buildDeterministicDailyFallback(ctx),
    client,
  });
}

export async function generateChatReply(
  ctx: AiContext,
  message: string,
  client?: GeminiClientLike | null
) {
  return generateValidatedJson({
    schema: ChatReplySchema,
    ctx,
    userPrompt: `Answer the user's question using CONTEXT only. Question: ${message}`,
    fallback: () => buildDeterministicChatFallback(ctx),
    client,
  });
}
