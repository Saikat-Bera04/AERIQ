import type {
  AiRecommendResponse,
  AqiCurrentResponse,
  AqiTimePoint,
  CommunityReport,
  FamilyMember,
  IndoorRecommendationItem,
  OfficialStationPin,
  PlannerActivity,
  PlannerHourSegment,
  SavedLocation,
  SimulatorAssumption,
  SimulatorModeResult,
} from "@/types";

export const USE_MOCKS = true;

const now = new Date("2026-11-27T08:55:00+05:30").getTime();
const minsAgo = (m: number) => new Date(now - m * 60000).toISOString();
const hoursFromNow = (h: number) => new Date(now + h * 3600000).toISOString();

export const MOCK_USER = {
  firstName: "Aarav",
  fullName: "Aarav Sen",
  initials: "AS",
  email: "aarav.sen@example.in",
  memberSince: "Mar 2026",
  lifestyle: "Working professional",
  transport: ["Metro", "Walking"],
};

export const MOCK_LOCATIONS: SavedLocation[] = [
  {
    id: "loc-kol",
    city: "Kolkata",
    area: "Rabindra Bharati",
    lat: 22.5726,
    lng: 88.3639,
    isDefault: true,
    aqi: 212,
    category: "Poor",
    observedAt: minsAgo(25),
    provider: "CPCB",
    station: "RABINDRA BHARATI",
  },
  {
    id: "loc-del",
    city: "New Delhi",
    area: "Lodhi Road",
    lat: 28.5918,
    lng: 77.2273,
    isDefault: false,
    aqi: 286,
    category: "Poor",
    observedAt: minsAgo(40),
    provider: "CPCB",
    station: "LODHI ROAD",
  },
  {
    id: "loc-blr",
    city: "Bengaluru",
    area: "BTM Layout",
    lat: 12.9166,
    lng: 77.6101,
    isDefault: false,
    aqi: 74,
    category: "Satisfactory",
    observedAt: minsAgo(20),
    provider: "CPCB",
    station: "BTM LAYOUT",
  },
];

export const MOCK_AQI_CURRENT: AqiCurrentResponse = {
  location: MOCK_LOCATIONS[0],
  aqi: 212,
  category: "Poor",
  provider: "CPCB",
  station: "RABINDRA BHARATI",
  observedAt: minsAgo(25),
  freshMinutes: 90,
  agingMinutes: 180,
  sparkline24h: "0,60 30,55 60,57 90,44 120,46 150,30 180,24 214,10",
  pollutants: [
    {
      key: "PM2.5",
      label: "PM2.5",
      value: 92,
      unit: "µg/m³",
      observedAt: minsAgo(25),
      provider: "CPCB",
      station: "RABINDRA BHARATI",
      sparkline: "0,20 12,18 24,19 36,14 48,12 60,6",
      hotspotPos: { left: "12%", top: "62%" },
    },
    {
      key: "PM10",
      label: "PM10",
      value: 148,
      unit: "µg/m³",
      observedAt: minsAgo(25),
      provider: "CPCB",
      station: "RABINDRA BHARATI",
      sparkline: "0,18 12,16 24,14 36,15 48,10 60,8",
      hotspotPos: { left: "34%", top: "44%" },
    },
    {
      key: "NO2",
      label: "NO₂",
      value: 41,
      unit: "µg/m³",
      observedAt: minsAgo(25),
      provider: "CPCB",
      station: "RABINDRA BHARATI",
      sparkline: "0,16 12,17 24,13 36,12 48,14 60,11",
      hotspotPos: { left: "58%", top: "70%" },
    },
    {
      key: "O3",
      label: "O₃",
      value: 28,
      unit: "µg/m³",
      observedAt: minsAgo(25),
      provider: "CPCB",
      station: "RABINDRA BHARATI",
      sparkline: "0,20 12,19 24,15 36,11 48,12 60,14",
      hotspotPos: { left: "72%", top: "40%" },
    },
    {
      key: "SO2",
      label: "SO₂",
      value: 14,
      unit: "µg/m³",
      observedAt: minsAgo(25),
      provider: "CPCB",
      station: "RABINDRA BHARATI",
      sparkline: "0,18 12,18 24,17 36,16 48,17 60,15",
      hotspotPos: { left: "84%", top: "58%" },
    },
    {
      key: "CO",
      label: "CO",
      value: 1.4,
      unit: "mg/m³",
      observedAt: minsAgo(25),
      provider: "CPCB",
      station: "RABINDRA BHARATI",
      sparkline: "0,16 12,15 24,14 36,13 48,14 60,12",
      hotspotPos: { left: "46%", top: "30%" },
    },
  ],
  weather: {
    tempC: 29,
    humidityPct: 68,
    windKmh: 9,
    windDir: "NW",
    provider: "Open-Meteo",
    observedAt: minsAgo(15),
    hourly: [
      { timeLabel: "14:00", tempC: 30, windKmh: 11, isForecast: true },
      { timeLabel: "16:00", tempC: 29, windKmh: 12, isForecast: true },
      { timeLabel: "18:00", tempC: 26, windKmh: 8, isForecast: true },
      { timeLabel: "20:00", tempC: 24, windKmh: 6, isForecast: true },
      { timeLabel: "22:00", tempC: 22, windKmh: 5, isForecast: true },
    ],
  },
};

