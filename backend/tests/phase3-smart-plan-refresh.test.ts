import { describe, expect, it } from "vitest";
import { shouldMarkPlanStale } from "@/server/engines/planner";
import type { AqiCategorySlug } from "@/contracts";

describe("Phase 3 — Smart plan refresh", () => {
  const activities = [
    {
      // 07:00 - 08:00 IST (01:30 - 02:30 UTC)
      start: new Date("2026-11-28T07:00:00+05:30"),
      end: new Date("2026-11-28T08:00:00+05:30"),
      expectedCategory: "moderate",
    },
    {
      // 18:00 - 19:00 IST
      start: new Date("2026-11-28T18:00:00+05:30"),
      end: new Date("2026-11-28T19:00:00+05:30"),
      expectedCategory: "moderate",
    },
  ];

  it("unchanged data leaves the plan current", () => {
    const hourly = new Map<number, AqiCategorySlug>([
      [7, "moderate"],
      [12, "moderate"],
      [18, "moderate"],
    ]);
    expect(shouldMarkPlanStale(activities, hourly, 6)).toBe(false);
  });

  it("category change outside planned hours leaves the plan current", () => {
    const hourly = new Map<number, AqiCategorySlug>([
      [7, "moderate"],
      [12, "severe"], // outside 07-08 and 18-19
      [15, "very_poor"], // outside planned hours
      [18, "moderate"],
    ]);
    expect(shouldMarkPlanStale(activities, hourly, 6)).toBe(false);
  });

  it("category change inside a planned hour marks the plan stale", () => {
    const hourly = new Map<number, AqiCategorySlug>([
      [7, "moderate"],
      [18, "poor"], // inside 18-19 planned hour
    ]);
    expect(shouldMarkPlanStale(activities, hourly, 6)).toBe(true);
  });
});
