"use client";

import React, { useCallback, useEffect, useState } from "react";
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
  EmptyState,
  ErrorCard,
  FeatureList,
  GlassCard,
  Hotspot,
  PaperCard,
  SkeletonBlock,
  SourceStamp,
  Sparkline,
} from "@/components/ui-aeriq";
import { AqiAreaChart } from "@/components/charts/AqiAreaChart";
import { api, type ApiNotice } from "@/lib/api";
import { formatIST } from "@/lib/format";
import { mapCategorySlug, useLiveLocation } from "@/hooks/useLiveLocation";
import type { AqiTimePoint, CommunityReport, OfficialStationPin } from "@/types";

const LeafletMap = dynamic(
  () => import("@/components/community/LeafletMap").then((m) => m.LeafletMap),
  { ssr: false, loading: () => <SkeletonBlock height="h-[220px]" /> }
);

interface AqiCurrentDto {
  aqi: {
    aqi: number | null;
    category: string | null;
    unavailableReason: string | null;
    windowEnd: string;
    provider: string;
    stationName: string;
  };
  pollutants: {
    pollutant: string;
    value: number;
    unit: string;
    provider: string;
    stationName: string;
    observedAt: string;
  }[];
  weather: {
    observedAt: string;
    tempC: number;
    rhPct: number;
    windKph: number;
    windDirDeg: number;
    provider: string;
  } | null;
  station: { id: string; name: string; city: string; provider: string };
  advisories?: { code: string; activity: string; text: string }[];
}

interface AiRecDto {
  recommendation: {
    dailySummary: string;
    airQualityStatus: string;
    commute: { summary: string; actions: string[] };
    study: { summary: string; actions: string[] };
    exercise: { summary: string; actions: string[] };
    dataLimitations: string[];
  };
  dataAsOf: string;
}

const HOTSPOT_POS = [
  { left: "12%", top: "62%" },
  { left: "34%", top: "44%" },
  { left: "58%", top: "70%" },
  { left: "72%", top: "40%" },
  { left: "84%", top: "58%" },
  { left: "46%", top: "30%" },
];

