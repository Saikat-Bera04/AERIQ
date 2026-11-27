import type { Pollutant } from "@/contracts";

export const PROVIDER_ENDPOINTS = {
  cpcbDataGov: "https://api.data.gov.in/resource",
  openAqV3: "https://api.openaq.org/v3",
  openMeteoAirQuality: "https://air-quality-api.open-meteo.com/v1/air-quality",
  openMeteoForecast: "https://api.open-meteo.com/v1/forecast",
} as const;

export const POLLUTANT_MAP: Record<string, Pollutant> = {
  "pm2.5": "pm25",
  pm2_5: "pm25",
  pm25: "pm25",
  pm10: "pm10",
  no2: "no2",
  nitrogen_dioxide: "no2",
  o3: "o3",
  ozone: "o3",
  so2: "so2",
  sulphur_dioxide: "so2",
  sulfur_dioxide: "so2",
  co: "co",
  carbon_monoxide: "co",
  nh3: "nh3",
  ammonia: "nh3",
  pb: "pb",
  lead: "pb",
};

// Physical ceilings per pollutant (in CPCB canonical units: µg/m³, CO in mg/m³)
export const PHYSICAL_CEILINGS: Record<Pollutant, number> = {
  pm25: 2000,
  pm10: 2000,
  no2: 2000,
  o3: 2000,
  so2: 4000,
  co: 100,
  nh3: 4000,
  pb: 50,
};
