import { describe, expect, it } from "vitest";
import { DailyRecommendationSchema } from "@/contracts";
import { buildDeterministicDailyFallback } from "@/server/ai/gemini";
import { evaluateIndoorRules } from "@/server/engines/indoor";
import { buildPlan, type HourlyWindow } from "@/server/engines/planner";

describe("Phase 5 — Docs alignment", () => {
  it("DailyRecommendationSchema & fallback include all extended fields", () => {
    const rec = buildDeterministicDailyFallback({
      location: { city: "Kolkata", areaLabel: "Home", stationName: "Bidhannagar", distanceKm: 2 },
      air: {
        aqi: 140,
        category: "moderate",
        dominantPollutants: ["pm25"],
        unavailableReason: null,
        provider: "cpcb",
        observedAt: "2026-11-28T05:00:00Z",
        freshness: "fresh",
      },
      savedScenarios: [{ baselineMode: "car", avoidedPerWeek: 12.5, avoidedPerYear: 650 }],
      limits: [],
    });

    expect(DailyRecommendationSchema.safeParse(rec).success).toBe(true);
    expect(rec.indoorAirRecommendations.length).toBeGreaterThan(0);
    expect(rec.impactExplanation).toContain("12.5");
  });

  it("family-aware planner swaps to indoor at Moderate when child or older_adult is in household", () => {
    const windows: HourlyWindow[] = [
      { hour: 7, aqi: 130, category: "moderate", provider: "cpcb", kind: "observation" },
      { hour: 8, aqi: 130, category: "moderate", provider: "cpcb", kind: "observation" },
    ];
    const acts = [{ id: "walk", title: "Morning walk", preferredHour: 7, flexible: true, type: "walk" as const }];

    const standard = buildPlan(acts, windows, "2026-11-28T05:00:00Z", { hasVulnerableMember: false });
    expect(standard.activities[0].setting).toBe("outdoor");

    const vulnerable = buildPlan(acts, windows, "2026-11-28T05:00:00Z", { hasVulnerableMember: true });
    expect(vulnerable.activities[0].setting).toBe("indoor");
    expect(vulnerable.activities[0].indoorAlternative).not.toBeNull();
  });

  it("evaluateIndoorRules adds family tips when child or older_adult is present", () => {
    const res = evaluateIndoorRules(
      "moderate",
      {
        cookingFuel: "electric",
        incense: false,
        indoorSmoking: false,
        pets: false,
        constructionNearby: false,
        hasPurifier: false,
        roomSizeM2: null,
      },
      [{ hour: 12, aqi: 120, category: "moderate", provider: "cpcb", kind: "observation" }],
      [{ ageGroup: "child" }, { ageGroup: "older_adult" }]
    );

    const keys = res.matches.map((m) => m.key);
    expect(keys).toContain("family_child");
    expect(keys).toContain("family_older_adult");
  });
});
