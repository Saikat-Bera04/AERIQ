"use client";

import React, { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Bike, Bus, Car, Footprints, Train } from "lucide-react";
import { PageHero } from "@/components/layout/PageHero";
import { Panel, SectionHeader } from "@/components/layout/Panel";
import {
  Chip,
  CountUp,
  EmptyState,
  GlassCard,
  PaperCard,
} from "@/components/ui-aeriq";
import { ASSETS } from "@/lib/assets";
import { MOCK_SIMULATOR_ASSUMPTIONS } from "@/mocks/data";

const MODES = [
  { id: "car", label: "Private car", factor: 0.184, icon: Car },
  { id: "two_wheeler", label: "Two-wheeler", factor: 0.082, icon: Bike },
  { id: "auto", label: "Auto-rickshaw", factor: 0.095, icon: Car },
  { id: "bus", label: "City bus", factor: 0.062, icon: Bus },
  { id: "metro", label: "Metro", factor: 0.029, icon: Train },
  { id: "cycling", label: "Cycling", factor: 0, icon: Bike },
  { id: "walking", label: "Walking", factor: 0, icon: Footprints },
] as const;

export default function SimulatorPage() {
  const [tab, setTab] = useState<"emissions" | "exposure">("emissions");
  const [distanceKm, setDistanceKm] = useState(10);
  const [tripsPerWeek, setTripsPerWeek] = useState(10);
  const [baselineMode, setBaselineMode] = useState<string>("car");
  const [alternatives, setAlternatives] = useState<string[]>([
    "bus",
    "metro",
    "walking",
  ]);
  const [savedToast, setSavedToast] = useState(false);

  const toggleAlt = (id: string) => {
    setAlternatives((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const results = useMemo(() => {
    const picked = [baselineMode, ...alternatives.filter((a) => a !== baselineMode)];
    return picked.map((modeId) => {
      const m = MODES.find((x) => x.id === modeId) ?? MODES[0];
      const weekly = Number((distanceKm * m.factor * tripsPerWeek).toFixed(2));
      return {
        mode: m.id,
        label: m.label,
        factor: m.factor,
        weeklyKgCo2e: weekly,
        yearlyKgCo2e: Number((weekly * 52).toFixed(1)),
        isBaseline: m.id === baselineMode,
        isZeroTailpipe: m.factor === 0,
      };
    });
  }, [distanceKm, tripsPerWeek, baselineMode, alternatives]);

  const baselineResult = results[0];
  const bestAlt =
    results
      .filter((r) => !r.isBaseline)
      .sort((a, b) => a.weeklyKgCo2e - b.weeklyKgCo2e)[0] ?? baselineResult;

  const avoidedWeekly = Math.max(
    0,
    Number((baselineResult.weeklyKgCo2e - bestAlt.weeklyKgCo2e).toFixed(1))
  );
  const avoidedYearly = Number((avoidedWeekly * 52).toFixed(0));

  return (
    <div>
      <PageHero
        chip="Impact simulator"
        title="What if you switched?"
        crop="60% 50%"
        rock
        hud={[
          "MODEL EMISSION FACTORS",
          "VERSION v2.1 (2024)",
          "GEOGRAPHY URBAN INDIA",
        ]}
      />

      <Panel>
        <SectionHeader
          chip="Compare modes"
          title="Commute & exposure"
          rightSlot={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTab("emissions")}
                className={`px-3 py-1.5 rounded-[4px] font-mono text-[10.5px] tracking-[0.14em] uppercase cursor-pointer ${
                  tab === "emissions"
                    ? "bg-[var(--lime)] text-[var(--ink)]"
                    : "bg-[var(--paper)] border border-[var(--rule)] text-[var(--muted)]"
                }`}
              >
                Transport emissions
              </button>
              <button
                type="button"
                onClick={() => setTab("exposure")}
                className={`px-3 py-1.5 rounded-[4px] font-mono text-[10.5px] tracking-[0.14em] uppercase cursor-pointer ${
                  tab === "exposure"
                    ? "bg-[var(--lime)] text-[var(--ink)]"
                    : "bg-[var(--paper)] border border-[var(--rule)] text-[var(--muted)]"
                }`}
              >
                Exposure indicator
              </button>
            </div>
          }
        />

        {tab === "emissions" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Inputs (4 columns) */}
            <div className="lg:col-span-4">
              <PaperCard className="flex flex-col gap-5">
                <div>
                  <div className="flex justify-between mb-1.5">
                    <label className="mono text-[var(--ink2)]">
                      Distance per trip (km)
                    </label>
                    <span className="font-mono text-[12px] font-medium">
                      {distanceKm} km
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={60}
                    value={distanceKm}
                    onChange={(e) => setDistanceKm(Number(e.target.value))}
                    className="w-full accent-[var(--ink)]"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1.5">
                    <label className="mono text-[var(--ink2)]">
                      Trips per week
                    </label>
                    <span className="font-mono text-[12px] font-medium">
                      {tripsPerWeek}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={20}
                    value={tripsPerWeek}
                    onChange={(e) => setTripsPerWeek(Number(e.target.value))}
                    className="w-full accent-[var(--ink)]"
                  />
                </div>

                <div>
                  <span className="mono text-[var(--ink2)] block mb-2">
                    Baseline mode
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {MODES.map((m) => {
                      const Icon = m.icon;
                      const active = baselineMode === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setBaselineMode(m.id)}
                          className={`flex items-center gap-2 px-2.5 py-2 rounded-[6px] text-[12px] border cursor-pointer ${
                            active
                              ? "bg-[var(--ink)] text-[var(--lime)] border-[var(--ink)]"
                              : "bg-white border-[var(--rule)]"
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <span className="mono text-[var(--ink2)] block mb-2">
                    Compare up to 3 alternatives
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {MODES.filter((m) => m.id !== baselineMode).map((m) => {
                      const active = alternatives.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => toggleAlt(m.id)}
                          className={`px-2.5 py-1 rounded-[4px] font-mono text-[10px] uppercase cursor-pointer border ${
                            active
                              ? "bg-[var(--lime)] text-[var(--ink)] border-[var(--ink)]"
                              : "bg-white border-[var(--rule)]"
                          }`}
                        >
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSavedToast(true);
                    setTimeout(() => setSavedToast(false), 2500);
                  }}
                  className="h-11 rounded-[8px] bg-[var(--ink)] text-[var(--lime)] font-mono text-[11px] tracking-[0.14em] uppercase cursor-pointer"
                >
                  Save scenario
                </button>
                {savedToast && (
                  <p className="font-mono text-[10.5px] text-[var(--leaf)]">
                    Scenario saved to dashboard impact history.
                  </p>
                )}
              </PaperCard>
            </div>

            {/* Results (8 columns) */}
            <div className="lg:col-span-8 flex flex-col gap-5">
              {/* Big dark-glass result card over cropped asset 5 */}
              <div className="relative h-[300px] rounded-[12px] overflow-hidden bg-[#1b3122]">
                <div
                  className="absolute inset-0 bg-cover"
                  style={{
                    backgroundImage: `url("${ASSETS.sensorMast}")`,
                    backgroundPosition: "62% 30%",
                  }}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(10,25,15,0.45), rgba(10,25,15,0.82))",
                  }}
                />
                <GlassCard
                  variant="dark"
                  className="relative z-10 h-full p-6 md:p-8 flex flex-col justify-between border-none bg-transparent backdrop-blur-none"
                >
                  <div className="flex items-center justify-between">
                    <span className="mono text-white/80">
                      Estimated avoided emissions
                    </span>
                    <Chip>{avoidedYearly} kg CO₂e / year</Chip>
                  </div>
                  <div>
                    <div className="text-[48px] md:text-[60px] font-medium tracking-[-0.04em] leading-none">
                      <CountUp value={avoidedWeekly} decimals={1} />{" "}
                      <span className="font-mono text-[13px] tracking-[0.12em] uppercase opacity-80">
                        kg CO₂e / week
                      </span>
                    </div>
                    <p className="text-[14px] text-white/80 mt-2">
                      Switching from {baselineResult.label} to {bestAlt.label}
                    </p>
                  </div>
                </GlassCard>
              </div>

              {/* Horizontal Recharts bar chart */}
              <PaperCard>
                <Chip>Weekly kg CO₂e by mode</Chip>
                <div className="h-[220px] mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={results}
                      margin={{ top: 4, right: 24, left: 20, bottom: 4 }}
                    >
                      <XAxis
                        type="number"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#6a7a6f", fontSize: 10, fontFamily: "var(--mono)" }}
                      />
                      <YAxis
                        type="category"
                        dataKey="label"
                        axisLine={false}
                        tickLine={false}
                        width={110}
                        tick={{ fill: "#10291a", fontSize: 11, fontFamily: "var(--mono)" }}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(16,41,26,0.04)" }}
                        formatter={(val) => [`${val} kg CO₂e/wk`, "Emissions"]}
                      />
                      <Bar dataKey="weeklyKgCo2e" radius={[0, 6, 6, 0]} animationDuration={900}>
                        {results.map((entry) => (
                          <Cell
                            key={entry.mode}
                            fill={entry.isBaseline ? "#10291a" : "#c6f35c"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </PaperCard>

              {/* Formula strip */}
              <PaperCard className="font-mono text-[11.5px] tracking-[0.06em] text-[var(--ink)]">
                <span className="text-[var(--muted2)]">FORMULA: </span>
                E = distance × emission factor × trips ={" "}
                <strong>
                  {distanceKm} km × {baselineResult.factor} kg/km × {tripsPerWeek}{" "}
                  = {baselineResult.weeklyKgCo2e} kg CO₂e/week
                </strong>
              </PaperCard>
            </div>

            {/* Assumptions table (12 columns, always visible) */}
            <div className="lg:col-span-12">
              <PaperCard>
                <Chip>Assumptions</Chip>
                <div className="overflow-x-auto mt-4">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--rule)] font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--muted2)]">
                        <th className="py-2.5 pr-4">Mode</th>
                        <th className="py-2.5 pr-4">Factor (kg CO₂e/pkm)</th>
                        <th className="py-2.5 pr-4">Source</th>
                        <th className="py-2.5 pr-4">Publication / Version</th>
                        <th className="py-2.5 pr-4">Geography</th>
                        <th className="py-2.5">Occupancy</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--rule)] text-[13.5px]">
                      {MOCK_SIMULATOR_ASSUMPTIONS.map((row) => (
                        <tr key={row.mode}>
                          <td className="py-2.5 pr-4 font-medium">{row.mode}</td>
                          <td className="py-2.5 pr-4 font-mono text-[12px]">
                            {row.factorKgPerKm}
                          </td>
                          <td className="py-2.5 pr-4">{row.source}</td>
                          <td className="py-2.5 pr-4">{row.version}</td>
                          <td className="py-2.5 pr-4">{row.geography}</td>
                          <td className="py-2.5">{row.occupancy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="font-mono text-[10px] tracking-[0.1em] uppercase text-[var(--muted2)] mt-4">
                  Estimates only. Real emissions vary with vehicle, load and
                  route.
                </p>
              </PaperCard>
            </div>
          </div>
        ) : (
          <PaperCard>
            <EmptyState
              title="Not enough route-level concentration data for this area yet."
              description="Exposure indicators require street-level corridor measurements. Check back as more stations come online."
            />
          </PaperCard>
        )}
      </Panel>
    </div>
  );
}