export const MOCK_HISTORY_24H: AqiTimePoint[] = [
  { label: "00:00", aqi: 185, isForecast: false, category: "Moderate", provider: "CPCB", station: "RABINDRA BHARATI", timestamp: minsAgo(480) },
  { label: "03:00", aqi: 196, isForecast: false, category: "Moderate", provider: "CPCB", station: "RABINDRA BHARATI", timestamp: minsAgo(360) },
  { label: "06:00", aqi: 228, isForecast: false, category: "Poor", provider: "CPCB", station: "RABINDRA BHARATI", timestamp: minsAgo(240) },
  { label: "09:00", aqi: 212, isForecast: false, category: "Poor", provider: "CPCB", station: "RABINDRA BHARATI", timestamp: minsAgo(25) },
  { label: "12:00", aqi: 174, isForecast: true, category: "Moderate", provider: "Open-Meteo", station: "KOLKATA GRID", timestamp: hoursFromNow(3) },
  { label: "15:00", aqi: 158, isForecast: true, category: "Moderate", provider: "Open-Meteo", station: "KOLKATA GRID", timestamp: hoursFromNow(6) },
  { label: "18:00", aqi: 192, isForecast: true, category: "Moderate", provider: "Open-Meteo", station: "KOLKATA GRID", timestamp: hoursFromNow(9) },
  { label: "21:00", aqi: 224, isForecast: true, category: "Poor", provider: "Open-Meteo", station: "KOLKATA GRID", timestamp: hoursFromNow(12) },
];

export const MOCK_AI_RECOMMENDATION: AiRecommendResponse = {
  airQualityStatus: "Poor (CPCB AQI 212) — PM2.5 is the primary driver at 92 µg/m³.",
  dailySummary:
    "Morning PM2.5 is elevated across North Kolkata; shift outdoor exercise indoors and prefer covered metro transit before 10 AM.",
  sections: [
    {
      key: "commute",
      title: "Commute",
      summary: "Take the Metro instead of walking along arterial roads.",
      detail:
        "Roadside PM2.5 and NO₂ peak between 08:30 and 10:30 IST. Underground metro stations reduce exposure compared to open two-wheeler or roadside walking.",
    },
    {
      key: "study",
      title: "Study",
      summary: "Keep study windows indoors with cross-ventilation paused until 15:00.",
      detail:
        "Afternoon wind speeds rise to 12 km/h between 14:00 and 17:00 IST, making that the cleanest window to open north-facing windows briefly.",
    },
    {
      key: "exercise",
      title: "Exercise",
      summary: "Swap evening outdoor run for an indoor mobility or strength session.",
      detail:
        "At AQI 212 (Poor), sustained high-ventilation outdoor running increases particulate intake. Resume outdoor runs when AQI drops below 150.",
    },
  ],
  dataLimitations:
    "Grounded in CPCB Rabindra Bharati observation at 08:30 IST and Open-Meteo hourly forecast. Micro-street traffic spikes are not captured.",
  observedAt: minsAgo(25),
  provider: "CPCB",
  station: "RABINDRA BHARATI",
};

