import { describe, expect, it } from "vitest";
import { buildPlan, type HourlyWindow } from "@/server/engines/planner";
import { computeCommuteEmissions } from "@/server/engines/emissions";
import { computePurifierGuidance } from "@/server/engines/indoor";
import { computeExposureIndicator } from "@/server/engines/exposure";
import { MOCK_EMISSION_FACTORS } from "@/mocks/fixtures";

describe("Planner, Emissions, Indoor & Exposure Engines", () => {
  it("moves a flexible run to a cleaner morning hour", () => {
    const windows: HourlyWindow[] = [
      { hour: 6, aqi: 70, category: "satisfactory", provider: "cpcb", kind: "observation" },
      { hour: 7, aqi: 120, category: "moderate", provider: "cpcb", kind: "observation" },
      { hour: 8, aqi: 220, category: "poor", provider: "openmeteo", kind: "forecast" },
      { hour: 9, aqi: 240, category: "poor", provider: "openmeteo", kind: "forecast" },
    ];
    const plan = buildPlan(
      [{ id: "run", title: "Morning run", preferredHour: 8, flexible: true, type: "exercise" }],
      windows,
      "2026-11-27T01:00:00.000Z"
    );
    expect(plan.activities[0].startHour).toBe(6);
    expect(plan.activities[0].setting).toBe("outdoor");
  });

  it("gives indoor alternatives on an all-Poor day and never moves fixed activities", () => {
    const windows: HourlyWindow[] = [
      { hour: 7, aqi: 220, category: "poor", provider: "cpcb", kind: "observation" },
      { hour: 8, aqi: 230, category: "poor", provider: "cpcb", kind: "observation" },
      { hour: 9, aqi: 240, category: "poor", provider: "openmeteo", kind: "forecast" },
    ];
    const plan = buildPlan(
      [
        { id: "run", title: "Run", preferredHour: 8, flexible: true, type: "exercise" },
        { id: "school", title: "School run", preferredHour: 8, flexible: false, type: "commute" },
      ],
      windows,
      "2026-11-27T01:00:00.000Z"
    );
    expect(plan.activities[0].setting).toBe("indoor");
    expect(plan.activities[0].indoorAlternative).not.toBeNull();
    expect(plan.activities[1].startHour).toBe(8);
  });

  it("computes 10 km x 10 trips emissions and errors on missing factor", () => {
    const res = computeCommuteEmissions(
      { distanceKm: 10, tripsPerWeek: 10, baselineMode: "car", alternativeModes: ["metro", "walking"] },
      MOCK_EMISSION_FACTORS
    );
    expect(res.perMode[0].kgPerWeek).toBe(18.4);
    expect(res.perMode[2].kgPerWeek).toBe(0);
    expect(res.perMode[2].label).toBe("Zero tailpipe");

    expect(() =>
      computeCommuteEmissions(
        { distanceKm: 10, tripsPerWeek: 10, baselineMode: "car", alternativeModes: ["bus"] },
        []
      )
    ).toThrow(/Missing emission factor/);
  });

  it("computes purifier CADR: 12 m² -> 162 m³/h", () => {
    const g = computePurifierGuidance(12);
    expect(g.requiredCadrM3h).toBe(162);
    expect(g.filtration).toBe("HEPA");
  });

  it("returns exposure unavailable when route concentration data is missing", () => {
    const unavailable = computeExposureIndicator([{ mode: "car", minutes: 30 }], null);
    expect(unavailable.available).toBe(false);

    const ok = computeExposureIndicator(
      [{ mode: "car", minutes: 30 }, { mode: "metro", minutes: 30 }],
      { car: 120, metro: 45 }
    );
    expect(ok.available).toBe(true);
    if (ok.available) {
      expect(ok.perOption[0].indicator).toBe(60);
      expect(ok.perOption[1].indicator).toBe(23);
    }
  });
});
