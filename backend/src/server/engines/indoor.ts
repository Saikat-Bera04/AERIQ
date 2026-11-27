import type { AqiCategorySlug, IndoorProfile } from "@/contracts";
import type { HourlyWindow } from "./planner";

export interface IndoorRuleMatch {
  group: "ventilation" | "sources" | "purifier" | "cleaning";
  key: string;
  title: string;
  body: string;
}

export const INDOOR_RULES_VERSION = "indoor-rules-1.0";

export function computePurifierGuidance(
  roomSizeM2: number,
  ceilingHeightM = 2.7,
  targetAirChanges = 5
) {
  const requiredCadrM3h = Math.round(roomSizeM2 * ceilingHeightM * targetAirChanges);
  return {
    requiredCadrM3h,
    inputs: { roomSizeM2, ceilingHeightM, targetAirChanges },
    filtration: "HEPA",
    note: "General guidance — check the purifier's rated coverage.",
  };
}

export function evaluateIndoorRules(
  outdoorCategory: AqiCategorySlug,
  profile: IndoorProfile,
  hourlyWindows: HourlyWindow[]
): {
  ventilation: { state: string; nextGoodWindow: string | null };
  matches: IndoorRuleMatch[];
  purifier: ReturnType<typeof computePurifierGuidance> | null;
} {
  const isPoorOrWorse =
    outdoorCategory === "poor" ||
    outdoorCategory === "very_poor" ||
    outdoorCategory === "severe";

  const nextGood = hourlyWindows.find(
    (w) =>
      w.category === "good" ||
      w.category === "satisfactory" ||
      w.category === "moderate"
  );

  const nextGoodLabel = nextGood
    ? (nextGood.hourLabel ?? `${nextGood.hour}:00 IST`)
    : null;
  const firstLabel = hourlyWindows[0]
    ? (hourlyWindows[0].hourLabel ?? `${hourlyWindows[0].hour}:00 IST`)
    : null;

  const ventilation = isPoorOrWorse
    ? {
        state: nextGoodLabel
          ? `Keep windows closed until ${nextGoodLabel}`
          : "Keep street-facing windows closed today",
        nextGoodWindow: nextGoodLabel,
      }
    : {
        state: "Good time to ventilate",
        nextGoodWindow: firstLabel,
      };

  const matches: IndoorRuleMatch[] = [];

  if (isPoorOrWorse) {
    matches.push({
      group: "ventilation",
      key: "keep_windows_closed",
      title: ventilation.state,
      body: "Outdoor air is currently Poor or worse. Keep street-facing windows closed and wait for a Moderate or better window.",
    });
  } else {
    matches.push({
      group: "ventilation",
      key: "cross_ventilate",
      title: "Open windows for brief cross-ventilation",
      body: "Outdoor air is Moderate or better; opening opposite windows helps flush indoor pollutants.",
    });
  }

  if (profile.cookingFuel === "lpg" || profile.cookingFuel === "wood") {
    matches.push({
      group: "sources",
      key: "cooking_exhaust",
      title: "Run kitchen exhaust while cooking",
      body: "Use your kitchen exhaust fan during cooking and for 10 minutes afterward. Open the kitchen window if outdoor air is Moderate or better.",
    });
  }

  if (profile.incense) {
    matches.push({
      group: "sources",
      key: "reduce_incense",
      title: "Reduce incense or coils indoors",
      body: "Smoke from incense or mosquito coils raises indoor PM2.5; move to a ventilated area or pause during Poor air days.",
    });
  }

  if (profile.indoorSmoking) {
    matches.push({
      group: "sources",
      key: "no_indoor_smoke",
      title: "Keep indoor rooms smoke-free",
      body: "Indoor smoking traps fine particles inside closed rooms for hours.",
    });
  }

  if (profile.constructionNearby) {
    matches.push({
      group: "cleaning",
      key: "wet_mopping",
      title: "Use damp mopping and entry doormats",
      body: "Wet mopping captures settled construction dust without kicking particles back into the air.",
    });
  }

  if (profile.hasPurifier && profile.roomSizeM2) {
    matches.push({
      group: "purifier",
      key: "run_hepa",
      title: `Run HEPA purifier continuously in ${profile.roomSizeM2} m² room`,
      body: "Keep doors closed while running your HEPA purifier so clean air delivery stays effective.",
    });
  }

  const purifier =
    profile.hasPurifier && profile.roomSizeM2
      ? computePurifierGuidance(profile.roomSizeM2)
      : null;

  return { ventilation, matches, purifier };
}
