export interface ApiNotice {
  code: string;
  provider?: string;
  lastSuccessAt?: string | null;
  message?: string;
}

export interface ApiMeta {
  dataAsOf: string;
  freshnessThresholds: { freshMin: number; agingMin: number };
  notices: ApiNotice[];
}

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fields?: Record<string, string>,
    public readonly retryAfterSec?: number
  ) {
    super(message);
  }
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function request<T>(
  path: string,
  init?: RequestInit
): Promise<{ data: T; meta: ApiMeta }> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const json = await res.json().catch(() => null);

  if (!res.ok || !json?.ok) {
    const err = json?.error ?? {};
    if (res.status === 401 && typeof window !== "undefined") {
      if (
        !window.location.pathname.startsWith("/login") &&
        !window.location.pathname.startsWith("/register")
      ) {
        window.location.href = "/login";
      }
    }
    const msg =
      res.status === 429 && err.retryAfterSec
        ? `${err.message ?? "Rate limit reached"} — try again in ${err.retryAfterSec}s`
        : (err.message ?? `Request failed (${res.status})`);
    throw new ApiClientError(
      res.status,
      err.code ?? "INTERNAL",
      msg,
      err.fields,
      err.retryAfterSec
    );
  }

  return { data: json.data as T, meta: json.meta as ApiMeta };
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "DELETE",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  baseUrl: API_BASE,
};
