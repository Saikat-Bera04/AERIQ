"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Check, RotateCw } from "lucide-react";
import { PageHero } from "@/components/layout/PageHero";
import { Panel } from "@/components/layout/Panel";
import {
  AiCard,
  AqiBadge,
  Chip,
  EmptyState,
  GlassCard,
  PaperCard,
  SkeletonBlock,
} from "@/components/ui-aeriq";
import { api } from "@/lib/api";
import { formatIST, getAqiColors } from "@/lib/format";
import { mapCategorySlug, useLiveLocation } from "@/hooks/useLiveLocation";

interface ApiPlanActivity {
  id: string;
  title: string;
  start: string;
  end: string;
  setting: "outdoor" | "indoor";
  expectedAqi: number | null;
  expectedCategory: string | null;
  reason: string;
  indoorAlternative: { title: string; reason: string } | null;
  completedAt: string | null;
}

interface ApiWindowSeg {
  hour: number;
  hourLabel: string;
  aqi: number | null;
  category: string;
  provider: string;
  kind: "observation" | "forecast";
}

export default function PlannerPage() {
  const { location: liveLoc } = useLiveLocation();
  const [activities, setActivities] = useState<ApiPlanActivity[]>([]);
  const [windowStrip, setWindowStrip] = useState<ApiWindowSeg[]>([]);
  const [conditionsChanged, setConditionsChanged] = useState(false);
  const [builtAt, setBuiltAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [flippedIds, setFlippedIds] = useState<Record<string, boolean>>({});
  const [hoveredSeg, setHoveredSeg] = useState<number | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("16:30");
  const [flexible, setFlexible] = useState(true);

  const loadPlan = useCallback(async () => {
    setLoading(true);
    try {
      const locParam = liveLoc?.id ? `?locationId=${liveLoc.id}` : "";
      const { data } = await api.get<{
        plan: { builtAt: string };
        activities: ApiPlanActivity[];
        conditionsChanged: boolean;
        windowStrip: ApiWindowSeg[];
      }>(`/api/v1/planner/today${locParam}`);
      setActivities(data.activities);
      setWindowStrip(data.windowStrip);
      setConditionsChanged(data.conditionsChanged);
      setBuiltAt(data.plan.builtAt);
    } finally {
      setLoading(false);
    }
  }, [liveLoc?.id]);

  useEffect(() => {
    const id = requestAnimationFrame(() => void loadPlan());
    return () => cancelAnimationFrame(id);
  }, [loadPlan]);

  const regeneratePlan = async () => {
    setLoading(true);
    try {
      const { data } = await api.post<{
        plan: { builtAt: string };
        activities: ApiPlanActivity[];
        conditionsChanged: boolean;
        windowStrip: ApiWindowSeg[];
      }>("/api/v1/planner/generate", { locationId: liveLoc?.id });
      setActivities(data.activities);
      setWindowStrip(data.windowStrip);
      setConditionsChanged(false);
      setBuiltAt(data.plan.builtAt);
    } finally {
      setLoading(false);
    }
  };

  const toggleComplete = async (act: ApiPlanActivity) => {
    const nextDone = !act.completedAt;
    const { data } = await api.patch<ApiPlanActivity>(
      `/api/v1/planner/activities/${act.id}`,
      { completed: nextDone }
    );
    setActivities((prev) => prev.map((a) => (a.id === act.id ? data : a)));
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const { data } = await api.post<ApiPlanActivity>("/api/v1/planner/activities", {
      title: newTitle.trim(),
      preferredTime: newTime,
      flexible,
      durationMinutes: 45,
    });
    setActivities((prev) => [...prev, data]);
    setNewTitle("");
  };

  const completedCount = activities.filter((a) => Boolean(a.completedAt)).length;
  const pct = activities.length ? completedCount / activities.length : 0;

  return (
    <div>
      <PageHero
        chip="Adaptive planner"
        title="Your day, timed to the air"
        height="48vh"
        crop="30% 55%"
        hud={[
          `ACTIVITIES ${activities.length}`,
          `PLAN BUILT ${builtAt ? formatIST(builtAt) : "--:-- IST"}`,
          `CITY ${(liveLoc?.city ?? "YOUR CITY").toUpperCase()}`,
        ]}
      >
        {windowStrip.length > 0 && (
          <GlassCard
            variant="light"
            className="hidden md:flex items-center gap-1 absolute left-[126px] right-[34px] bottom-6 h-[72px] px-4 z-20"
          >
            <div className="relative flex-1 grid grid-cols-9 gap-1 h-9 items-stretch">
              {windowStrip.map((seg, i) => {
                const cat = mapCategorySlug(seg.category);
                const c = getAqiColors(cat);
                return (
                  <div
                    key={seg.hourLabel}
                    onMouseEnter={() => setHoveredSeg(i)}
                    onMouseLeave={() => setHoveredSeg(null)}
                    className="relative rounded-[4px] flex flex-col justify-end p-1 cursor-pointer"
                    style={{
                      backgroundColor: c.bg,
                      backgroundImage:
                        seg.kind === "forecast"
                          ? "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.28) 4px, rgba(255,255,255,0.28) 8px)"
                          : undefined,
                    }}
                  >
                    <span className="font-mono text-[9px] text-[var(--ink)] font-medium leading-none">
                      {seg.hourLabel}
                    </span>
                    {hoveredSeg === i && (
                      <div className="absolute bottom-11 left-0 z-30 bg-[var(--ink)] text-white px-2.5 py-1.5 rounded-[6px] font-mono text-[10px] whitespace-nowrap shadow-lg">
                        AQI {seg.aqi ?? "N/A"} · {cat} · {seg.provider.toUpperCase()} (
                        {seg.kind})
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </GlassCard>
        )}
      </PageHero>

      <Panel>
        {conditionsChanged && (
          <div className="mb-6 rounded-[12px] bg-[var(--ink)] text-[var(--lime)] px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
            <span className="font-mono text-[11px] tracking-[0.12em] uppercase">
              Air quality changed since this plan was built.
            </span>
            <button
              type="button"
              onClick={regeneratePlan}
              className="px-3.5 py-1.5 rounded-[6px] bg-[var(--lime)] text-[var(--ink)] font-mono text-[10.5px] tracking-[0.12em] uppercase font-medium cursor-pointer hover:bg-[var(--lime2)]"
            >
              Regenerate plan
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 flex flex-col gap-4">
            {loading ? (
              <SkeletonBlock height="h-64" />
            ) : activities.length === 0 ? (
              <PaperCard>
                <EmptyState
                  title="No plan built yet"
                  description="Generate today's adaptive plan based on live station readings."
                  action={
                    <button
                      type="button"
                      onClick={regeneratePlan}
                      className="h-10 px-5 rounded-[8px] bg-[var(--ink)] text-[var(--lime)] font-mono text-[11px] uppercase cursor-pointer"
                    >
                      Generate plan
                    </button>
                  }
                />
              </PaperCard>
            ) : (
              activities.map((act) => {
                const flipped = Boolean(flippedIds[act.id]);
                const timeRange = `${formatIST(act.start)} – ${formatIST(act.end)}`;
                const cat = mapCategorySlug(act.expectedCategory);
                return (
                  <div
                    key={act.id}
                    className="flex gap-4 items-stretch"
                    style={{ perspective: "1000px" }}
                  >
                    <div className="hidden sm:flex flex-col items-end w-20 pt-4 shrink-0">
                      <span className="font-mono text-[10.5px] text-[var(--muted2)]">
                        {formatIST(act.start).replace(" IST", "")}
                      </span>
                      <div className="w-[1px] flex-1 bg-[var(--rule)] mt-2 mr-1" />
                    </div>

                    <div
                      className="relative flex-1 transition-transform duration-[600ms]"
                      style={{
                        transformStyle: "preserve-3d",
                        transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
                      }}
                    >
                      <div
                        className={flipped ? "pointer-events-none" : ""}
                        style={{
                          backfaceVisibility: "hidden",
                          WebkitBackfaceVisibility: "hidden",
                          transform: "rotateY(0deg)",
                        }}
                      >
                        <PaperCard className="flex items-start justify-between gap-4">
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-[10.5px] tracking-[0.12em] uppercase text-[var(--muted2)]">
                                {timeRange}
                              </span>
                              <Chip
                                variant={act.setting === "outdoor" ? "lime" : "ink"}
                              >
                                {act.setting}
                              </Chip>
                              <AqiBadge category={cat} value={act.expectedAqi} />
                            </div>
                            <h3
                              className={`text-[17px] font-medium tracking-[-0.02em] ${
                                act.completedAt ? "line-through opacity-55" : ""
                              }`}
                            >
                              {act.title}
                            </h3>
                            <p className="text-[13.5px] text-[var(--muted)]">
                              {act.reason}
                            </p>

                            {act.indoorAlternative && (
                              <button
                                type="button"
                                onClick={() =>
                                  setFlippedIds((prev) => ({ ...prev, [act.id]: true }))
                                }
                                className="self-start mt-1 px-2.5 py-1 rounded-[4px] border border-[var(--rule)] font-mono text-[10px] tracking-[0.12em] uppercase hover:border-[var(--ink)] cursor-pointer"
                              >
                                Swap to indoor →
                              </button>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => void toggleComplete(act)}
                            aria-label={`Mark ${act.title} complete`}
                            className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 transition-transform duration-300 cursor-pointer ${
                              act.completedAt
                                ? "bg-[var(--lime)] border-[var(--ink)] scale-105"
                                : "bg-white border-[var(--rule)] hover:border-[var(--ink)]"
                            }`}
                          >
                            {act.completedAt && (
                              <Check className="w-4 h-4 text-[var(--ink)]" />
                            )}
                          </button>
                        </PaperCard>
                      </div>

                      {act.indoorAlternative && (
                        <div
                          className={`absolute inset-0 ${flipped ? "" : "pointer-events-none"}`}
                          style={{
                            backfaceVisibility: "hidden",
                            WebkitBackfaceVisibility: "hidden",
                            transform: "rotateY(180deg)",
                          }}
                        >
                          <PaperCard className="h-full flex flex-col justify-between bg-[var(--ink)] text-white border-none">
                            <div>
                              <Chip>Indoor alternative</Chip>
                              <h3 className="text-[17px] font-medium mt-2">
                                {act.indoorAlternative.title}
                              </h3>
                              <p className="text-[13.5px] text-white/80 mt-1">
                                {act.indoorAlternative.reason}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setFlippedIds((prev) => ({ ...prev, [act.id]: false }))
                              }
                              className="self-start inline-flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.12em] uppercase text-[var(--lime)] cursor-pointer"
                            >
                              <RotateCw className="w-3.5 h-3.5" />
                              Back to original
                            </button>
                          </PaperCard>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="lg:col-span-4 flex flex-col gap-4">
            <AiCard
              title="Why this plan"
              summary="Activities are scored against hourly observation and Open-Meteo forecast windows within ±3 hours of your preferred time."
              dataLimitations="Deterministic planner timing paired with your cached daily guidance."
            />

            <PaperCard className="flex items-center justify-between gap-4">
              <div>
                <Chip>Completed today</Chip>
                <div className="text-[32px] font-medium tracking-[-0.04em] mt-2 tabular-nums">
                  {completedCount} / {activities.length}
                </div>
              </div>
              <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  fill="none"
                  stroke="var(--rule)"
                  strokeWidth="5"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  fill="none"
                  stroke="var(--lime2)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={163.36}
                  strokeDashoffset={163.36 * (1 - pct)}
                  transform="rotate(-90 32 32)"
                />
              </svg>
            </PaperCard>

            <PaperCard>
              <Chip>Add activity</Chip>
              <form onSubmit={handleAddActivity} className="mt-4 flex flex-col gap-3">
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Library study session"
                  className="h-10 px-3 rounded-[8px] bg-white border border-[var(--rule)] text-[14px]"
                />
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="h-10 px-3 rounded-[8px] bg-white border border-[var(--rule)] font-mono text-[12px]"
                  />
                  <label className="flex items-center gap-2 text-[12px] text-[var(--muted)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={flexible}
                      onChange={(e) => setFlexible(e.target.checked)}
                      className="accent-[var(--ink)]"
                    />
                    Indoor/outdoor flexible
                  </label>
                </div>
                <button
                  type="submit"
                  className="h-10 rounded-[8px] bg-[var(--ink)] text-[var(--lime)] font-mono text-[11px] tracking-[0.14em] uppercase cursor-pointer"
                >
                  Add to plan
                </button>
              </form>
            </PaperCard>
          </div>
        </div>
      </Panel>
    </div>
  );
}
