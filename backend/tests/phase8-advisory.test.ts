import { describe, expect, it } from "vitest";
import { ADVISORY_RULES, evaluateAdvisories } from "@/server/engines/advisory";

describe("Phase 8 — Deterministic advisory engine", () => {
  it("evaluates every rule in ADVISORY_RULES when matching criteria are passed", () => {
    const triggered = new Set<string>();

    const scenarios: Parameters<typeof evaluateAdvisories>[0][] = [
      { category: null, freshness: "stale" },
      { category: "poor", freshness: "aging", lifestyle: "professional", ageGroups: ["child"] },
      { category: "moderate", freshness: "fresh", lifestyle: "student", ageGroups: ["child", "older_adult"] },
      { category: "good", freshness: "fresh" },
      { category: "very_poor", freshness: "fresh", lifestyle: "homemaker" },
      { category: "severe", freshness: "fresh", lifestyle: "retired" },
    ];

    for (const s of scenarios) {
      for (const item of evaluateAdvisories(s)) {
        triggered.add(item.code);
      }
    }

    for (const rule of ADVISORY_RULES) {
      expect(triggered.has(rule.code), `Rule ${rule.code} should be covered`).toBe(true);
    }
  });
});
