import { describe, expect, it, vi } from "vitest";
import { fetchProviderJson, RawCpcbPayloadSchema } from "@/server/providers/http";

describe("Phase 6 — Provider resilience & Zod schemas", () => {
  it("rejects malformed provider payload without retrying", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ records: "not-an-array" }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchProviderJson("cpcb", "https://example.test/cpcb", RawCpcbPayloadSchema, undefined, 1)
    ).rejects.toThrow("INVALID_PAYLOAD");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
  });

  it("opens circuit breaker after 5 consecutive failures", async () => {
    const fetchMock = vi.fn(async () => ({ ok: false, status: 502 }));
    vi.stubGlobal("fetch", fetchMock);

    for (let i = 0; i < 5; i++) {
      await expect(
        fetchProviderJson("openaq", "https://example.test/openaq", RawCpcbPayloadSchema, undefined, 1)
      ).rejects.toThrow();
    }

    // 6th call should fail fast with circuit breaker open without calling fetch
    const callsBefore = fetchMock.mock.calls.length;
    await expect(
      fetchProviderJson("openaq", "https://example.test/openaq", RawCpcbPayloadSchema, undefined, 1)
    ).rejects.toThrow("circuit breaker open");
    expect(fetchMock.mock.calls.length).toBe(callsBefore);

    vi.unstubAllGlobals();
  });
});
