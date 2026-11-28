import crypto from "node:crypto";
import type { AqiCategorySlug, ReadingKind } from "@/contracts";

export interface PlannerInputActivity {
  id: string;
  title: string;
  preferredHour: number; // 6..23 IST
  durationHours?: number;
  flexible: boolean;
  type?: "exercise" | "study" | "walk" | "commute" | "other";
}

export interface HourlyWindow {
  hour: number; // 6..23
  hourLabel?: string;
  aqi: number | null;
  category: AqiCategorySlug;
  provider: string;
  kind: ReadingKind;
}

export interface BuiltPlanActivity {
  id: string;
  title: string;
  startHour: number;
  endHour: number;
  setting: "outdoor" | "indoor";
  expectedAqi: number | null;
  expectedCategory: AqiCategorySlug;
  reason: string;
  indoorAlternative: { title: string; reason: string } | null;
}

const CATEGORY_RANK: Record<AqiCategorySlug, number> = {
  good: 1,
  satisfactory: 2,
  moderate: 3,
  poor: 4,
  very_poor: 5,
  severe: 6,
};

const INDOOR_ALTERNATIVES: Record<
  NonNullable<PlannerInputActivity["type"]>,
  { title: string; reason: string }
> = {
  exercise: {
    title: "Indoor workout / mobility session",
    reason: "Avoids elevated outdoor particulates during high breathing rate",
  },
  study: {
    title: "Library or home desk study",
    reason: "Keeps study session indoors while outdoor air is poor",
  },
  walk: {
    title: "Indoor track or mall walk",
    reason: "Maintains daily steps without outdoor particulate exposure",
  },
  commute: {
    title: "Covered Metro / closed-window transit",
    reason: "Reduces roadside exposure compared to open-air travel",
  },
  other: {
    title: "Indoor alternative",
    reason: "Outdoor air is Poor or worse in all nearby windows",
  },
};

export function computePlanInputsHash(
  activities: PlannerInputActivity[],
  hourlyWindows: HourlyWindow[]
): string {
  const payload = JSON.stringify({
    activities: activities.map((a) => ({
      id: a.id,
      preferredHour: a.preferredHour,
      flexible: a.flexible,
    })),
    categories: hourlyWindows.map((w) => ({
      hour: w.hour,
      category: w.category,
    })),
  });
  return crypto.createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

export function buildPlan(
  activities: PlannerInputActivity[],
  hourlyWindows: HourlyWindow[],
  nowIso: string,
  options?: { hasVulnerableMember?: boolean }
) {
  const byHour = new Map(hourlyWindows.map((w) => [w.hour, w]));
  const swapThresholdRank = options?.hasVulnerableMember ? 3 : 4;

  const built: BuiltPlanActivity[] = activities.map((act) => {
    const duration = act.durationHours ?? 1;

    if (!act.flexible) {
      const win = byHour.get(act.preferredHour) ?? hourlyWindows[0];
      return {
        id: act.id,
        title: act.title,
        startHour: act.preferredHour,
        endHour: Math.min(23, act.preferredHour + duration),
        setting: "outdoor",
        expectedAqi: win?.aqi ?? null,
        expectedCategory: win?.category ?? "moderate",
        reason: `Fixed time — expected air quality is ${win?.category ?? "moderate"}.`,
        indoorAlternative: null,
      };
    }

    // Score candidate start within +/- 3 hours
    let bestHour = act.preferredHour;
    let bestScore = Infinity;
    let bestWorstCat: AqiCategorySlug = "moderate";

    for (let delta = -3; delta <= 3; delta++) {
      const candidate = act.preferredHour + delta;
      if (candidate < 6 || candidate > 23) continue;

      let worstRank = 0;
      let worstCat: AqiCategorySlug = "good";
      for (let h = candidate; h < Math.min(24, candidate + duration); h++) {
        const w = byHour.get(h);
        if (!w) continue;
        const r = CATEGORY_RANK[w.category];
        if (r > worstRank) {
          worstRank = r;
          worstCat = w.category;
        }
      }

      if (worstRank === 0) continue;
      const score = worstRank * 10 + Math.abs(delta);
      if (score < bestScore) {
        bestScore = score;
        bestHour = candidate;
        bestWorstCat = worstCat;
      }
    }

    const chosenWin = byHour.get(bestHour) ?? hourlyWindows[0];
    const isPoorOrWorse = CATEGORY_RANK[bestWorstCat] >= swapThresholdRank;
    const alt = INDOOR_ALTERNATIVES[act.type ?? "other"];

    return {
      id: act.id,
      title: act.title,
      startHour: bestHour,
      endHour: Math.min(23, bestHour + duration),
      setting: isPoorOrWorse ? "indoor" : "outdoor",
      expectedAqi: chosenWin?.aqi ?? null,
      expectedCategory: bestWorstCat,
      reason: isPoorOrWorse
        ? options?.hasVulnerableMember && CATEGORY_RANK[bestWorstCat] === 3
          ? `Moved indoors: ${bestWorstCat} air and household includes child or older adult.`
          : `Best nearby window is ${bestWorstCat}; moved indoors.`
        : bestHour !== act.preferredHour
          ? `Moved to ${bestHour}:00 IST for cleaner ${bestWorstCat} air.`
          : `Scheduled at preferred hour (${bestWorstCat} air).`,
      indoorAlternative: isPoorOrWorse ? alt : null,
    };
  });

  return {
    builtAt: nowIso,
    inputsHash: computePlanInputsHash(activities, hourlyWindows),
    activities: built,
    windowStrip: hourlyWindows,
  };
}

export interface PlanActivityOverlapCheck {
  start: Date;
  end: Date;
  expectedCategory: string | null;
}

export function getIstHour(date: Date): number {
  const istMs = date.getTime() + 5.5 * 3600 * 1000;
  return new Date(istMs).getUTCHours();
}

export function shouldMarkPlanStale(
  activities: PlanActivityOverlapCheck[],
  hourlyCategories: Map<number, AqiCategorySlug>,
  minHourIst = 0
): boolean {
  for (const act of activities) {
    const startH = getIstHour(act.start);
    const rawEndH = getIstHour(act.end);
    const endH = rawEndH <= startH ? startH + 1 : rawEndH;

    for (let h = startH; h < endH; h++) {
      if (h < minHourIst) continue;
      const latestCat = hourlyCategories.get(h);
      if (latestCat && act.expectedCategory && latestCat !== act.expectedCategory) {
        return true;
      }
    }
  }
  return false;
}
