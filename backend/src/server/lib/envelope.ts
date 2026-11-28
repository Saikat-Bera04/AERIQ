import crypto from "node:crypto";
import type { ErrorCode, Notice } from "@/contracts";
import { FRESHNESS_THRESHOLDS } from "@/server/engines/freshness";

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly status: number,
    message: string,
    public readonly extra?: {
      fields?: Record<string, string>;
      retryAfterSec?: number;
      lastSuccessAt?: string | null;
    }
  ) {
    super(message);
  }
}

export function okEnvelope<T>(
  data: T,
  opts?: { dataAsOf?: string; notices?: Notice[] }
) {
  return {
    ok: true as const,
    data,
    meta: {
      dataAsOf: opts?.dataAsOf ?? new Date().toISOString(),
      freshnessThresholds: FRESHNESS_THRESHOLDS,
      notices: opts?.notices ?? [],
    },
  };
}

export function errorEnvelope(err: AppError) {
  return {
    ok: false as const,
    error: {
      code: err.code,
      message: err.message,
      ...(err.extra?.fields ? { fields: err.extra.fields } : {}),
      ...(err.extra?.retryAfterSec !== undefined
        ? { retryAfterSec: err.extra.retryAfterSec }
        : {}),
      ...(err.extra?.lastSuccessAt !== undefined
        ? { lastSuccessAt: err.extra.lastSuccessAt }
        : {}),
    },
  };
}

export const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy":
    "default-src 'self'; img-src 'self' data: https://tile.openstreetmap.org https://images.higgs.ai; font-src 'self' https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com; connect-src 'self'",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

export function createRequestId(): string {
  return crypto.randomUUID();
}

export function logRoute(entry: {
  requestId: string;
  route: string;
  userIdHash?: string | null;
  ms: number;
  status: number;
  code: string;
}) {
  // Never log passwords, tokens, exact coordinates, or message text
  console.log(
    JSON.stringify({
      requestId: entry.requestId,
      route: entry.route,
      userIdHash: entry.userIdHash ?? null,
      ms: entry.ms,
      status: entry.status,
      code: entry.code,
    })
  );
}
