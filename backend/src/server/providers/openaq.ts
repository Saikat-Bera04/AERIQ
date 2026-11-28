import { PROVIDER_ENDPOINTS } from "./constants";
import type { ProviderFetchResult } from "./cpcb";
import { fetchProviderJson, RawOpenAqPayloadSchema } from "./http";

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

  const raw = await fetchProviderJson("openaq", url.toString(), RawOpenAqPayloadSchema, {
    headers: { "X-API-Key": apiKey },
  });
  return { raw, fetchedAt: new Date().toISOString() };
}
