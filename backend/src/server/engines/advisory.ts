import type { AqiCategorySlug, Freshness } from "@/contracts";

export type AdvisoryActivity = "commute" | "study" | "exercise" | "indoor" | "general";

export interface AdvisoryRule {
  code: string;
  activity: AdvisoryActivity;
  categories?: (AqiCategorySlug | null)[];
  freshness?: Freshness[];
  lifestyles?: string[];
  ageGroups?: string[];
  activities?: string[];
  text: string;
}

export interface AdvisoryItem {
  code: string;
  activity: AdvisoryActivity;
  text: string;
}

export const ADVISORY_RULES: AdvisoryRule[] = [
  {
    code: "ADV_DATA_STALE",
    activity: "general",
    freshness: ["stale"],
    text: "Station readings are stale (>3 hours old). Treat current AQI as an older snapshot and check forecast trends before outdoor exertion.",
  },
  {
    code: "ADV_DATA_AGING",
    activity: "general",
    freshness: ["aging"],
    text: "Latest station reading is aging (90–180 minutes old). Re-check before peak commute or exercise.",
  },
  {
    code: "ADV_AQI_UNAVAILABLE",
    activity: "general",
    categories: [null],
    text: "CPCB AQI is unavailable due to incomplete station pollutants. Follow conservative indoor precautions until readings qualify.",
  },
  {
    code: "ADV_COMMUTE_SEVERE",
    activity: "commute",
    categories: ["poor", "very_poor", "severe"],
    text: "Use covered metro or closed-window transit for your commute and avoid prolonged roadside waiting.",
  },
  {
    code: "ADV_COMMUTE_MODERATE",
    activity: "commute",
    categories: ["moderate"],
    text: "Keep vehicle windows closed in heavy traffic corridors during your commute.",
  },
  {
    code: "ADV_EXERCISE_POOR",
    activity: "exercise",
    categories: ["poor", "very_poor", "severe"],
    text: "Move high-exertion outdoor exercise indoors; elevated particulates increase inhaled dose.",
  },
  {
    code: "ADV_EXERCISE_MODERATE_VULNERABLE",
    activity: "exercise",
    categories: ["moderate"],
    ageGroups: ["child", "older_adult"],
    text: "Household includes children or older adults — shift outdoor exercise indoors at Moderate air.",
  },
  {
    code: "ADV_EXERCISE_GOOD",
    activity: "exercise",
    categories: ["good", "satisfactory"],
    text: "Air quality supports outdoor exercise; prefer morning or tree-lined routes.",
  },
  {
    code: "ADV_STUDY_POOR",
    activity: "study",
    categories: ["poor", "very_poor", "severe"],
    text: "Keep study sessions indoors with street-facing windows closed.",
  },
  {
    code: "ADV_STUDY_CLEAN",
    activity: "study",
    categories: ["good", "satisfactory", "moderate"],
    text: "Brief cross-ventilation in study spaces helps keep indoor CO2 low.",
  },
  {
    code: "ADV_LIFESTYLE_STUDENT",
    activity: "general",
    categories: ["moderate", "poor", "very_poor", "severe"],
    lifestyles: ["student"],
    text: "Schedule campus walks and outdoor breaks during cleaner afternoon windows.",
  },
  {
    code: "ADV_LIFESTYLE_PROFESSIONAL",
    activity: "commute",
    categories: ["poor", "very_poor", "severe"],
    lifestyles: ["professional"],
    text: "Avoid idling near arterial roads during office commute peaks.",
  },
  {
    code: "ADV_LIFESTYLE_HOMEMAKER",
    activity: "indoor",
    categories: ["poor", "very_poor", "severe"],
    lifestyles: ["homemaker"],
    text: "Run kitchen exhaust during cooking and delay street-side window airing until air improves.",
  },
  {
    code: "ADV_LIFESTYLE_RETIRED",
    activity: "general",
    categories: ["moderate", "poor", "very_poor", "severe"],
    lifestyles: ["retired"],
    text: "Prefer indoor mobility or shaded morning walks only when air is Satisfactory or better.",
  },
  {
    code: "ADV_AGE_CHILD",
    activity: "general",
    categories: ["moderate", "poor", "very_poor", "severe"],
    ageGroups: ["child"],
    text: "Limit prolonged outdoor play for children when AQI is Moderate or worse.",
  },
  {
    code: "ADV_AGE_OLDER_ADULT",
    activity: "general",
    categories: ["moderate", "poor", "very_poor", "severe"],
    ageGroups: ["older_adult"],
    text: "Older adults should avoid strenuous outdoor exertion when AQI reaches Moderate or worse.",
  },
];

export function evaluateAdvisories(input: {
  category: AqiCategorySlug | null;
  freshness: Freshness;
  lifestyle?: string;
  ageGroups?: string[];
  activities?: string[];
}): AdvisoryItem[] {
  const ageSet = new Set(input.ageGroups ?? []);
  const actSet = new Set(input.activities ?? []);
  const matched: AdvisoryItem[] = [];

  for (const rule of ADVISORY_RULES) {
    if (rule.categories && !rule.categories.includes(input.category)) continue;
    if (rule.freshness && !rule.freshness.includes(input.freshness)) continue;
    if (rule.lifestyles && (!input.lifestyle || !rule.lifestyles.includes(input.lifestyle))) continue;
    if (rule.ageGroups && !rule.ageGroups.some((ag) => ageSet.has(ag))) continue;
    if (rule.activities && !rule.activities.some((a) => actSet.has(a))) continue;

    matched.push({
      code: rule.code,
      activity: rule.activity,
      text: rule.text,
    });
  }

  return matched;
}
