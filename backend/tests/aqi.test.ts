import { describe, expect, it } from "vitest";
import {
  computeCpcbAqi,
  computeSubIndex,
  type StationHourlyReading,
} from "@/server/engines/aqi";
import type { Pollutant } from "@/contracts";

const WINDOW_END = "2026-11-27T12:00:00.000Z";

function makeHourlySeries(
  pollutant: Pollutant,
  value: number,
  hours: number,
  unit = pollutant === "co" ? "mg/m³" : "µg/m³",
  provider = "cpcb"
): StationHourlyReading[] {
  const endMs = new Date(WINDOW_END).getTime();
  return Array.from({ length: hours }, (_, i) => ({
    pollutant,
    value,
    unit,
    observedAt: new Date(endMs - i * 3600 * 1000).toISOString(),
    provider,
    stationId: "st-1",
    stationName: "Rabindra Bharati",
  }));
}

describe("CPCB AQI Engine", () => {
  it("computes the worked check: PM2.5 at 45 µg/m³ = 75", () => {
    expect(computeSubIndex("pm25", 45)).toBe(75);
  });

  it("checks band edges across all pollutants", () => {
    expect(computeSubIndex("pm10", 50)).toBe(50);
    expect(computeSubIndex("pm10", 100)).toBe(100);
    expect(computeSubIndex("pm25", 30)).toBe(50);
    expect(computeSubIndex("pm25", 60)).toBe(100);
    expect(computeSubIndex("no2", 40)).toBe(50);
    expect(computeSubIndex("o3", 50)).toBe(50);
    expect(computeSubIndex("co", 1.0)).toBe(50);
    expect(computeSubIndex("so2", 40)).toBe(50);
    expect(computeSubIndex("nh3", 200)).toBe(50);
    expect(computeSubIndex("pb", 0.5)).toBe(50);
  });

  it("caps readings above the Severe floor at 500", () => {
    expect(computeSubIndex("pm25", 999)).toBe(500);
    expect(computeSubIndex("pm10", 1500)).toBe(500);
  });

  it("returns aqi: null with 15 hours of PM2.5 and valid AQI with 16 hours", () => {
    const baseOther = [
      ...makeHourlySeries("no2", 40, 18),
      ...makeHourlySeries("so2", 30, 18),
    ];

    const res15 = computeCpcbAqi(
      [...makeHourlySeries("pm25", 92, 15), ...baseOther],
      WINDOW_END
    );
    expect(res15.aqi).toBeNull();
    expect(res15.unavailableReason).toContain("incomplete");

    const res16 = computeCpcbAqi(
      [...makeHourlySeries("pm25", 92, 16), ...baseOther],
      WINDOW_END
    );
    expect(res16.aqi).not.toBeNull();
    expect(res16.category).toBe("poor");
    expect(res16.dominantPollutants).toEqual(["pm25"]);
  });

  it("returns aqi: null when 3 pollutants are present but neither PM2.5 nor PM10", () => {
    const res = computeCpcbAqi(
      [
        ...makeHourlySeries("no2", 60, 18),
        ...makeHourlySeries("so2", 50, 18),
        ...makeHourlySeries("co", 1.5, 8),
      ],
      WINDOW_END
    );
    expect(res.aqi).toBeNull();
    expect(res.unavailableReason).toContain("PM2.5 nor PM10");
  });

  it("lists all ties in dominantPollutants", () => {
    const res = computeCpcbAqi(
      [
        ...makeHourlySeries("pm25", 30, 18), // subIndex = 50
        ...makeHourlySeries("pm10", 50, 18), // subIndex = 50
        ...makeHourlySeries("no2", 40, 18), // subIndex = 50
      ],
      WINDOW_END
    );
    expect(res.aqi).toBe(50);
    expect(res.dominantPollutants).toEqual(["pm25", "pm10", "no2"]);
  });

  it("throws if CO is passed in µg/m³ by mistake", () => {
    expect(() =>
      computeCpcbAqi(makeHourlySeries("co", 1200, 8, "µg/m³"), WINDOW_END)
    ).toThrow(/mg\/m³/);
  });

  it("throws if non-CPCB provider readings are passed", () => {
    expect(() =>
      computeCpcbAqi(
        makeHourlySeries("pm25", 45, 16, "µg/m³", "openaq"),
        WINDOW_END
      )
    ).toThrow(/CPCB/);
  });
});
