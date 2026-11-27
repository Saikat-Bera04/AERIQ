import type { Freshness } from "@/contracts";

export const FRESHNESS_THRESHOLDS = {
  freshMin: 90,
  agingMin: 180,
} as const;

export function computeFreshness(
  observedAtIso: string,
  nowMs: number = Date.now(),
  thresholds = FRESHNESS_THRESHOLDS
): Freshness {
  const observedMs = new Date(observedAtIso).getTime();
  if (Number.isNaN(observedMs)) return "stale";
  const ageMin = (nowMs - observedMs) / 60000;
  if (ageMin <= thresholds.freshMin) return "fresh";
  if (ageMin <= thresholds.agingMin) return "aging";
  return "stale";
}
