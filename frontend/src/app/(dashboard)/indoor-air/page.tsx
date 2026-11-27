"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Check } from "lucide-react";
import { PageHero } from "@/components/layout/PageHero";
import { Panel } from "@/components/layout/Panel";
import { Chip, GlassCard, PaperCard, SkeletonBlock } from "@/components/ui-aeriq";
import { api } from "@/lib/api";
import { formatIST } from "@/lib/format";
import { useLiveLocation } from "@/hooks/useLiveLocation";

interface IndoorProfileDto {
  cookingFuel: "lpg" | "wood" | "electric" | "other";
  incense: boolean;
  indoorSmoking: boolean;
  pets: boolean;
  constructionNearby: boolean;
  hasPurifier: boolean;
  roomSizeM2: number | null;
}

interface IndoorRecDto {
  ventilation: { state: string; nextGoodWindow: string | null };
  matches: { group: string; key: string; title: string; body: string }[];
  purifier: {
    requiredCadrM3h: number;
    inputs: { roomSizeM2: number; ceilingHeightM: number; targetAirChanges: number };
    filtration: string;
    note: string;
  } | null;
}

export default function IndoorAirPage() {
  const { location: liveLoc } = useLiveLocation();
  const [profile, setProfile] = useState<IndoorProfileDto | null>(null);
  const [rec, setRec] = useState<IndoorRecDto | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [doneMap, setDoneMap] = useState<Record<string, boolean>>({});
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [profRes, recRes] = await Promise.all([
      api.get<IndoorProfileDto>("/api/v1/indoor/profile"),
      api.post<IndoorRecDto>("/api/v1/indoor/recommendations", {
        locationId: liveLoc?.id,
      }),
    ]);
    setProfile(profRes.data);
    setRec(recRes.data);
    if (recRes.data.matches[0]) setExpandedKey(recRes.data.matches[0].key);
  }, [liveLoc?.id]);

  useEffect(() => {
    const id = requestAnimationFrame(() => void loadData());
    return () => cancelAnimationFrame(id);
  }, [loadData]);

  const updateProfile = async (next: IndoorProfileDto) => {
    setProfile(next);
    await api.put("/api/v1/indoor/profile", next);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1400);
    const { data } = await api.post<IndoorRecDto>("/api/v1/indoor/recommendations", {
      locationId: liveLoc?.id,
    });
    setRec(data);
  };

  return (
    <div>
      <PageHero
        chip="Indoor air coach"
        title="Cleaner air inside, too"
        crop="40% 35%"
        hud={[
          `OUTDOOR AQI ${liveLoc?.aqi ?? "N/A"}`,
          `CITY ${(liveLoc?.city ?? "YOUR CITY").toUpperCase()}`,
          `UPDATED ${liveLoc ? formatIST(liveLoc.observedAt) : "--:-- IST"}`,
        ]}
      >
        <GlassCard
          variant="dark"
          className="hidden md:block absolute left-[126px] top-[20vh] w-[300px] p-5 z-20"
        >
          <span className="mono text-white/75">Windows</span>
          <div className="text-[24px] font-medium tracking-[-0.03em] leading-[1.15] mt-2">
            {rec?.ventilation.state ?? "Checking outdoor air…"}
          </div>
          {rec?.ventilation.nextGoodWindow && (
            <p className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-white/75 mt-3">
              Next clean window · {rec.ventilation.nextGoodWindow}
            </p>
          )}
        </GlassCard>
      </PageHero>

      <Panel>
        {!profile || !rec ? (
          <SkeletonBlock height="h-64" />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
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
                    {
                      key: "cookingFuel",
                      label: "Gas or wood cooking",
                      isFuel: true,
                    },
                    { key: "incense", label: "Incense or mosquito coils" },
                    { key: "indoorSmoking", label: "Smoking indoors" },
                    { key: "pets", label: "Pets" },
                    { key: "constructionNearby", label: "Construction nearby" },
                    { key: "hasPurifier", label: "Air purifier" },
                  ].map((row, idx) => {
                    const val = row.isFuel
                      ? profile.cookingFuel === "lpg" || profile.cookingFuel === "wood"
                      : Boolean(profile[row.key as keyof IndoorProfileDto]);
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
                          onClick={() => {
                            if (row.isFuel) {
                              void updateProfile({
                                ...profile,
                                cookingFuel: val ? "electric" : "lpg",
                              });
                            } else {
                              void updateProfile({
                                ...profile,
                                [row.key]: !val,
                              });
                            }
                          }}
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
                      value={profile.roomSizeM2 ?? 20}
                      onChange={(e) =>
                        void updateProfile({
                          ...profile,
                          roomSizeM2: Number(e.target.value) || 20,
                        })
                      }
                      className="w-20 h-9 px-2.5 rounded-[6px] bg-white border border-[var(--rule)] font-mono text-[12px] text-right"
                    />
                  </div>
                )}
              </PaperCard>

              {rec.purifier && (
                <PaperCard>
                  <Chip>HEPA guidance</Chip>
                  <div className="text-[28px] font-medium tracking-[-0.03em] mt-3 tabular-nums">
                    {rec.purifier.requiredCadrM3h} m³/h{" "}
                    <span className="mono text-[var(--muted2)]">CADR</span>
                  </div>
                  <p className="text-[13.5px] leading-[1.5] text-[var(--muted)] mt-2">
                    Calculated for a {rec.purifier.inputs.roomSizeM2} m² room (
                    {rec.purifier.inputs.ceilingHeightM} m ceiling ×{" "}
                    {rec.purifier.inputs.targetAirChanges} air changes/h). Use{" "}
                    {rec.purifier.filtration} filtration.
                  </p>
                  <p className="font-mono text-[10px] tracking-[0.1em] uppercase text-[var(--muted2)] mt-3">
                    {rec.purifier.note}
                  </p>
                </PaperCard>
              )}
            </div>

            <div className="lg:col-span-7 flex flex-col gap-4">
              <PaperCard>
                <Chip>Indoor air recommendations</Chip>
                <div className="mt-4 flex flex-col divide-y divide-[rgba(16,41,26,0.12)]">
                  {rec.matches.map((item, i) => {
                    const open = expandedKey === item.key;
                    const done = Boolean(doneMap[item.key]);
                    return (
                      <div key={item.key} className="py-3">
                        <div className="flex items-center justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => setExpandedKey(open ? null : item.key)}
                            className="flex-1 text-left grid grid-cols-[28px_auto_1fr] items-center gap-2 font-mono text-[11px] tracking-[0.1em] uppercase cursor-pointer hover:text-[var(--leaf)]"
                          >
                            <span className="opacity-60">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <Chip variant="ghost">{item.group}</Chip>
                            <span
                              className={`truncate ${
                                done ? "line-through opacity-55" : ""
                              }`}
                            >
                              {item.title}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDoneMap((prev) => ({
                                ...prev,
                                [item.key]: !done,
                              }))
                            }
                            aria-label="Mark as done"
                            className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 cursor-pointer ${
                              done
                                ? "bg-[var(--lime)] border-[var(--ink)]"
                                : "bg-white border-[var(--rule)]"
                            }`}
                          >
                            {done && <Check className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        {open && (
                          <p className="mt-2.5 pl-9 text-[14px] leading-[1.5] text-[var(--muted)]">
                            {item.body}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </PaperCard>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
