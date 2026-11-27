import { PROVIDER_ENDPOINTS } from "./constants";

export interface ProviderFetchResult {
  raw: unknown;
  fetchedAt: string;
}

export async function fetchLatest(params: {
  city: string;
  state?: string;
}): Promise<ProviderFetchResult> {
  const apiKey = process.env.DATA_GOV_API_KEY ?? "";
  const resourceId =
    process.env.CPCB_RESOURCE_ID ?? "3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69";

  const url = new URL(`${PROVIDER_ENDPOINTS.cpcbDataGov}/${resourceId}`);
  url.searchParams.set("api-key", apiKey);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "100");
  url.searchParams.set("filters[city]", params.city);
  if (params.state) {
    url.searchParams.set("filters[state]", params.state);
  }

  const res = await fetch(url.toString(), {
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) {
    throw new Error(`CPCB provider error: HTTP ${res.status}`);
  }
  const raw = await res.json();
  return { raw, fetchedAt: new Date().toISOString() };
}
