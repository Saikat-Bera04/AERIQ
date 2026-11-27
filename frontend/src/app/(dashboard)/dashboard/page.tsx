"use client";

import React, { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { RefreshCw, Wind } from "lucide-react";
import { PageHero } from "@/components/layout/PageHero";
import { Panel, SectionHeader } from "@/components/layout/Panel";
import {
  AiCard,
  AqiBadge,
  Chip,
  CountUp,
  FeatureList,
  GlassCard,
  Hotspot,
  PaperCard,
  SkeletonBlock,
  SourceStamp,
  Sparkline,
} from "@/components/ui-aeriq";
import { AqiAreaChart } from "@/components/charts/AqiAreaChart";
import {
  MOCK_AI_RECOMMENDATION,
  MOCK_AQI_CURRENT,
  MOCK_COMMUNITY_REPORTS,
  MOCK_HISTORY_24H,
  MOCK_OFFICIAL_STATIONS,
  MOCK_PLANNER_ACTIVITIES,
  MOCK_USER,
} from "@/mocks/data";
import { formatIST } from "@/lib/format";

const LeafletMap = dynamic(
  () => import("@/components/community/LeafletMap").then((m) => m.LeafletMap),
  {
    ssr: false,
    loading: () => <SkeletonBlock height="h-[260px]" />,
  }
);

export default function DashboardPage() {
  const [openHs, setOpenHs] = useState<string | null>(null);
  const [expandedAi, setExpandedAi] = useState<string | null>("commute");
  const [rangeTab, setRangeTab] = useState<"24h" | "7d" | "30d">("24h");
  const [refreshing, setRefreshing] = useState(false);

  const data = MOCK_AQI_CURRENT;
  const ai = MOCK_AI_RECOMMENDATION;

  const handleRefreshAi = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  return (
    <div>
      <PageHero
        chip={`Good morning, ${MOCK_USER.firstName}`}
        title={`Today's air in ${data.location.city}`}
        subtitle={ai.dailySummary}
        height="64vh"
        crop="50% 62%"
        rock
        hud={[
          `STATION ${data.station}`,
          `OBSERVED ${formatIST(data.observedAt)}`,
          `SOURCE ${data.provider}`,
        ]}
      >
        {/* Dark glass AQI card on stage */}
        <GlassCard
          variant="dark"
          tilt
          className="hidden md:block absolute left-[126px] top-[20vh] w-[280px] p-5 z-20"
        >
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-[15px] font-medium">Air quality index</h4>
            <AqiBadge category={data.category} />
          </div>
          <div className="mt-1.5">
            <SourceStamp
              provider={data.provider}
              station={data.station}
              observedAt={data.observedAt}
              className="text-white/75"
            />
          </div>

          {data.aqi !== null ? (
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-[46px] font-medium tracking-[-0.04em] leading-none">
                <CountUp value={data.aqi} />
              </span>
              <span className="font-mono text-[10px] tracking-[0.12em] uppercase opacity-80">
                CPCB AQI
              </span>
            </div>
          ) : (
            <div className="mt-3">
              <AqiBadge category="Unavailable" />
              <p className="text-[12px] text-white/80 mt-2">
                {data.unavailableReason ?? "PM2.5 averaging period incomplete"}
              </p>
            </div>
          )}

          <div className="mt-3">
            <Sparkline points={data.sparkline24h} />
          </div>
        </GlassCard>

        {/* Weather pill top-right under HUD */}
        <GlassCard
          variant="light"
          className="hidden lg:flex items-center gap-3 absolute right-[9%] top-[52%] px-3.5 py-2 z-20"
        >
          <Wind className="w-4 h-4 text-[var(--leaf)]" />
          <div className="font-mono text-[10.5px] tracking-[0.1em] uppercase">
            {data.weather.tempC} °C · {data.weather.humidityPct}% RH ·{" "}
            {data.weather.windKmh} km/h {data.weather.windDir} ·{" "}
            {data.weather.provider}
          </div>
        </GlassCard>

        {/* Pollutant hotspots on stage */}
        <div className="hidden md:block absolute inset-0 pointer-events-none z-10">
          {data.pollutants.map((p) => (
            <div
              key={p.key}
              className="pointer-events-auto"
            >
              <Hotspot
                label={p.label}
                value={`${p.value} ${p.unit} · ${formatIST(p.observedAt)}`}
                open={openHs === p.key}
                onToggle={() => setOpenHs(openHs === p.key ? null : p.key)}
                style={{ left: p.hotspotPos.left, top: p.hotspotPos.top }}
              />
            </div>
          ))}
        </div>
      </PageHero>

      <Panel>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-[14px]">
          {/* AI recommendation (span 7) */}
          <div className="lg:col-span-7">
            <AiCard
              title="What to do today"
              summary={ai.airQualityStatus}
              dataLimitations={ai.dataLimitations}
              footer={
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <SourceStamp
                    provider={ai.provider}
                    station={ai.station}
                    observedAt={ai.observedAt}
                  />
                  <div className="flex items-center gap-3">
                    <Link
                      href="/assistant"
                      className="font-mono text-[10.5px] tracking-[0.12em] uppercase text-[var(--ink)] underline underline-offset-4 hover:text-[var(--leaf)]"
                    >
                      Ask a follow-up →
                    </Link>
                    <button
                      type="button"
                      onClick={handleRefreshAi}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-white border border-[var(--rule)] font-mono text-[10px] tracking-[0.12em] uppercase cursor-pointer hover:border-[var(--ink)]"
                    >
                      <RefreshCw
                        className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`}
                      />
                      Refresh
                    </button>
                  </div>
                </div>
              }
            >
              <div className="flex flex-col border-t border-[var(--rule)] pt-2">
                {ai.sections.map((sec, idx) => {
                  const isOpen = expandedAi === sec.key;
                  return (
                    <div
                      key={sec.key}
                      className="border-b border-[rgba(16,41,26,0.12)] last:border-b-0"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedAi(isOpen ? null : sec.key)
                        }
                        className="w-full grid grid-cols-[30px_1fr_16px] items-center gap-2 py-2.5 text-left font-mono text-[11px] tracking-[0.12em] uppercase cursor-pointer hover:text-[var(--leaf)]"
                      >
                        <span className="opacity-60">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <span>
                          {sec.title} — {sec.summary}
                        </span>
                        <span>{isOpen ? "−" : "→"}</span>
                      </button>
                      {isOpen && (
                        <p className="pb-3 pl-[38px] text-[14px] leading-[1.5] text-[var(--muted)]">
                          {sec.detail}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </AiCard>
          </div>

          {/* Today's plan (span 5) */}
          <div className="lg:col-span-5">
            <PaperCard className="h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Chip>Planner</Chip>
                  <Link
                    href="/planner"
                    className="font-mono text-[10.5px] tracking-[0.12em] uppercase text-[var(--muted)] hover:text-[var(--ink)]"
                  >
                    Open planner →
                  </Link>
                </div>
                <h3 className="text-[20px] font-medium tracking-[-0.03em] mb-3">
                  Next in your day
                </h3>
                <FeatureList
                  items={MOCK_PLANNER_ACTIVITIES.slice(0, 3).map((act, i) => ({
                    index: String(i + 1).padStart(2, "0"),
                    label: (
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate">{act.title}</span>
                        <span className="shrink-0 text-[9.5px] px-1.5 py-0.5 rounded-[3px] bg-white border border-[var(--rule)]">
                          {act.mode}
                        </span>
                      </span>
                    ),
                    href: "/planner",
                  }))}
                />
              </div>
              <p className="font-mono text-[10px] tracking-[0.1em] uppercase text-[var(--muted2)] mt-4">
                3 activities · timed to afternoon dispersion
              </p>
            </PaperCard>
          </div>

          {/* 6 Pollutant cards (span 12) */}
          <div className="lg:col-span-12 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-[14px]">
              {data.pollutants.map((p) => (
                <PaperCard key={p.key} className="flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between">
                    <span className="mono text-[var(--muted2)]">{p.label}</span>
                    <Sparkline points={p.sparkline} width={60} height={24} />
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[32px] font-medium tracking-[-0.04em] leading-none tabular-nums">
                      {p.value}
                    </span>
                    <span className="font-mono text-[10px] text-[var(--muted2)]">
                      {p.unit}
                    </span>
                  </div>
                  <SourceStamp
                    provider={p.provider}
                    station={p.station}
                    observedAt={p.observedAt}
                  />
                </PaperCard>
              ))}
            </div>
          </div>

          {/* History + forecast chart (span 8) */}
          <div className="lg:col-span-8">
            <PaperCard>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <Chip>History & forecast</Chip>
                  <h3 className="text-[20px] font-medium tracking-[-0.03em] mt-2">
                    AQI trajectory
                  </h3>
                </div>
                <div className="flex items-center gap-1.5">
                  {(["24h", "7d", "30d"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setRangeTab(tab)}
                      className={`px-2.5 py-1 rounded-[4px] font-mono text-[10.5px] uppercase tracking-[0.12em] cursor-pointer ${
                        rangeTab === tab
                          ? "bg-[var(--lime)] text-[var(--ink)]"
                          : "bg-white border border-[var(--rule)] text-[var(--muted)]"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
              <AqiAreaChart data={MOCK_HISTORY_24H} height={260} />
            </PaperCard>
          </div>

          {/* Weather card (span 4) */}
          <div className="lg:col-span-4">
            <PaperCard className="h-full flex flex-col justify-between">
              <div>
                <Chip>Weather</Chip>
                <h3 className="text-[20px] font-medium tracking-[-0.03em] mt-2 mb-4">
                  Next 12 hours
                </h3>
                <div className="flex flex-col divide-y divide-[var(--rule)]">
                  {data.weather.hourly.map((h) => (
                    <div
                      key={h.timeLabel}
                      className="py-2.5 flex items-center justify-between font-mono text-[11px]"
                    >
                      <span className="text-[var(--muted2)]">{h.timeLabel} IST</span>
                      <span className="font-medium">{h.tempC} °C</span>
                      <span className="text-[var(--muted)]">
                        {h.windKmh} km/h
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4">
                <SourceStamp
                  provider={data.weather.provider}
                  station={data.location.city}
                  observedAt={data.weather.observedAt}
                  isForecast
                />
              </div>
            </PaperCard>
          </div>

          {/* Impact so far (span 6) */}
          <div className="lg:col-span-6">
            <PaperCard className="h-full flex flex-col justify-between">
              <div>
                <SectionHeader
                  chip="Impact so far"
                  title="Avoided emissions"
                  rightSlot={
                    <Link
                      href="/simulator"
                      className="font-mono text-[10.5px] tracking-[0.12em] uppercase text-[var(--leaf)] underline underline-offset-4"
                    >
                      Open simulator →
                    </Link>
                  }
                />
                <div className="flex items-baseline gap-2">
                  <span className="text-[46px] font-medium tracking-[-0.04em] leading-none">
                    <CountUp value={15.5} decimals={1} />
                  </span>
                  <span className="font-mono text-[11px] uppercase text-[var(--muted2)]">
                    kg CO₂e this month
                  </span>
                </div>
              </div>
              <Link
                href="/simulator"
                className="mt-4 font-mono text-[10.5px] tracking-[0.12em] uppercase text-[var(--muted2)] hover:text-[var(--ink)]"
              >
                Estimate · see assumptions →
              </Link>
            </PaperCard>
          </div>

          {/* Community preview mini map (span 6) */}
          <div className="lg:col-span-6">
            <PaperCard className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <Chip>Community</Chip>
                <Link
                  href="/community"
                  className="font-mono text-[10.5px] tracking-[0.12em] uppercase text-[var(--ink)] hover:text-[var(--leaf)]"
                >
                  Open map →
                </Link>
              </div>
              <div className="rounded-[10px] overflow-hidden border border-[var(--rule)] h-[220px]">
                <LeafletMap
                  reports={MOCK_COMMUNITY_REPORTS}
                  stations={MOCK_OFFICIAL_STATIONS}
                  height="220px"
                />
              </div>
              <p className="font-mono text-[10px] tracking-[0.1em] uppercase text-[var(--muted2)]">
                {MOCK_COMMUNITY_REPORTS.length} nearby community observations ·{" "}
                {MOCK_OFFICIAL_STATIONS.length} CPCB stations
              </p>
            </PaperCard>
          </div>
        </div>
      </Panel>
    </div>
  );
}
