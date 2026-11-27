import type { AqiCategorySlug, Pollutant } from "@/contracts";

/**
 * CPCB National Air Quality Index (NAQI) Breakpoints.
 * Units: µg/m³ for all pollutants except CO, which is in mg/m³.
 *
 * NOTE: A person must verify the open-ended Severe band upper concentrations
 * against the official CPCB NAQI technical report (2014) before production launch.
 */

export interface BreakpointBand {
  category: AqiCategorySlug;
  bLo: number;
  bHi: number;
  iLo: number;
  iHi: number;
}

export const AQI_ENGINE_VERSION = "cpcb-naqi-2014.1";

export const AVERAGING_WINDOW_HOURS: Record<Pollutant, 8 | 24> = {
  pm25: 24,
  pm10: 24,
  no2: 24,
  so2: 24,
  nh3: 24,
  pb: 24,
  o3: 8,
  co: 8,
};

export const MIN_HOURS_REQUIRED: Record<8 | 24, number> = {
  24: 16,
  8: 6,
};

// Continuous bands: each band's bLo equals the previous band's bHi.
export const CPCB_BREAKPOINTS: Record<Pollutant, BreakpointBand[]> = {
  pm10: [
    { category: "good", bLo: 0, bHi: 50, iLo: 0, iHi: 50 },
    { category: "satisfactory", bLo: 50, bHi: 100, iLo: 51, iHi: 100 },
    { category: "moderate", bLo: 100, bHi: 250, iLo: 101, iHi: 200 },
    { category: "poor", bLo: 250, bHi: 350, iLo: 201, iHi: 300 },
    { category: "very_poor", bLo: 350, bHi: 430, iLo: 301, iHi: 400 },
    { category: "severe", bLo: 430, bHi: 600, iLo: 401, iHi: 500 },
  ],
  pm25: [
    { category: "good", bLo: 0, bHi: 30, iLo: 0, iHi: 50 },
    { category: "satisfactory", bLo: 30, bHi: 60, iLo: 51, iHi: 100 },
    { category: "moderate", bLo: 60, bHi: 90, iLo: 101, iHi: 200 },
    { category: "poor", bLo: 90, bHi: 120, iLo: 201, iHi: 300 },
    { category: "very_poor", bLo: 120, bHi: 250, iLo: 301, iHi: 400 },
    { category: "severe", bLo: 250, bHi: 380, iLo: 401, iHi: 500 },
  ],
  no2: [
    { category: "good", bLo: 0, bHi: 40, iLo: 0, iHi: 50 },
    { category: "satisfactory", bLo: 40, bHi: 80, iLo: 51, iHi: 100 },
    { category: "moderate", bLo: 80, bHi: 180, iLo: 101, iHi: 200 },
    { category: "poor", bLo: 180, bHi: 280, iLo: 201, iHi: 300 },
    { category: "very_poor", bLo: 280, bHi: 400, iLo: 301, iHi: 400 },
    { category: "severe", bLo: 400, bHi: 600, iLo: 401, iHi: 500 },
  ],
  o3: [
    { category: "good", bLo: 0, bHi: 50, iLo: 0, iHi: 50 },
    { category: "satisfactory", bLo: 50, bHi: 100, iLo: 51, iHi: 100 },
    { category: "moderate", bLo: 100, bHi: 168, iLo: 101, iHi: 200 },
    { category: "poor", bLo: 168, bHi: 208, iLo: 201, iHi: 300 },
    { category: "very_poor", bLo: 208, bHi: 748, iLo: 301, iHi: 400 },
    { category: "severe", bLo: 748, bHi: 900, iLo: 401, iHi: 500 },
  ],
  co: [
    { category: "good", bLo: 0, bHi: 1.0, iLo: 0, iHi: 50 },
    { category: "satisfactory", bLo: 1.0, bHi: 2.0, iLo: 51, iHi: 100 },
    { category: "moderate", bLo: 2.0, bHi: 10.0, iLo: 101, iHi: 200 },
    { category: "poor", bLo: 10.0, bHi: 17.0, iLo: 201, iHi: 300 },
    { category: "very_poor", bLo: 17.0, bHi: 34.0, iLo: 301, iHi: 400 },
    { category: "severe", bLo: 34.0, bHi: 50.0, iLo: 401, iHi: 500 },
  ],
  so2: [
    { category: "good", bLo: 0, bHi: 40, iLo: 0, iHi: 50 },
    { category: "satisfactory", bLo: 40, bHi: 80, iLo: 51, iHi: 100 },
    { category: "moderate", bLo: 80, bHi: 380, iLo: 101, iHi: 200 },
    { category: "poor", bLo: 380, bHi: 800, iLo: 201, iHi: 300 },
    { category: "very_poor", bLo: 800, bHi: 1600, iLo: 301, iHi: 400 },
    { category: "severe", bLo: 1600, bHi: 2000, iLo: 401, iHi: 500 },
  ],
  nh3: [
    { category: "good", bLo: 0, bHi: 200, iLo: 0, iHi: 50 },
    { category: "satisfactory", bLo: 200, bHi: 400, iLo: 51, iHi: 100 },
    { category: "moderate", bLo: 400, bHi: 800, iLo: 101, iHi: 200 },
    { category: "poor", bLo: 800, bHi: 1200, iLo: 201, iHi: 300 },
    { category: "very_poor", bLo: 1200, bHi: 1800, iLo: 301, iHi: 400 },
    { category: "severe", bLo: 1800, bHi: 2400, iLo: 401, iHi: 500 },
  ],
  pb: [
    { category: "good", bLo: 0, bHi: 0.5, iLo: 0, iHi: 50 },
    { category: "satisfactory", bLo: 0.5, bHi: 1.0, iLo: 51, iHi: 100 },
    { category: "moderate", bLo: 1.0, bHi: 2.0, iLo: 101, iHi: 200 },
    { category: "poor", bLo: 2.0, bHi: 3.0, iLo: 201, iHi: 300 },
    { category: "very_poor", bLo: 3.0, bHi: 3.5, iLo: 301, iHi: 400 },
    { category: "severe", bLo: 3.5, bHi: 5.0, iLo: 401, iHi: 500 },
  ],
};

export function categoryFromAqi(aqi: number): AqiCategorySlug {
  if (aqi <= 50) return "good";
  if (aqi <= 100) return "satisfactory";
  if (aqi <= 200) return "moderate";
  if (aqi <= 300) return "poor";
  if (aqi <= 400) return "very_poor";
  return "severe";
}
