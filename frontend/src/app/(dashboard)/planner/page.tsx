"use client";

import React, { useState } from "react";
import { Check, RotateCw } from "lucide-react";
import { PageHero } from "@/components/layout/PageHero";
import { Panel } from "@/components/layout/Panel";
import {
  AiCard,
  AqiBadge,
  Chip,
  GlassCard,
  PaperCard,
} from "@/components/ui-aeriq";
import { getAqiColors } from "@/lib/format";
import {
  MOCK_PLANNER_ACTIVITIES,
  MOCK_PLANNER_SEGMENTS,
} from "@/mocks/data";
import type { PlannerActivity } from "@/types";

export default function PlannerPage() {
  const [activities, setActivities] = useState<PlannerActivity[]>(
    MOCK_PLANNER_ACTIVITIES
  );
  const [flippedIds, setFlippedIds] = useState<Record<string, boolean>>({});
  const [conditionsChanged, setConditionsChanged] = useState(true);
  const [hoveredSeg, setHoveredSeg] = useState<number | null>(null);

  // Add activity form
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("16:30");
  const [flexible, setFlexible] = useState(true);

  const completedCount = activities.filter((a) => a.completed).length;
  const pct = activities.length ? completedCount / activities.length : 0;

  const toggleComplete = (id: string) => {
    setActivities((prev) =>
      prev.map((a) => (a.id === id ? { ...a, completed: !a.completed } : a))
    );
  };

  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const item: PlannerActivity = {
      id: `act-${Date.now()}`,
      timeRange: `${newTime} IST`,
      hourStart: Number(newTime.split(":")[0]) || 16,
      title: newTitle.trim(),
      mode: flexible ? "Outdoor" : "Indoor",
      expectedAqi: 158,
      expectedCategory: "Moderate",
      reason: flexible
        ? "Scheduled during afternoon moderate window"
        : "Indoor routine",
      completed: false,
    };
    setActivities((prev) => [...prev, item]);
    setNewTitle("");
  };

  return (
    <div>
      <PageHero
        chip="Adaptive planner"
        title="Your day, timed to the air"
        height="48vh"
        crop="30% 55%"
        hud={[
          "DATE THU 27 NOV",
          `ACTIVITIES ${activities.length}`,
          "PLAN BUILT 08:15 IST",
        ]}
      >
        {/* Air window strip at bottom of stage */}
        <GlassCard
          variant="light"
          className="hidden md:flex items-center gap-1 absolute left-[126px] right-[34px] bottom-6 h-[72px] px-4 z-20"
        >
          <div className="relative flex-1 grid grid-cols-9 gap-1 h-9 items-stretch">
            {MOCK_PLANNER_SEGMENTS.map((seg, i) => {
              const c = getAqiColors(seg.category);
              return (
                <div
                  key={seg.hourLabel}
                  onMouseEnter={() => setHoveredSeg(i)}
                  onMouseLeave={() => setHoveredSeg(null)}
                  className="relative rounded-[4px] flex flex-col justify-end p-1 cursor-pointer"
                  style={{
                    backgroundColor: c.bg,
                    backgroundImage: seg.isForecast
                      ? "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.28) 4px, rgba(255,255,255,0.28) 8px)"
                      : undefined,
                  }}
                >
                  <span className="font-mono text-[9px] text-[var(--ink)] font-medium leading-none">
                    {seg.hourLabel}
                  </span>
                  {hoveredSeg === i && (
                    <div className="absolute bottom-11 left-0 z-30 bg-[var(--ink)] text-white px-2.5 py-1.5 rounded-[6px] font-mono text-[10px] whitespace-nowrap shadow-lg">
                      AQI {seg.aqi} · {seg.category} · {seg.provider} (
                      {seg.isForecast ? "Forecast" : "Observation"})
                    </div>
                  )}
                </div>
              );
            })}
            {/* Live NOW line */}
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-[var(--lime)] pointer-events-none"
              style={{ left: "26%" }}
              aria-hidden="true"
            >
              <span className="absolute -top-4 -translate-x-1/2 font-mono text-[8.5px] bg-[var(--ink)] text-[var(--lime)] px-1 rounded-[2px]">
                NOW
              </span>
            </div>
          </div>
        </GlassCard>
      </PageHero>

      <Panel>
        {conditionsChanged && (
          <div className="mb-6 rounded-[12px] bg-[var(--ink)] text-[var(--lime)] px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
            <span className="font-mono text-[11px] tracking-[0.12em] uppercase">
              Air quality changed since this plan was built.
            </span>
            <button
              type="button"
              onClick={() => setConditionsChanged(false)}
              className="px-3.5 py-1.5 rounded-[6px] bg-[var(--lime)] text-[var(--ink)] font-mono text-[10.5px] tracking-[0.12em] uppercase font-medium cursor-pointer hover:bg-[var(--lime2)]"
            >
              Regenerate plan
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Timeline (8 columns) */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            {activities.map((act) => {
              const flipped = Boolean(flippedIds[act.id]);
              return (
                <div
                  key={act.id}
                  className="flex gap-4 items-stretch"
                  style={{ perspective: "1000px" }}
                >
                  <div className="hidden sm:flex flex-col items-end w-20 pt-4 shrink-0">
                    <span className="font-mono text-[10.5px] text-[var(--muted2)]">
                      {act.timeRange.split(" ")[0]}
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
                    {/* Front */}
                    <PaperCard className="flex items-start justify-between gap-4 [backface-visibility:hidden]">
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[10.5px] tracking-[0.12em] uppercase text-[var(--muted2)]">
                            {act.timeRange}
                          </span>
                          <Chip
                            variant={act.mode === "Outdoor" ? "lime" : "ink"}
                          >
                            {act.mode}
                          </Chip>
                          <AqiBadge
                            category={act.expectedCategory}
                            value={act.expectedAqi}
                          />
                        </div>
                        <h3
                          className={`text-[17px] font-medium tracking-[-0.02em] ${
                            act.completed ? "line-through opacity-55" : ""
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
                              setFlippedIds((prev) => ({
                                ...prev,
                                [act.id]: true,
                              }))
                            }
                            className="self-start mt-1 px-2.5 py-1 rounded-[4px] border border-[var(--rule)] font-mono text-[10px] tracking-[0.12em] uppercase hover:border-[var(--ink)] cursor-pointer"
                          >
                            Swap to indoor →
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleComplete(act.id)}
                        aria-label={`Mark ${act.title} complete`}
                        className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 transition-transform duration-300 cursor-pointer ${
                          act.completed
                            ? "bg-[var(--lime)] border-[var(--ink)] scale-105"
                            : "bg-white border-[var(--rule)] hover:border-[var(--ink)]"
                        }`}
                      >
                        {act.completed && (
                          <Check className="w-4 h-4 text-[var(--ink)]" />
                        )}
                      </button>
                    </PaperCard>

                    {/* Back (indoor alternative) */}
                    {act.indoorAlternative && (
                      <PaperCard
                        className="absolute inset-0 flex flex-col justify-between bg-[var(--ink)] text-white border-none [backface-visibility:hidden]"
                      >
                        <div
                          className="h-full flex flex-col justify-between"
                          style={{ transform: "rotateY(180deg)" }}
                        >
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
                              setFlippedIds((prev) => ({
                                ...prev,
                                [act.id]: false,
                              }))
                            }
                            className="self-start inline-flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.12em] uppercase text-[var(--lime)] cursor-pointer"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                            Back to original
                          </button>
                        </div>
                      </PaperCard>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Side column (4 columns) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <AiCard
              title="Why this plan"
              summary="Afternoon winds rise to 12 km/h between 15:00 and 16:30 IST, creating the cleanest dispersion window for ventilation and errands."
              dataLimitations="Uses Open-Meteo hourly dispersion forecast paired with CPCB Rabindra Bharati morning baseline."
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
              <form
                onSubmit={handleAddActivity}
                className="mt-4 flex flex-col gap-3"
              >
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
