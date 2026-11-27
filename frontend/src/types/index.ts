import type { AqiCategory } from "@/lib/format";

export interface SavedLocation {
  id: string;
  city: string;
  area: string;
  lat: number;
  lng: number;
  isDefault: boolean;
  aqi: number | null;
  category: AqiCategory;
  observedAt: string;
  provider: string;
  station: string;
}

export interface PollutantReading {
  key: "PM2.5" | "PM10" | "NO2" | "O3" | "SO2" | "CO";
  label: string;
  value: number;
  unit: string;
  observedAt: string;
  provider: string;
  station: string;
  sparkline: string;
  hotspotPos: { left: string; top: string };
}

export interface WeatherSnapshot {
  tempC: number;
  humidityPct: number;
  windKmh: number;
  windDir: string;
  provider: string;
  observedAt: string;
  hourly: {
    timeLabel: string;
    tempC: number;
    windKmh: number;
    isForecast: boolean;
  }[];
}

export interface AqiCurrentResponse {
  location: SavedLocation;
  aqi: number | null;
  category: AqiCategory;
  unavailableReason?: string;
  provider: string;
  station: string;
  observedAt: string;
  freshMinutes: number;
  agingMinutes: number;
  sparkline24h: string;
  pollutants: PollutantReading[];
  weather: WeatherSnapshot;
}

export interface AqiTimePoint {
  label: string;
  aqi: number | null;
  isForecast: boolean;
  category: AqiCategory;
  provider: string;
  station: string;
  timestamp: string;
}

export interface AiRecommendationSection {
  key: "commute" | "study" | "exercise";
  title: string;
  summary: string;
  detail: string;
}

export interface AiRecommendResponse {
  airQualityStatus: string;
  dailySummary: string;
  sections: AiRecommendationSection[];
  dataLimitations: string;
  observedAt: string;
  provider: string;
  station: string;
}

export interface PlannerActivity {
  id: string;
  timeRange: string;
  hourStart: number;
  title: string;
  mode: "Outdoor" | "Indoor";
  expectedAqi: number;
  expectedCategory: AqiCategory;
  reason: string;
  completed: boolean;
  indoorAlternative?: {
    title: string;
    reason: string;
  };
}

export interface PlannerHourSegment {
  hourLabel: string;
  hour: number;
  aqi: number;
  category: AqiCategory;
  isForecast: boolean;
  provider: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  initials: string;
  ageGroup: "Child" | "Teen" | "Adult" | "Older adult";
  lifestyle: string;
  transport: string;
  topRecommendation: string;
  cropIndex: number;
}

export interface IndoorRecommendationItem {
  id: string;
  group: "Ventilation" | "Sources" | "Purifier" | "Cleaning";
  title: string;
  detail: string;
  done: boolean;
}

export interface SimulatorModeResult {
  mode: string;
  label: string;
  weeklyKgCo2e: number;
  yearlyKgCo2e: number;
  isBaseline: boolean;
  isZeroTailpipe?: boolean;
}

export interface SimulatorAssumption {
  mode: string;
  factorKgPerKm: number;
  source: string;
  version: string;
  geography: string;
  occupancy: string;
}

export interface CommunityReport {
  id: string;
  category:
    | "Smoke"
    | "Dust"
    | "Burning waste"
    | "Vehicle exhaust"
    | "Industrial"
    | "Other";
  description: string;
  status: "Pending review" | "Verified" | "Not verified";
  reportedAt: string;
  lat: number;
  lng: number;
  areaLabel: string;
}

export interface OfficialStationPin {
  id: string;
  name: string;
  provider: string;
  aqi: number | null;
  category: AqiCategory;
  observedAt: string;
  lat: number;
  lng: number;
}
