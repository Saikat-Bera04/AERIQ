import { PROVIDER_ENDPOINTS } from "./constants";
import type { ProviderFetchResult } from "./cpcb";

export async function fetchLatest(params: {
  lat: number;
  lng: number;
  radiusMeters?: number;
}): Promise<ProviderFetchResult> {
  const apiKey = process.env.OPENAQ_API_KEY ?? "";
  const url = new URL(`${PROVIDER_ENDPOINTS.openAqV3}/locations`);
  url.searchParams.set("coordinates", `${params.lat},${params.lng}`);
  url.searchParams.set("radius", String(params.radiusMeters ?? 25000));
  url.searchParams.set("limit", "25");

  const res = await fetch(url.toString(), {
    headers: { "X-API-Key": apiKey },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) {
    throw new Error(`OpenAQ provider error: HTTP ${res.status}`);
  }
  const raw = await res.json();
  return { raw, fetchedAt: new Date().toISOString() };
}
