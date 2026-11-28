/**
 * Optional client-side Sentry reporter (no-op when NEXT_PUBLIC_SENTRY_DSN is unset).
 */
export function captureClientException(
  err: unknown,
  context?: Record<string, unknown>
): void {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn || typeof window === "undefined") return;

  try {
    const parsed = new URL(dsn);
    const projectId = parsed.pathname.replace(/^\/+/, "");
    const publicKey = parsed.username;
    if (!projectId || !publicKey) return;

    const endpoint = `${parsed.protocol}//${parsed.host}/api/${projectId}/envelope/`;
    const eventId = crypto.randomUUID().replace(/-/g, "");
    const envelope = [
      JSON.stringify({ event_id: eventId, sent_at: new Date().toISOString(), dsn }),
      JSON.stringify({ type: "event" }),
      JSON.stringify({
        event_id: eventId,
        timestamp: Date.now() / 1000,
        platform: "javascript",
        level: "error",
        message: { formatted: err instanceof Error ? err.message : String(err) },
        extra: context,
      }),
    ].join("\n");

    void fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-sentry-envelope",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${publicKey}`,
      },
      body: envelope,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // No-op
  }
}
