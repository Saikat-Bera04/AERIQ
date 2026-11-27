import { describe, expect, it } from "vitest";
import {
  AqiResultSchema,
  DailyRecommendationSchema,
  EmissionFactorSchema,
  ReadingSchema,
} from "@/contracts";
import {
  MOCK_AQI_RESULT,
  MOCK_DAILY_RECOMMENDATION,
  MOCK_EMISSION_FACTORS,
  MOCK_READINGS,
} from "@/mocks/fixtures";
import {
  roundPointTo500m,
  sanitiseReportDescription,
} from "@/server/lib/privacy";
import { syncLiveLocation } from "@/server/services";

describe("Contracts & Privacy", () => {
  it("validates all mock fixtures against Zod contracts", () => {
    expect(() => AqiResultSchema.parse(MOCK_AQI_RESULT)).not.toThrow();
    MOCK_READINGS.forEach((r) => expect(() => ReadingSchema.parse(r)).not.toThrow());
    expect(() =>
      DailyRecommendationSchema.parse(MOCK_DAILY_RECOMMENDATION)
    ).not.toThrow();
    MOCK_EMISSION_FACTORS.forEach((f) =>
      expect(() => EmissionFactorSchema.parse(f)).not.toThrow()
    );
  });

  it("rounds coordinates to 0.005° grid and sanitises report descriptions", () => {
    const p = roundPointTo500m(22.5726, 88.3639);
    expect(p.lat).toBe(22.575);
    expect(p.lng).toBe(88.365);

    const cleaned = sanitiseReportDescription(
      "Smoke near https://evil.example.com call me at 9876543210 or test@example.com"
    );
    expect(cleaned.ok).toBe(true);
    expect(cleaned.text).not.toContain("evil.example.com");
    expect(cleaned.text).not.toContain("9876543210");
    expect(cleaned.text).not.toContain("test@example.com");
  });

  it("syncs live location with 500 m rounded coordinates and nearest station", async () => {
    const res = await syncLiveLocation("user-1", {
      lat: 28.5918,
      lng: 77.2273,
      autoSync: true,
    });
    expect(res.location.roundedPoint).toEqual({ lat: 28.59, lng: 77.225 });
    expect(res.station.city).toBe("New Delhi");
    expect(res.station.name).toBe("Lodhi Road");
    expect(res.aqi.aqi).toBe(286);
  });
});
