import { PROVIDER_ENDPOINTS } from "./constants";
import type { ProviderFetchResult } from "./cpcb";

export async function fetchLatest(params: {
  lat: number;
  lng: number;
}): Promise<{ airQuality: ProviderFetchResult; weather: ProviderFetchResult }> {
  const aqUrl = new URL(PROVIDER_ENDPOINTS.openMeteoAirQuality);
  aqUrl.searchParams.set("latitude", String(params.lat));
  aqUrl.searchParams.set("longitude", String(params.lng));
  aqUrl.searchParams.set(
    "hourly",
    "pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone"
  );
  aqUrl.searchParams.set("forecast_hours", "48");
  aqUrl.searchParams.set("timezone", "UTC");

  const wxUrl = new URL(PROVIDER_ENDPOINTS.openMeteoForecast);
  wxUrl.searchParams.set("latitude", String(params.lat));
  wxUrl.searchParams.set("longitude", String(params.lng));
  wxUrl.searchParams.set(
    "hourly",
    "temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation"
  );
  wxUrl.searchParams.set("current", "temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation");
  wxUrl.searchParams.set("forecast_hours", "48");
  wxUrl.searchParams.set("timezone", "UTC");

  const [aqRes, wxRes] = await Promise.all([
    fetch(aqUrl.toString(), { signal: AbortSignal.timeout(12_000) }),
    fetch(wxUrl.toString(), { signal: AbortSignal.timeout(12_000) }),
  ]);

  if (!aqRes.ok || !wxRes.ok) {
    throw new Error(
      `Open-Meteo provider error: AQ=${aqRes.status} WX=${wxRes.status}`
    );
  }

  const fetchedAt = new Date().toISOString();
  return {
    airQuality: { raw: await aqRes.json(), fetchedAt },
    weather: { raw: await wxRes.json(), fetchedAt },
  };
}
