import { describe, expect, it } from "vitest";
import { buildContext } from "@/server/ai/context";
import {
  findInventedNumber,
  generateChatReply,
  type GeminiClientLike,
} from "@/server/ai/gemini";
import { classifySafety } from "@/server/ai/safety";
import { computeFreshness } from "@/server/engines/freshness";
import {
  MOCK_AQI_RESULT,
  MOCK_READINGS,
  MOCK_STATION,
  MOCK_WEATHER,
} from "@/mocks/fixtures";

function sampleCtx() {
  return buildContext({
    location: {
      city: "Kolkata",
      areaLabel: "Rabindra Bharati",
      stationName: MOCK_STATION.name,
      distanceKm: 2.1,
    },
    aqi: MOCK_AQI_RESULT,
    readings: MOCK_READINGS,
    forecast: [{ hourLabel: "15:00 IST", category: "moderate", kind: "forecast" }],
    weather: MOCK_WEATHER,
    profile: {
      firstName: "Aarav",
      lifestyle: "professional",
      transportModes: ["metro"],
      activities: [{ name: "Run", preferredTime: "18:00" }],
    },
    family: [{ ageGroup: "child", lifestyle: "student" }],
  });
}

describe("Gemini AI Layer", () => {
  it("catches invented numbers not present in CONTEXT", () => {
    const ctx = sampleCtx();
    expect(findInventedNumber("CPCB AQI is 212 and PM2.5 is 92 µg/m³.", ctx)).toBeNull();
    expect(findInventedNumber("CPCB AQI is 350 today.", ctx)).toBe(350);
  });

  it("retries on schema/invented-number failure and falls back deterministically", async () => {
    const ctx = sampleCtx();
    let calls = 0;
    const badClient: GeminiClientLike = {
      async generateJson() {
        calls++;
        // Always returns an invented AQI number 999
        return {
          text: JSON.stringify({
            text: "AQI is 999 today.",
            dataLimitations: ["Test"],
          }),
          tokensIn: 10,
          tokensOut: 10,
        };
      },
    };

    const res = await generateChatReply(ctx, "Can I run?", "user-1", [], badClient);
    expect(calls).toBe(2);
    expect(res.retried).toBe(true);
    expect(res.aiUnavailable).toBe(true);
    expect(res.data.text).toContain("212");
  });

  it("classifies safety deterministically without calling Gemini", () => {
    expect(classifySafety("I have chest pain and trouble breathing")).toBe("emergency");
    expect(classifySafety("I have a mild cough and sore throat")).toBe("health_symptom");
    expect(classifySafety("Is it OK to run this evening?")).toBe("none");
  });

  it("does not retry on 429 quota errors and hits 30-min cache on identical chat", async () => {
    const ctx = sampleCtx();
    let quotaCalls = 0;
    const quotaClient: GeminiClientLike = {
      async generateJson() {
        quotaCalls++;
        throw new Error("429 RESOURCE_EXHAUSTED");
      },
    };
    const qRes = await generateChatReply(ctx, "Quota test?", "user-q", [], quotaClient);
    expect(quotaCalls).toBe(1);
    expect(qRes.aiUnavailable).toBe(true);

    let cacheCalls = 0;
    const okClient: GeminiClientLike = {
      async generateJson() {
        cacheCalls++;
        return {
          text: JSON.stringify({
            text: "CPCB AQI is 212 today.",
            dataLimitations: ["Test"],
          }),
          tokensIn: 12,
          tokensOut: 8,
        };
      },
    };
    const r1 = await generateChatReply(ctx, "Cache test question", "user-c", [], okClient);
    const r2 = await generateChatReply(ctx, "Cache test question", "user-c", [], okClient);
    expect(r1.cacheHit).toBe(false);
    expect(r2.cacheHit).toBe(true);
    expect(cacheCalls).toBe(1);
  });

  it("checks freshness boundaries at 89, 91, 179, and 181 minutes", () => {
    const now = new Date("2026-11-27T12:00:00.000Z").getTime();
    const ago = (m: number) => new Date(now - m * 60000).toISOString();
    expect(computeFreshness(ago(89), now)).toBe("fresh");
    expect(computeFreshness(ago(91), now)).toBe("aging");
    expect(computeFreshness(ago(179), now)).toBe("aging");
    expect(computeFreshness(ago(181), now)).toBe("stale");
  });
});