export default function DashboardPage() {
  const { location: liveLoc } = useLiveLocation();
  const [firstName, setFirstName] = useState("there");
  const [current, setCurrent] = useState<AqiCurrentDto | null>(null);
  const [notices, setNotices] = useState<ApiNotice[]>([]);
  const [aiRec, setAiRec] = useState<AiRecDto | null>(null);
  const [history, setHistory] = useState<AqiTimePoint[]>([]);
  const [activities, setActivities] = useState<
    { id: string; title: string; setting: string }[]
  >([]);
  const [savedScenariosCount, setSavedScenariosCount] = useState(0);
  const [avoidedMonthly, setAvoidedMonthly] = useState(0);
  const [hotspots, setHotspots] = useState<{
    reports: CommunityReport[];
    stations: OfficialStationPin[];
  }>({ reports: [], stations: [] });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openHs, setOpenHs] = useState<string | null>(null);
  const [expandedAi, setExpandedAi] = useState<string | null>("commute");
  const [rangeTab, setRangeTab] = useState<"24h" | "7d" | "30d">("24h");
  const [refreshing, setRefreshing] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const locParam = liveLoc?.id ? `?locationId=${liveLoc.id}` : "";
      const [meRes, aqiRes, histRes, forecastRes, recRes, planRes, simRes, comRes] =
        await Promise.all([
          api.get<{ user: { name: string } }>("/api/v1/me"),
          api.get<AqiCurrentDto>(`/api/v1/aqi/current${locParam}`),
          api.get<{ points: { t: string; aqi: number | null; category: string | null }[] }>(
            `/api/v1/aqi/history${locParam ? `${locParam}&` : "?"}range=${rangeTab}`
          ),
          api
            .get<{ points: { t: string; value: number; category: string }[] }>(
              `/api/v1/aqi/forecast${locParam ? `${locParam}&` : "?"}hours=48`
            )
            .catch(() => ({ data: { points: [] } })),
          api.post<AiRecDto>("/api/v1/assistant/recommend", {
            locationId: liveLoc?.id,
            force: false,
          }),
          api.get<{ activities: { id: string; title: string; setting: string }[] }>(
            `/api/v1/planner/today${locParam}`
          ),
          api.get<{ scenarios: { result?: { avoidedPerWeek?: number } }[] }>(
            "/api/v1/simulator/scenarios"
          ),
          api.get<{
            reports: {
              id: string;
              category: string;
              description: string;
              status: string;
              createdAt: string;
              roundedPoint: { lat: number; lng: number };
            }[];
            stations: {
              id: string;
              name: string;
              provider: string;
              point: { lat: number; lng: number };
            }[];
          }>(
            `/api/v1/community/hotspots?lat=${liveLoc?.lat ?? 22.5726}&lng=${liveLoc?.lng ?? 88.3639}&radiusKm=15`
          ),
        ]);

      setFirstName(meRes.data.user.name.split(" ")[0] || "there");
      setCurrent(aqiRes.data);
      setNotices(aqiRes.meta.notices);
      setAiRec(recRes.data);
      setActivities(planRes.data.activities);
      setHistory([
        ...histRes.data.points.map((pt) => ({
          label: formatIST(pt.t, "HH:mm").replace(" IST", ""),
          aqi: pt.aqi,
          isForecast: false,
          category: mapCategorySlug(pt.category),
          provider: aqiRes.data.station.provider.toUpperCase(),
          station: aqiRes.data.station.name,
          timestamp: pt.t,
        })),
        ...(rangeTab === "24h"
          ? forecastRes.data.points.slice(0, 12).map((pt) => ({
              label: formatIST(pt.t, "HH:mm").replace(" IST", ""),
              aqi: Math.round(pt.value),
              isForecast: true,
              category: mapCategorySlug(pt.category),
              provider: "Open-Meteo",
              station: aqiRes.data.station.name,
              timestamp: pt.t,
            }))
          : []),
      ]);

      const scenarios = simRes.data.scenarios;
      setSavedScenariosCount(scenarios.length);
      const totalWeekly = scenarios.reduce(
        (s, sc) => s + (sc.result?.avoidedPerWeek ?? 0),
        0
      );
      setAvoidedMonthly(Number((totalWeekly * 4).toFixed(1)));

      setHotspots({
        reports: comRes.data.reports.map((r) => ({
          id: r.id,
          category: "Other",
          description: r.description,
          status:
            r.status === "verified"
              ? "Verified"
              : r.status === "not_verified"
                ? "Not verified"
                : "Pending review",
          reportedAt: r.createdAt,
          lat: r.roundedPoint.lat,
          lng: r.roundedPoint.lng,
          areaLabel: "Rounded ~500m",
        })),
        stations: comRes.data.stations.map((s) => ({
          id: s.id,
          name: s.name,
          provider: s.provider.toUpperCase(),
          aqi: null,
          category: "Unavailable",
          observedAt: new Date().toISOString(),
          lat: s.point.lat,
          lng: s.point.lng,
        })),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [liveLoc, rangeTab]);

  useEffect(() => {
    const id = requestAnimationFrame(() => void loadAll());
    return () => cancelAnimationFrame(id);
  }, [loadAll]);

  const handleRefreshAi = async () => {
    setRefreshing(true);
    try {
      const { data } = await api.post<AiRecDto>("/api/v1/assistant/recommend", {
        locationId: liveLoc?.id,
        force: true,
      });
      setAiRec(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  };

  const city = liveLoc?.city ?? current?.station.city ?? "your city";
  const category = mapCategorySlug(current?.aqi.category);

  return (
    <div>
      <PageHero
        chip={`Good morning, ${firstName}`}
        title={`Today's air in ${city}`}
        subtitle={
          aiRec?.recommendation.dailySummary ??
          "Loading validated station readings and daily guidance."
        }
        height="64vh"
        crop="50% 62%"
        rock
        hud={
          current
            ? [
                `STATION ${current.station.name.toUpperCase()}`,
                `OBSERVED ${formatIST(current.aqi.windowEnd)}`,
                `SOURCE ${current.station.provider.toUpperCase()}`,
              ]
            : ["STATION LOADING", "OBSERVED --:-- IST", "SOURCE CPCB"]
        }
      >
        <GlassCard
          variant="dark"
          tilt
          className="hidden md:block absolute left-[126px] top-[20vh] w-[280px] p-5 z-20"
        >
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-[15px] font-medium">Air quality index</h4>
            <AqiBadge category={category} />
          </div>
          {current && (
            <div className="mt-1.5">
              <SourceStamp
                provider={current.station.provider.toUpperCase()}
                station={current.station.name}
                observedAt={current.aqi.windowEnd}
                className="text-white/75"
              />
            </div>
          )}

          {current?.aqi.aqi !== null && current?.aqi.aqi !== undefined ? (
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-[46px] font-medium tracking-[-0.04em] leading-none">
                <CountUp value={current.aqi.aqi} />
              </span>
              <span className="font-mono text-[10px] tracking-[0.12em] uppercase opacity-80">
                CPCB AQI
              </span>
            </div>
          ) : (
            <div className="mt-3">
              <AqiBadge category="Unavailable" />
              <p className="text-[12px] text-white/80 mt-2">
                {current?.aqi.unavailableReason ?? "Waiting for station data"}
              </p>
            </div>
          )}
        </GlassCard>

        {current?.weather && (
          <GlassCard
            variant="light"
            className="hidden lg:flex items-center gap-3 absolute right-[9%] top-[52%] px-3.5 py-2 z-20"
          >
            <Wind className="w-4 h-4 text-[var(--leaf)]" />
            <div className="font-mono text-[10.5px] tracking-[0.1em] uppercase">
              {current.weather.tempC} °C · {current.weather.rhPct}% RH ·{" "}
              {current.weather.windKph} km/h · {current.weather.provider}
            </div>
          </GlassCard>
        )}

        <div className="hidden md:block absolute inset-0 pointer-events-none z-10">
          {current?.pollutants.slice(0, 6).map((p, i) => (
            <div key={p.pollutant} className="pointer-events-auto">
              <Hotspot
                label={p.pollutant.toUpperCase()}
                value={`${p.value} ${p.unit} · ${formatIST(p.observedAt)}`}
                open={openHs === p.pollutant}
                onToggle={() =>
                  setOpenHs(openHs === p.pollutant ? null : p.pollutant)
                }
                style={HOTSPOT_POS[i % HOTSPOT_POS.length]}
              />
            </div>
          ))}
        </div>
      </PageHero>

      <Panel>
        {notices.map((n, i) => (
          <div key={i} className="mb-4">
            <ErrorCard
              code={n.code.toUpperCase()}
              message={
                n.provider
                  ? `Live data from ${n.provider} is unavailable right now. Showing the last reading from ${n.lastSuccessAt ? formatIST(n.lastSuccessAt) : "earlier"}.`
                  : (n.message ?? "Provider notice")
              }
            />
          </div>
        ))}

        {error && (
          <div className="mb-4">
            <ErrorCard message={error} onRetry={loadAll} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-[14px]">
          <div className="lg:col-span-7">
            {loading || !aiRec ? (
              <SkeletonBlock height="h-[300px]" />
            ) : (
              <AiCard
                title="What to do today"
                summary={aiRec.recommendation.airQualityStatus}
                dataLimitations={aiRec.recommendation.dataLimitations.join(" ")}
                footer={
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    {current && (
                      <SourceStamp
                        provider={current.station.provider.toUpperCase()}
                        station={current.station.name}
                        observedAt={aiRec.dataAsOf}
                      />
                    )}
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
                        disabled={refreshing}
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
                  {(["commute", "study", "exercise"] as const).map((key, idx) => {
                    const sec = aiRec.recommendation[key];
                    const isOpen = expandedAi === key;
                    return (
                      <div
                        key={key}
                        className="border-b border-[rgba(16,41,26,0.12)] last:border-b-0"
                      >
                        <button
                          type="button"
                          onClick={() => setExpandedAi(isOpen ? null : key)}
                          className="w-full grid grid-cols-[30px_1fr_16px] items-center gap-2 py-2.5 text-left font-mono text-[11px] tracking-[0.12em] uppercase cursor-pointer hover:text-[var(--leaf)]"
                        >
                          <span className="opacity-60">
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          <span>
                            {key} — {sec.summary}
                          </span>
                          <span>{isOpen ? "−" : "→"}</span>
                        </button>
                        {isOpen && (
                          <ul className="pb-3 pl-[38px] text-[14px] leading-[1.5] text-[var(--muted)] list-disc">
                            {sec.actions.map((a, i) => (
                              <li key={i}>{a}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              </AiCard>
            )}
          </div>

          <div className="lg:col-span-5">
            {loading ? (
              <SkeletonBlock height="h-[300px]" />
            ) : (
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
                  {activities.length === 0 ? (
                    <EmptyState
                      title="No plan built yet"
                      description="Generate your daily plan timed to cleaner air windows."
                    />
                  ) : (
                    <FeatureList
                      items={activities.slice(0, 3).map((act, i) => ({
                        index: String(i + 1).padStart(2, "0"),
                        label: (
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate">{act.title}</span>
                            <span className="shrink-0 text-[9.5px] px-1.5 py-0.5 rounded-[3px] bg-white border border-[var(--rule)]">
                              {act.setting}
                            </span>
                          </span>
                        ),
                        href: "/planner",
                      }))}
                    />
                  )}
                </div>
              </PaperCard>
            )}
          </div>

          {/* Pollutant cards */}
          <div className="lg:col-span-12 mt-2">
            {loading ? (
              <SkeletonBlock height="h-28" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-[14px]">
                {current?.pollutants.map((p) => (
                  <PaperCard key={p.pollutant} className="flex flex-col justify-between gap-3">
                    <div className="flex items-center justify-between">
                      <span className="mono text-[var(--muted2)]">
                        {p.pollutant.toUpperCase()}
                      </span>
                      <Sparkline width={60} height={24} />
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
                      provider={p.provider.toUpperCase()}
                      station={p.stationName}
                      observedAt={p.observedAt}
                    />
                  </PaperCard>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-8">
            <PaperCard>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <Chip>History</Chip>
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
              {history.length === 0 ? (
                <EmptyState
                  title="No history snapshots yet"
                  description="Hourly observations will plot here as station snapshots accumulate."
                />
              ) : (
                <AqiAreaChart data={history} height={260} />
              )}
            </PaperCard>
          </div>

          <div className="lg:col-span-4">
            <PaperCard className="h-full flex flex-col justify-between">
              <div>
                <Chip>Weather</Chip>
                <h3 className="text-[20px] font-medium tracking-[-0.03em] mt-2 mb-4">
                  Current conditions
                </h3>
                {current?.weather ? (
                  <div className="flex flex-col gap-2 font-mono text-[12px]">
                    <div>TEMP: {current.weather.tempC} °C</div>
                    <div>HUMIDITY: {current.weather.rhPct} %</div>
                    <div>WIND: {current.weather.windKph} km/h</div>
                  </div>
                ) : (
                  <p className="text-[13px] text-[var(--muted)]">
                    Weather data unavailable.
                  </p>
                )}
              </div>
              {current?.weather && (
                <SourceStamp
                  provider="OPEN-METEO"
                  station={city}
                  observedAt={current.weather.observedAt}
                />
              )}
            </PaperCard>
          </div>

          <div className="lg:col-span-6">
            <PaperCard className="h-full flex flex-col justify-between">
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
              {savedScenariosCount === 0 ? (
                <EmptyState
                  title="No saved scenarios yet"
                  description="Compare commute modes in the simulator to track avoided emissions."
                />
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className="text-[46px] font-medium tracking-[-0.04em] leading-none">
                    <CountUp value={avoidedMonthly} decimals={1} />
                  </span>
                  <span className="font-mono text-[11px] uppercase text-[var(--muted2)]">
                    kg CO₂e this month
                  </span>
                </div>
              )}
            </PaperCard>
          </div>

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
                  center={[liveLoc?.lat ?? 22.5726, liveLoc?.lng ?? 88.3639]}
                  reports={hotspots.reports}
                  stations={hotspots.stations}
                  userLocation={
                    liveLoc
                      ? { lat: liveLoc.lat, lng: liveLoc.lng, label: `${liveLoc.city} (~500 m)` }
                      : null
                  }
                  height="220px"
                />
              </div>
              <p className="font-mono text-[10px] tracking-[0.1em] uppercase text-[var(--muted2)]">
                {hotspots.reports.length} nearby community observations ·{" "}
                {hotspots.stations.length} CPCB stations
              </p>
            </PaperCard>
          </div>
        </div>
      </Panel>
    </div>
  );
}
