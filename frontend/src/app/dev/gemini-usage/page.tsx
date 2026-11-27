"use client";

import React, { useEffect, useState } from "react";
import { Chip, ErrorCard, Logo, PaperCard } from "@/components/ui-aeriq";
import { api } from "@/lib/api";

interface UsageStats {
  callsToday: number;
  cacheHits: number;
  cacheHitRate: number;
  tokensIn: number;
  tokensOut: number;
  dailyCap: number;
  recent: {
    id: string;
    route: string;
    model: string;
    tokensIn: number;
    tokensOut: number;
    cacheHit: boolean;
    createdAt: string;
  }[];
}

export default function GeminiUsagePage() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<UsageStats>("/api/v1/dev/gemini-usage")
      .then((res) => setStats(res.data))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Admin access required")
      );
  }, []);

  return (
    <main className="min-h-screen bg-white text-[var(--ink)] px-[18px] md:px-[34px] py-12 max-w-5xl mx-auto flex flex-col gap-8">
      <header className="flex items-center justify-between border-b border-[var(--rule)] pb-6">
        <Logo />
        <Chip>Admin · Gemini Usage</Chip>
      </header>

      {error ? (
        <ErrorCard code="FORBIDDEN" message={error} />
      ) : !stats ? (
        <p className="font-mono text-[12px]">Loading usage metrics…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <PaperCard>
              <span className="mono text-[var(--muted2)]">Calls today</span>
              <div className="text-[32px] font-medium mt-2 tabular-nums">
                {stats.callsToday} / {stats.dailyCap}
              </div>
            </PaperCard>
            <PaperCard>
              <span className="mono text-[var(--muted2)]">Cache hit rate</span>
              <div className="text-[32px] font-medium mt-2 tabular-nums">
                {Math.round(stats.cacheHitRate * 100)}%
              </div>
            </PaperCard>
            <PaperCard>
              <span className="mono text-[var(--muted2)]">Tokens in</span>
              <div className="text-[32px] font-medium mt-2 tabular-nums">
                {stats.tokensIn}
              </div>
            </PaperCard>
            <PaperCard>
              <span className="mono text-[var(--muted2)]">Tokens out</span>
              <div className="text-[32px] font-medium mt-2 tabular-nums">
                {stats.tokensOut}
              </div>
            </PaperCard>
          </div>

          <PaperCard>
            <Chip>Recent calls</Chip>
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left border-collapse font-mono text-[11px]">
                <thead>
                  <tr className="border-b border-[var(--rule)] text-[var(--muted2)]">
                    <th className="py-2 pr-4">Route</th>
                    <th className="py-2 pr-4">Model</th>
                    <th className="py-2 pr-4">Tokens</th>
                    <th className="py-2 pr-4">Cache</th>
                    <th className="py-2">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--rule)]">
                  {stats.recent.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2 pr-4">{r.route}</td>
                      <td className="py-2 pr-4">{r.model}</td>
                      <td className="py-2 pr-4">
                        {r.tokensIn} / {r.tokensOut}
                      </td>
                      <td className="py-2 pr-4">{r.cacheHit ? "HIT" : "MISS"}</td>
                      <td className="py-2">{r.createdAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PaperCard>
        </>
      )}
    </main>
  );
}
