"use client";

import React, { useState } from "react";
import { Plus, X } from "lucide-react";
import { PageHero } from "@/components/layout/PageHero";
import { Panel, SectionHeader } from "@/components/layout/Panel";
import { Chip, TiltCard } from "@/components/ui-aeriq";
import { ASSETS } from "@/lib/assets";
import { MOCK_AQI_CURRENT, MOCK_FAMILY } from "@/mocks/data";
import { familyMemberSchema } from "@/schemas";
import type { FamilyMember } from "@/types";

const CROPS = [
  { img: ASSETS.sensorMast, pos: "22% 70%" },
  { img: ASSETS.islandClouds, pos: "50% 50%" },
  { img: ASSETS.sensorMast, pos: "62% 30%" },
];

export default function FamilyPage() {
  const [members, setMembers] = useState<FamilyMember[]>(MOCK_FAMILY);
  const [sheetOpen, setSheetOpen] = useState(false);

  const [name, setName] = useState("");
  const [ageGroup, setAgeGroup] = useState<FamilyMember["ageGroup"]>("Adult");
  const [lifestyle, setLifestyle] = useState("Working professional");
  const [error, setError] = useState<string | null>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const res = familyMemberSchema.safeParse({
      name,
      ageGroup,
      lifestyle,
      activities: [],
    });
    if (!res.success) {
      setError(res.error.issues[0]?.message ?? "Check inputs");
      return;
    }
    setError(null);
    const initials = name
      .trim()
      .split(/\s+/)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 2);

    setMembers((prev) => [
      ...prev,
      {
        id: `fam-${Date.now()}`,
        name: name.trim(),
        initials: initials || "FM",
        ageGroup,
        lifestyle,
        transport: "Metro",
        topRecommendation:
          "Prefer indoor activities during morning peak hours; ventilate mid-afternoon.",
        cropIndex: prev.length % 3,
      },
    ]);
    setName("");
    setSheetOpen(false);
  };

  return (
    <div>
      <PageHero
        chip="Household"
        title="Guidance for everyone at home"
        crop="70% 40%"
        hud={[
          `MEMBERS ${members.length}`,
          `LOCATION ${MOCK_AQI_CURRENT.location.city.toUpperCase()}`,
          `AQI ${MOCK_AQI_CURRENT.aqi} ${MOCK_AQI_CURRENT.category.toUpperCase()}`,
        ]}
      />

      <Panel>
        <SectionHeader
          chip="Members"
          title="Household profiles"
          description="Age group and daily routines help AERIQ tailor timing and indoor swaps for each person."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-[14px]">
          {members.map((m) => {
            const crop = CROPS[m.cropIndex % CROPS.length];
            return (
              <TiltCard
                key={m.id}
                image={crop.img}
                bgPosition={crop.pos}
                bgSize="220%"
                label={`[${m.ageGroup}]`}
                title={m.name}
                body={m.topRecommendation}
                height={360}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-14 h-14 rounded-full bg-[var(--ink)] text-[var(--lime)] font-mono text-[16px] font-medium inline-flex items-center justify-center border border-white/25">
                    {m.initials}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <Chip>{m.lifestyle}</Chip>
                    <Chip variant="ink">{m.transport}</Chip>
                  </div>
                </div>
              </TiltCard>
            );
          })}

          {/* Add family member card */}
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
      </Panel>

      {/* Right-side sheet */}
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
                    placeholder="e.g., Priya Sen"
                    className="h-11 px-3.5 rounded-[8px] bg-[var(--paper)] border border-[var(--rule)] text-[14px]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="mono text-[var(--ink2)]">Age group</label>
                  <select
                    value={ageGroup}
                    onChange={(e) =>
                      setAgeGroup(e.target.value as FamilyMember["ageGroup"])
                    }
                    className="h-11 px-3.5 rounded-[8px] bg-[var(--paper)] border border-[var(--rule)] text-[14px]"
                  >
                    <option value="Child">Child</option>
                    <option value="Teen">Teen</option>
                    <option value="Adult">Adult</option>
                    <option value="Older adult">Older adult</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="mono text-[var(--ink2)]">Lifestyle</label>
                  <select
                    value={lifestyle}
                    onChange={(e) => setLifestyle(e.target.value)}
                    className="h-11 px-3.5 rounded-[8px] bg-[var(--paper)] border border-[var(--rule)] text-[14px]"
                  >
                    <option>Student</option>
                    <option>Working professional</option>
                    <option>Homemaker</option>
                    <option>Retired</option>
                    <option>Other</option>
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
