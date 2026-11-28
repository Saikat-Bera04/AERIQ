/**
 * Lightweight optional Sentry reporter.
 * No-ops cleanly when SENTRY_DSN is unset.
 */
export async function captureException(
  err: unknown,
  context?: Record<string, unknown>
): Promise<void> {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  try {
    const parsed = new URL(dsn);
    const projectId = parsed.pathname.replace(/^\/+/, "");
    const publicKey = parsed.username;
    if (!projectId || !publicKey) return;

    const endpoint = `${parsed.protocol}//${parsed.host}/api/${projectId}/envelope/`;
    const eventId = crypto.randomUUID().replace(/-/g, "");
    const header = JSON.stringify({
      event_id: eventId,
      sent_at: new Date().toISOString(),
      dsn,
    });
    const itemHeader = JSON.stringify({ type: "event" });
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    const payload = JSON.stringify({
      event_id: eventId,
      timestamp: Date.now() / 1000,
      platform: "node",
      level: "error",
      message: { formatted: message },
      extra: { ...context, stack },
    });

    await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-sentry-envelope",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${publicKey}`,
      },
      body: `${header}\n${itemHeader}\n${payload}`,
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // Never fail request path on telemetry errors
  }
}