export const MOCK_PLANNER_SEGMENTS: PlannerHourSegment[] = [
  { hourLabel: "6 AM", hour: 6, aqi: 228, category: "Poor", isForecast: false, provider: "CPCB" },
  { hourLabel: "8 AM", hour: 8, aqi: 212, category: "Poor", isForecast: false, provider: "CPCB" },
  { hourLabel: "10 AM", hour: 10, aqi: 194, category: "Moderate", isForecast: true, provider: "Open-Meteo" },
  { hourLabel: "12 PM", hour: 12, aqi: 174, category: "Moderate", isForecast: true, provider: "Open-Meteo" },
  { hourLabel: "2 PM", hour: 14, aqi: 158, category: "Moderate", isForecast: true, provider: "Open-Meteo" },
  { hourLabel: "4 PM", hour: 16, aqi: 152, category: "Moderate", isForecast: true, provider: "Open-Meteo" },
  { hourLabel: "6 PM", hour: 18, aqi: 192, category: "Moderate", isForecast: true, provider: "Open-Meteo" },
  { hourLabel: "8 PM", hour: 20, aqi: 224, category: "Poor", isForecast: true, provider: "Open-Meteo" },
  { hourLabel: "10 PM", hour: 22, aqi: 238, category: "Poor", isForecast: true, provider: "Open-Meteo" },
];

export const MOCK_PLANNER_ACTIVITIES: PlannerActivity[] = [
  {
    id: "act-1",
    timeRange: "07:30 – 08:15 IST",
    hourStart: 7,
    title: "Morning walk & stretching",
    mode: "Indoor",
    expectedAqi: 220,
    expectedCategory: "Poor",
    reason: "High morning PM2.5; moved indoors",
    completed: true,
  },
  {
    id: "act-2",
    timeRange: "09:15 – 10:00 IST",
    hourStart: 9,
    title: "Office commute via Metro",
    mode: "Outdoor",
    expectedAqi: 204,
    expectedCategory: "Poor",
    reason: "Minimize roadside wait time",
    completed: false,
    indoorAlternative: {
      title: "Work from home morning block",
      reason: "Avoids 204 AQI transit corridor until midday dip",
    },
  },
  {
    id: "act-3",
    timeRange: "15:00 – 16:00 IST",
    hourStart: 15,
    title: "Open windows & air out study",
    mode: "Outdoor",
    expectedAqi: 152,
    expectedCategory: "Moderate",
    reason: "Cleanest dispersion window (12 km/h wind)",
    completed: false,
  },
  {
    id: "act-4",
    timeRange: "18:30 – 19:15 IST",
    hourStart: 18,
    title: "Evening cardio session",
    mode: "Outdoor",
    expectedAqi: 192,
    expectedCategory: "Moderate",
    reason: "Borderline moderate; indoor swap ready",
    completed: false,
    indoorAlternative: {
      title: "30-min indoor cycling / yoga",
      reason: "Keeps breathing rate away from evening inversion rise",
    },
  },
];

export const MOCK_FAMILY: FamilyMember[] = [
  {
    id: "fam-1",
    name: "Meera Sen",
    initials: "MS",
    ageGroup: "Older adult",
    lifestyle: "Retired",
    transport: "Walking",
    topRecommendation: "Keep morning walks after 15:00 IST when AQI dips toward 150.",
    cropIndex: 0,
  },
  {
    id: "fam-2",
    name: "Rohan Sen",
    initials: "RS",
    ageGroup: "Child",
    lifestyle: "Student",
    transport: "Bus",
    topRecommendation: "Use indoor playroom for after-school sports today.",
    cropIndex: 1,
  },
  {
    id: "fam-3",
    name: "Ananya Sen",
    initials: "AS",
    ageGroup: "Adult",
    lifestyle: "Working professional",
    transport: "Metro",
    topRecommendation: "Metro commute recommended over cab in peak traffic.",
    cropIndex: 2,
  },
];

