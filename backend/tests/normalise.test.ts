import { describe, expect, it } from "vitest";
import { normaliseSamples } from "@/server/providers/normalise";

describe("Provider Normaliser", () => {
  const nowMs = new Date("2026-11-27T04:00:00.000Z").getTime();

  it("converts Open-Meteo CO µg/m³ to mg/m³ and parses zoneless IST as UTC", () => {
    const res = normaliseSamples(
      [
        {
          provider: "openmeteo",
          stationId: "om-1",
          stationName: "Kolkata Grid",
          pollutantRaw: "carbon_monoxide",
          value: 1400,
          unitRaw: "µg/m³",
          averaging: "hourly",
          observedAtRaw: "2026-11-27 08:30:00", // 08:30 IST = 03:00 UTC
          kind: "observation",
        },
      ],
      nowMs
    );

    expect(res.accepted).toHaveLength(1);
    expect(res.accepted[0].pollutant).toBe("co");
    expect(res.accepted[0].value).toBe(1.4);
    expect(res.accepted[0].unit).toBe("mg/m³");
    expect(res.accepted[0].observedAt).toBe("2026-11-27T03:00:00.000Z");
  });

  it("rejects negative values, values above physical ceiling, and future timestamps", () => {
    const res = normaliseSamples(
      [
        {
          provider: "cpcb",
          stationId: "st-1",
          stationName: "Test",
          pollutantRaw: "pm25",
          value: -5,
          unitRaw: "µg/m³",
          averaging: "hourly",
          observedAtRaw: "2026-11-27T03:30:00.000Z",
          kind: "observation",
        },
        {
          provider: "cpcb",
          stationId: "st-1",
          stationName: "Test",
          pollutantRaw: "pm25",
          value: 2500,
          unitRaw: "µg/m³",
          averaging: "hourly",
          observedAtRaw: "2026-11-27T03:30:00.000Z",
          kind: "observation",
        },
        {
          provider: "cpcb",
          stationId: "st-1",
          stationName: "Test",
          pollutantRaw: "pm25",
          value: 50,
          unitRaw: "µg/m³",
          averaging: "hourly",
          observedAtRaw: "2026-11-27T05:00:00.000Z", // 1h in future
          kind: "observation",
        },
      ],
      nowMs
    );

    expect(res.accepted).toHaveLength(0);
    expect(res.rejected).toHaveLength(3);
  });
});
