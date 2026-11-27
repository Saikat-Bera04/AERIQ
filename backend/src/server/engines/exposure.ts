import type { ExposureResponse, TransportMode } from "@/contracts";

export interface ExposureSegment {
  mode: TransportMode;
  minutes: number;
}

export function computeExposureIndicator(
  segments: ExposureSegment[],
  routeConcentrationUgM3: Partial<Record<TransportMode, number>> | null
): ExposureResponse {
  if (!routeConcentrationUgM3) {
    return {
      available: false,
      reason: "Not enough route-level concentration data for this area yet.",
    };
  }

  const perOption: { mode: TransportMode; indicator: number }[] = [];

  for (const seg of segments) {
    const conc = routeConcentrationUgM3[seg.mode];
    if (conc === undefined) {
      return {
        available: false,
        reason: `Route concentration data unavailable for ${seg.mode}.`,
      };
    }
    const hours = seg.minutes / 60;
    perOption.push({
      mode: seg.mode,
      indicator: Math.round(conc * hours),
    });
  }

  return {
    available: true,
    unit: "µg/m³·h",
    note: "This is a planning indicator, not a measured dose or health risk score.",
    perOption,
  };
}
