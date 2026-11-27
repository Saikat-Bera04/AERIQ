import { describe, expect, it } from "vitest";
import { buildContext } from "@/server/ai/context";
import {
  findInventedNumber,
  generateChatReply,
} from "@/server/ai/gemini";
import { classifySafety, type GeminiClientLike } from "@/server/ai/safety";
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
        return JSON.stringify({
          text: "AQI is 999 today.",
          dataLimitations: ["Test"],
        });
      },
    };

    const res = await generateChatReply(ctx, "Can I run?", badClient);
    expect(calls).toBe(2);
    expect(res.retried).toBe(true);
    expect(res.aiUnavailable).toBe(true);
    expect(res.data.text).toContain("212");
  });

  it("passes through safety flag from classifier", async () => {
    const mockEmergencyClient: GeminiClientLike = {
      async generateJson() {
        return JSON.stringify({ flag: "emergency" });
      },
    };
    const flag = await classifySafety("I have chest pain and trouble breathing", mockEmergencyClient);
    expect(flag).toBe("emergency");
  });
});