export const MOCK_INDOOR_RECS: IndoorRecommendationItem[] = [
  {
    id: "ind-1",
    group: "Ventilation",
    title: "Keep street-facing windows closed until 15:00 IST",
    detail:
      "Outdoor AQI is 212 (Poor) with slow 9 km/h wind. Wait for the afternoon dispersion window between 15:00 and 16:30 IST for brief cross-ventilation.",
    done: false,
  },
  {
    id: "ind-2",
    group: "Sources",
    title: "Run kitchen exhaust on high during gas cooking",
    detail:
      "Gas stoves emit NO₂ and fine particulates indoors. Keep the exhaust fan running 10 minutes after turning off burners.",
    done: true,
  },
  {
    id: "ind-3",
    group: "Purifier",
    title: "Run HEPA purifier on Medium in the 24 m² bedroom",
    detail:
      "Close bedroom doors while running the purifier so clean air delivery rate stays effective for the room volume.",
    done: false,
  },
  {
    id: "ind-4",
    group: "Cleaning",
    title: "Damp-mop floors instead of dry sweeping",
    detail:
      "Dry brooms re-suspend settled PM10 dust back into breathing height.",
    done: false,
  },
];

export const MOCK_SIMULATOR_RESULTS: SimulatorModeResult[] = [
  { mode: "car", label: "Private car", weeklyKgCo2e: 18.4, yearlyKgCo2e: 956.8, isBaseline: true },
  { mode: "bus", label: "City bus", weeklyKgCo2e: 6.2, yearlyKgCo2e: 322.4, isBaseline: false },
  { mode: "metro", label: "Metro", weeklyKgCo2e: 2.9, yearlyKgCo2e: 150.8, isBaseline: false },
  { mode: "walking", label: "Walking", weeklyKgCo2e: 0, yearlyKgCo2e: 0, isBaseline: false, isZeroTailpipe: true },
];

export const MOCK_SIMULATOR_ASSUMPTIONS: SimulatorAssumption[] = [
  {
    mode: "Private car",
    factorKgPerKm: 0.184,
    source: "India GHG Program",
    version: "v2.1 (2024)",
    geography: "Urban India",
    occupancy: "1.2 passengers",
  },
  {
    mode: "City bus",
    factorKgPerKm: 0.062,
    source: "India GHG Program",
    version: "v2.1 (2024)",
    geography: "Urban India",
    occupancy: "38 passengers",
  },
  {
    mode: "Metro",
    factorKgPerKm: 0.029,
    source: "CEA Grid + DMRC/KMRCL",
    version: "2024.2",
    geography: "Indian Metro Grid",
    occupancy: "Average load",
  },
  {
    mode: "Walking / Cycling",
    factorKgPerKm: 0,
    source: "Direct tailpipe",
    version: "Zero tailpipe",
    geography: "All",
    occupancy: "1 person",
  },
];

export const MOCK_COMMUNITY_REPORTS: CommunityReport[] = [
  {
    id: "rep-1",
    category: "Burning waste",
    description: "Dry leaf and plastic burning near canal road corner, heavy acrid smoke drifting east.",
    status: "Verified",
    reportedAt: minsAgo(35),
    lat: 22.578,
    lng: 88.369,
    areaLabel: "Shyambazar (~500m)",
  },
  {
    id: "rep-2",
    category: "Dust",
    description: "Uncovered metro construction sand pile kicking up dust in afternoon gusts.",
    status: "Pending review",
    reportedAt: minsAgo(95),
    lat: 22.567,
    lng: 88.358,
    areaLabel: "Esplanade (~500m)",
  },
  {
    id: "rep-3",
    category: "Vehicle exhaust",
    description: "Long diesel bus queue idling at signal junction for 15+ minutes.",
    status: "Verified",
    reportedAt: minsAgo(140),
    lat: 22.574,
    lng: 88.374,
    areaLabel: "Sealdah (~500m)",
  },
];

export const MOCK_OFFICIAL_STATIONS: OfficialStationPin[] = [
  {
    id: "st-1",
    name: "Rabindra Bharati",
    provider: "CPCB",
    aqi: 212,
    category: "Poor",
    observedAt: minsAgo(25),
    lat: 22.627,
    lng: 88.38,
  },
  {
    id: "st-2",
    name: "Victoria",
    provider: "CPCB",
    aqi: 178,
    category: "Moderate",
    observedAt: minsAgo(30),
    lat: 22.5448,
    lng: 88.3426,
  },
  {
    id: "st-3",
    name: "Ballygunge",
    provider: "CPCB",
    aqi: 194,
    category: "Moderate",
    observedAt: minsAgo(22),
    lat: 22.528,
    lng: 88.366,
  },
];
