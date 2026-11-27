"use client";

import React, { useEffect, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { PageHero } from "@/components/layout/PageHero";
import { Panel, SectionHeader } from "@/components/layout/Panel";
import { Chip, SkeletonBlock, TiltCard } from "@/components/ui-aeriq";
import { ASSETS } from "@/lib/assets";
import { api } from "@/lib/api";
import { useLiveLocation } from "@/hooks/useLiveLocation";

interface ApiFamilyMember {
  id: string;
  name: string;
  ageGroup: "child" | "teen" | "adult" | "older_adult";
  lifestyle: "student" | "professional" | "homemaker" | "retired" | "other";
}

const CROPS = [
  { img: ASSETS.sensorMast, pos: "22% 70%" },
  { img: ASSETS.islandClouds, pos: "50% 50%" },
  { img: ASSETS.sensorMast, pos: "62% 30%" },
];

export default function FamilyPage() {
  const { location: liveLoc } = useLiveLocation();
  const [members, setMembers] = useState<ApiFamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);

  const [name, setName] = useState("");
  const [ageGroup, setAgeGroup] = useState<ApiFamilyMember["ageGroup"]>("adult");
  const [lifestyle, setLifestyle] = useState<ApiFamilyMember["lifestyle"]>("professional");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<ApiFamilyMember[]>("/api/v1/family")
      .then((res) => setMembers(res.data))
      .finally(() => setLoading(false));
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Enter a name");
      return;
    }
    setError(null);
    try {
      const { data } = await api.post<ApiFamilyMember>("/api/v1/family", {
        name: name.trim(),
        ageGroup,
        lifestyle,
        activities: [],
      });
      setMembers((prev) => [...prev, data]);
      setName("");
      setSheetOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save member");
    }
  };

  const handleRemove = async (id: string) => {
    await api.delete(`/api/v1/family/${id}`);
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <div>
      <PageHero
        chip="Household"
        title="Guidance for everyone at home"
        crop="70% 40%"
        hud={[
          `MEMBERS ${members.length}`,
          `LOCATION ${(liveLoc?.city ?? "YOUR CITY").toUpperCase()}`,
          `AQI ${liveLoc?.aqi ?? "N/A"} ${(liveLoc?.category ?? "").toUpperCase()}`,
        ]}
      />

      <Panel>
        <SectionHeader
          chip="Members"
          title="Household profiles"
          description="Age group and daily routines help AERIQ tailor timing and indoor swaps for each person."
        />

        {loading ? (
          <SkeletonBlock height="h-[360px]" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-[14px]">
            {members.map((m, idx) => {
              const crop = CROPS[idx % CROPS.length];
              const initials = m.name
                .split(/\s+/)
                .map((s) => s[0]?.toUpperCase() ?? "")
                .join("")
                .slice(0, 2);
              return (
                <div key={m.id} className="relative">
                  <TiltCard
                    image={crop.img}
                    bgPosition={crop.pos}
                    bgSize="220%"
                    label={`[${m.ageGroup.replace("_", " ")}]`}
                    title={m.name}
                    body="Timed to cleaner outdoor windows and indoor ventilation."
                    height={360}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="w-14 h-14 rounded-full bg-[var(--ink)] text-[var(--lime)] font-mono text-[16px] font-medium inline-flex items-center justify-center border border-white/25">
                        {initials}
                      </span>
                      <Chip>{m.lifestyle}</Chip>
                    </div>
                  </TiltCard>
                  <button
                    type="button"
                    onClick={() => void handleRemove(m.id)}
                    aria-label={`Remove ${m.name}`}
                    className="absolute bottom-4 right-4 z-20 p-2 rounded-full bg-black/50 text-white hover:bg-[var(--aqi-verypoor)] cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}

            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="h-[360px] rounded-[12px] border-2 border-dashed border-[var(--rule)] bg-[var(--paper)] hover:border-[var(--ink)] transition-colors flex flex-col items-center justify-center gap-3 p-6 cursor-pointer"
            >
              <span className="w-12 h-12 rounded-full bg-[var(--lime)] text-[var(--ink)] inline-flex items-center justify-center">
                <Plus className="w-6 h-6" />
              </span>
              <span className="text-[18px] font-medium tracking-[-0.02em]">
                Add family member
              </span>
            </button>
          </div>
        )}
      </Panel>

      {sheetOpen && (
        <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex justify-end">
          <div
            className="w-full max-w-[440px] bg-white h-full rounded-l-[22px] p-8 flex flex-col justify-between overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-label="Add family member"
          >
            <div>
              <div className="flex items-center justify-between mb-6">
                <Chip>New member</Chip>
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  aria-label="Close"
                  className="w-9 h-9 rounded-full bg-[var(--ink)] text-white inline-flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <h3 className="text-[28px] font-medium tracking-[-0.03em] mb-6">
                Add to household
              </h3>

              <form onSubmit={handleAdd} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="mono text-[var(--ink2)]">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="First name"
                    className="h-11 px-3.5 rounded-[8px] bg-[var(--paper)] border border-[var(--rule)] text-[14px]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="mono text-[var(--ink2)]">Age group</label>
                  <select
                    value={ageGroup}
                    onChange={(e) =>
                      setAgeGroup(e.target.value as ApiFamilyMember["ageGroup"])
                    }
                    className="h-11 px-3.5 rounded-[8px] bg-[var(--paper)] border border-[var(--rule)] text-[14px]"
                  >
                    <option value="child">Child</option>
                    <option value="teen">Teen</option>
                    <option value="adult">Adult</option>
                    <option value="older_adult">Older adult</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="mono text-[var(--ink2)]">Lifestyle</label>
                  <select
                    value={lifestyle}
                    onChange={(e) =>
                      setLifestyle(e.target.value as ApiFamilyMember["lifestyle"])
                    }
                    className="h-11 px-3.5 rounded-[8px] bg-[var(--paper)] border border-[var(--rule)] text-[14px]"
                  >
                    <option value="student">Student</option>
                    <option value="professional">Working professional</option>
                    <option value="homemaker">Homemaker</option>
                    <option value="retired">Retired</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {error && (
                  <p className="font-mono text-[10.5px] text-[var(--aqi-verypoor)]">
                    {error}
                  </p>
                )}

                <p className="text-[12.5px] text-[var(--muted)] leading-[1.45] bg-[var(--paper)] p-3 rounded-[8px] border border-[var(--rule)]">
                  Age group helps AERIQ adjust activity timing. We don&apos;t
                  collect health records.
                </p>

                <button
                  type="submit"
                  className="mt-2 h-11 rounded-[8px] bg-[var(--ink)] text-[var(--lime)] font-mono text-[11px] tracking-[0.14em] uppercase cursor-pointer"
                >
                  Save member
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
