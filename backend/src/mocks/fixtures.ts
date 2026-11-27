import type {
  AqiResult,
  DailyRecommendation,
  EmissionFactor,
  Reading,
  WeatherPoint,
} from "@/contracts";

const NOW_ISO = "2026-11-27T03:00:00.000Z"; // 08:30 IST

export const MOCK_STATION = {
  id: "st-cpcb-kol-01",
  name: "Rabindra Bharati",
  city: "Kolkata",
  provider: "cpcb",
};

export const MOCK_AQI_RESULT: AqiResult = {
  aqi: 212,
  category: "poor",
  dominantPollutants: ["pm25"],
  subIndices: [
    {
      pollutant: "pm25",
      value: 92,
      average: 92,
      subIndex: 212,
      hoursAvailable: 22,
      hoursRequired: 16,
      status: "ok",
    },
    {
      pollutant: "pm10",
      value: 148,
      average: 148,
      subIndex: 132,
      hoursAvailable: 22,
      hoursRequired: 16,
      status: "ok",
    },
    {
      pollutant: "no2",
      value: 41,
      average: 41,
      subIndex: 51,
      hoursAvailable: 20,
      hoursRequired: 16,
      status: "ok",
    },
  ],
  unavailableReason: null,
  windowEnd: NOW_ISO,
  computedAt: NOW_ISO,
  provider: "cpcb",
  stationId: MOCK_STATION.id,
  stationName: MOCK_STATION.name,
  engineVersion: "cpcb-naqi-2014.1",
};

export const MOCK_READINGS: Reading[] = [
  {
    pollutant: "pm25",
    value: 92,
    unit: "µg/m³",
    averaging: "24h",
    provider: "cpcb",
    stationId: MOCK_STATION.id,
    stationName: MOCK_STATION.name,
    observedAt: NOW_ISO,
    kind: "observation",
    freshness: "fresh",
  },
  {
    pollutant: "pm10",
    value: 148,
    unit: "µg/m³",
    averaging: "24h",
    provider: "cpcb",
    stationId: MOCK_STATION.id,
    stationName: MOCK_STATION.name,
    observedAt: NOW_ISO,
    kind: "observation",
    freshness: "fresh",
  },
  {
    pollutant: "no2",
    value: 41,
    unit: "µg/m³",
    averaging: "24h",
    provider: "cpcb",
    stationId: MOCK_STATION.id,
    stationName: MOCK_STATION.name,
    observedAt: NOW_ISO,
    kind: "observation",
    freshness: "fresh",
  },
];

export const MOCK_WEATHER: WeatherPoint = {
  observedAt: NOW_ISO,
  kind: "observation",
  tempC: 29,
  rhPct: 68,
  windKph: 9,
  windDirDeg: 315,
  precipMm: 0,
  provider: "openmeteo",
};

export const MOCK_DAILY_RECOMMENDATION: DailyRecommendation = {
  dailySummary:
    "Morning PM2.5 is elevated across North Kolkata; shift outdoor exercise indoors and prefer covered metro transit.",
  airQualityStatus:
    "Poor (CPCB AQI 212) — PM2.5 is the dominant pollutant at 92 µg/m³ (observation).",
  commute: {
    summary: "Prefer underground Metro over roadside walking or open transit.",
    actions: [
      "Take the Metro for morning office travel.",
      "Minimize waiting along arterial junctions.",
    ],
  },
  study: {
    summary: "Keep study windows closed until afternoon dispersion.",
    actions: [
      "Work with windows closed during morning peak.",
      "Air out the room briefly between 15:00 and 16:30 IST.",
    ],
  },
  exercise: {
    summary: "Move high-exertion outdoor cardio indoors today.",
    actions: ["Swap evening run for an indoor strength or mobility session."],
  },
  indoor: {
    summary: "Keep street-facing windows closed and use kitchen exhaust.",
    actions: [
      "Run kitchen exhaust during gas cooking.",
      "Use HEPA purifier in closed bedrooms.",
    ],
  },
  sustainableActions: {
    summary: "Metro or bus trips cut per-kilometre tailpipe emissions.",
    actions: ["Choose Metro over private car for today's commute."],
  },
  dataLimitations: [
    "Based on CPCB Rabindra Bharati observation at 08:30 IST.",
    "Micro-street traffic spikes are not captured by station averages.",
  ],
};

export const MOCK_EMISSION_FACTORS: EmissionFactor[] = [
  {
    mode: "car",
    kgCo2ePerPkm: 0.184,
    source: "India GHG Program",
    publication: "India Specific Road Transport Emission Factors",
    version: "v2.1 (2024)",
    geography: "Urban India",
    occupancyAssumption: "1.2 passengers",
  },
  {
    mode: "two_wheeler",
    kgCo2ePerPkm: 0.082,
    source: "India GHG Program",
    publication: "India Specific Road Transport Emission Factors",
    version: "v2.1 (2024)",
    geography: "Urban India",
    occupancyAssumption: "1.1 passengers",
  },
  {
    mode: "auto",
    kgCo2ePerPkm: 0.095,
    source: "India GHG Program",
    publication: "India Specific Road Transport Emission Factors",
    version: "v2.1 (2024)",
    geography: "Urban India",
    occupancyAssumption: "1.5 passengers",
  },
  {
    mode: "bus",
    kgCo2ePerPkm: 0.062,
    source: "India GHG Program",
    publication: "India Specific Road Transport Emission Factors",
    version: "v2.1 (2024)",
    geography: "Urban India",
    occupancyAssumption: "38 passengers",
  },
  {
    mode: "metro",
    kgCo2ePerPkm: 0.029,
    source: "CEA Grid + Indian Metro Rail",
    publication: "Annual Sustainability Report",
    version: "2024.2",
    geography: "Indian Metro Grid",
    occupancyAssumption: "Average load",
  },
  {
    mode: "cycling",
    kgCo2ePerPkm: 0,
    source: "Direct tailpipe",
    publication: "Zero tailpipe",
    version: "v1.0",
    geography: "All",
    occupancyAssumption: "1 person",
  },
  {
    mode: "walking",
    kgCo2ePerPkm: 0,
    source: "Direct tailpipe",
    publication: "Zero tailpipe",
    version: "v1.0",
    geography: "All",
    occupancyAssumption: "1 person",
  },
];
