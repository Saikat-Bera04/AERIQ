"use client";

import React, { useState } from "react";
import { Check } from "lucide-react";
import { PageHero } from "@/components/layout/PageHero";
import { Panel } from "@/components/layout/Panel";
import { Chip, GlassCard, PaperCard } from "@/components/ui-aeriq";
import { formatIST } from "@/lib/format";
import {
  MOCK_AQI_CURRENT,
  MOCK_FAMILY,
  MOCK_INDOOR_RECS,
} from "@/mocks/data";

export default function IndoorAirPage() {
  const [profile, setProfile] = useState({
    gasOrWoodCooking: true,
    incenseOrCoils: false,
    smokingIndoors: false,
    pets: false,
    constructionNearby: true,
    hasPurifier: true,
    roomSizeM2: 24,
  });
  const [savedFlash, setSavedFlash] = useState(false);
  const [recs, setRecs] = useState(MOCK_INDOOR_RECS);
  const [expandedId, setExpandedId] = useState<string | null>("ind-1");
  const [activeMember, setActiveMember] = useState<string | null>(null);

  const toggleField = (key: keyof typeof profile) => {
    setProfile((prev) => ({ ...prev, [key]: !prev[key] }));
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1400);
  };

  return (
    <div>
      <PageHero
        chip="Indoor air coach"
        title="Cleaner air inside, too"
        crop="40% 35%"
        hud={[
          `OUTDOOR AQI ${MOCK_AQI_CURRENT.aqi}`,
          `WIND ${MOCK_AQI_CURRENT.weather.windKmh} KM/H ${MOCK_AQI_CURRENT.weather.windDir}`,
          `UPDATED ${formatIST(MOCK_AQI_CURRENT.observedAt)}`,
        ]}
      >
        <GlassCard
          variant="dark"
          className="hidden md:block absolute left-[126px] top-[20vh] w-[300px] p-5 z-20"
        >
          <span className="mono text-white/75">Windows</span>
          <div className="text-[26px] font-medium tracking-[-0.03em] leading-[1.1] mt-2">
            Keep closed until 3 PM
          </div>
          <div className="mt-4 h-2.5 rounded-full bg-white/15 overflow-hidden flex">
            <div className="w-1/2 bg-[var(--aqi-poor)]" />
            <div className="w-1/4 bg-[var(--aqi-moderate)]" />
            <div className="w-1/4 bg-[var(--aqi-poor)]" />
          </div>
          <p className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-white/75 mt-2">
            Next clean window · 15:00 – 16:30 IST
          </p>
        </GlassCard>
      </PageHero>

      <Panel>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Your home (5 columns) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <PaperCard>
              <div className="flex items-center justify-between mb-4">
                <Chip>Your home</Chip>
                {savedFlash && (
                  <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--leaf)]">
                    SAVED
                  </span>
                )}
              </div>

              <div className="flex flex-col divide-y divide-[rgba(16,41,26,0.12)]">
                {[
                  { key: "gasOrWoodCooking", label: "Gas or wood cooking" },
                  { key: "incenseOrCoils", label: "Incense or mosquito coils" },
                  { key: "smokingIndoors", label: "Smoking indoors" },
                  { key: "pets", label: "Pets" },
                  { key: "constructionNearby", label: "Construction nearby" },
                  { key: "hasPurifier", label: "Air purifier" },
                ].map((row, idx) => {
                  const val = Boolean(profile[row.key as keyof typeof profile]);
                  return (
                    <div
                      key={row.key}
                      className="flex items-center justify-between py-3 font-mono text-[11px] tracking-[0.1em] uppercase"
                    >
                      <span className="flex items-center gap-3">
                        <span className="opacity-60">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <span>{row.label}</span>
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={val}
                        onClick={() =>
                          toggleField(row.key as keyof typeof profile)
                        }
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${
                          val ? "bg-[var(--lime)]" : "bg-[var(--rule)]"
                        }`}
                      >
                        <span
                          className={`block w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                            val ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>

              {profile.hasPurifier && (
                <div className="mt-4 pt-3 border-t border-[var(--rule)] flex items-center justify-between">
                  <label className="mono text-[var(--muted2)]">
                    Room size (m²)
                  </label>
                  <input
                    type="number"
                    value={profile.roomSizeM2}
                    onChange={(e) =>
                      setProfile((p) => ({
                        ...p,
                        roomSizeM2: Number(e.target.value) || 20,
                      }))
                    }
                    className="w-20 h-9 px-2.5 rounded-[6px] bg-white border border-[var(--rule)] font-mono text-[12px] text-right"
                  />
                </div>
              )}
            </PaperCard>

            {/* Purifier guidance */}
            <PaperCard>
              <Chip>HEPA guidance</Chip>
              <p className="text-[14px] leading-[1.5] text-[var(--ink)] mt-3">
                For a {profile.roomSizeM2} m² room during Poor outdoor AQI, keep
                doors closed and run your HEPA unit continuously at medium fan
                speed.
              </p>
              <p className="font-mono text-[10px] tracking-[0.1em] uppercase text-[var(--muted2)] mt-3">
                General guidance — check the purifier&apos;s rated coverage.
              </p>
            </PaperCard>
          </div>

          {/* Recommendations (7 columns) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <PaperCard>
              <Chip>Indoor air recommendations</Chip>
              <div className="mt-4 flex flex-col divide-y divide-[rgba(16,41,26,0.12)]">
                {recs.map((rec, i) => {
                  const open = expandedId === rec.id;
                  return (
                    <div key={rec.id} className="py-3">
                      <div className="flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => setExpandedId(open ? null : rec.id)}
                          className="flex-1 text-left grid grid-cols-[28px_auto_1fr] items-center gap-2 font-mono text-[11px] tracking-[0.1em] uppercase cursor-pointer hover:text-[var(--leaf)]"
                        >
                          <span className="opacity-60">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <Chip variant="ghost">{rec.group}</Chip>
                          <span
                            className={`truncate ${
                              rec.done ? "line-through opacity-55" : ""
                            }`}
                          >
                            {rec.title}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setRecs((prev) =>
                              prev.map((r) =>
                                r.id === rec.id ? { ...r, done: !r.done } : r
                              )
                            )
                          }
                          aria-label="Mark as done"
                          className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 cursor-pointer ${
                            rec.done
                              ? "bg-[var(--lime)] border-[var(--ink)]"
                              : "bg-white border-[var(--rule)]"
                          }`}
                        >
                          {rec.done && <Check className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      {open && (
                        <p className="mt-2.5 pl-9 text-[14px] leading-[1.5] text-[var(--muted)]">
                          {rec.detail}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </PaperCard>

            {/* Family-aware tips */}
            <PaperCard>
              <Chip>Family-aware tips</Chip>
              <div className="flex flex-wrap gap-2 mt-3">
                {MOCK_FAMILY.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() =>
                      setActiveMember(activeMember === m.id ? null : m.id)
                    }
                    className={`px-3 py-1.5 rounded-[4px] font-mono text-[10.5px] uppercase tracking-[0.12em] cursor-pointer border ${
                      activeMember === m.id
                        ? "bg-[var(--lime)] text-[var(--ink)] border-[var(--ink)]"
                        : "bg-white border-[var(--rule)]"
                    }`}
                  >
                    {m.name} ({m.ageGroup})
                  </button>
                ))}
              </div>
              {activeMember && (
                <p className="mt-3 text-[14px] text-[var(--ink)] bg-white p-3 rounded-[8px] border border-[var(--rule)]">
                  {
                    MOCK_FAMILY.find((m) => m.id === activeMember)
                      ?.topRecommendation
                  }
                </p>
              )}
            </PaperCard>
          </div>
        </div>
      </Panel>
    </div>
  );
}
