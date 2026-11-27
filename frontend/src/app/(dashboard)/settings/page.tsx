"use client";

import React, { useState } from "react";
import { PageHero } from "@/components/layout/PageHero";
import { Panel } from "@/components/layout/Panel";
import { Chip, FeatureList, PaperCard } from "@/components/ui-aeriq";
import { MOCK_LOCATIONS, MOCK_USER } from "@/mocks/data";

const SECTIONS = [
  { id: "profile", label: "Profile" },
  { id: "locations", label: "Saved locations" },
  { id: "lifestyle", label: "Lifestyle & routine" },
  { id: "notifications", label: "Notifications" },
  { id: "units", label: "Units & language" },
  { id: "privacy", label: "Data & privacy" },
  { id: "account", label: "Account" },
];

export default function SettingsPage() {
  const [name, setName] = useState(MOCK_USER.fullName);
  const [notifs, setNotifs] = useState({
    morningSummary: true,
    aqiCategoryChange: true,
    planChanged: false,
  });
  const [tempUnit, setTempUnit] = useState<"C" | "F">("C");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTyped, setDeleteTyped] = useState("");

  return (
    <div>
      <PageHero
        chip="Settings"
        title="Your AERIQ"
        height="30vh"
        crop="50% 45%"
        hud={[
          `ACCOUNT ${MOCK_USER.email.toUpperCase()}`,
          `MEMBER SINCE ${MOCK_USER.memberSince.toUpperCase()}`,
          `LOCATIONS ${MOCK_LOCATIONS.length}`,
        ]}
      />

      <Panel>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sticky left FeatureList nav */}
          <aside className="lg:col-span-4">
            <div className="lg:sticky lg:top-24">
              <PaperCard>
                <FeatureList
                  items={SECTIONS.map((s, i) => ({
                    index: String(i + 1).padStart(2, "0"),
                    label: s.label,
                    href: `#${s.id}`,
                  }))}
                />
              </PaperCard>
            </div>
          </aside>

          {/* Right sections */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <PaperCard>
              <div id="profile" className="scroll-mt-24 flex flex-col gap-4">
                <Chip>01 · Profile</Chip>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="mono text-[var(--muted2)] block mb-1">
                      Full name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full h-11 px-3 rounded-[8px] bg-white border border-[var(--rule)] text-[14px]"
                    />
                  </div>
                  <div>
                    <label className="mono text-[var(--muted2)] block mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={MOCK_USER.email}
                      disabled
                      className="w-full h-11 px-3 rounded-[8px] bg-[var(--mist)] border border-[var(--rule)] text-[14px] opacity-75"
                    />
                  </div>
                </div>
              </div>
            </PaperCard>

            <PaperCard>
              <div id="locations" className="scroll-mt-24 flex flex-col gap-3">
                <Chip>02 · Saved locations</Chip>
                {MOCK_LOCATIONS.map((loc) => (
                  <div
                    key={loc.id}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-[8px] bg-white border border-[var(--rule)]"
                  >
                    <div>
                      <span className="font-medium text-[14px]">
                        {loc.city} · {loc.area}
                      </span>
                      <p className="font-mono text-[10px] text-[var(--muted2)]">
                        {loc.provider} · {loc.station}
                      </p>
                    </div>
                    {loc.isDefault && <Chip>Default</Chip>}
                  </div>
                ))}
              </div>
            </PaperCard>

            <PaperCard>
              <div id="lifestyle" className="scroll-mt-24 flex flex-col gap-3">
                <Chip>03 · Lifestyle & routine</Chip>
                <p className="text-[14px] text-[var(--muted)]">
                  Current profile: <strong>{MOCK_USER.lifestyle}</strong> ·
                  Transport: <strong>{MOCK_USER.transport.join(", ")}</strong>
                </p>
              </div>
            </PaperCard>

            <PaperCard>
              <div
                id="notifications"
                className="scroll-mt-24 flex flex-col gap-3"
              >
                <Chip>04 · Notifications</Chip>
                {[
                  {
                    key: "morningSummary",
                    label: "Daily morning summary",
                  },
                  {
                    key: "aqiCategoryChange",
                    label: "AQI category change alerts",
                  },
                  { key: "planChanged", label: "Plan-changed alerts" },
                ].map((item) => {
                  const val = notifs[item.key as keyof typeof notifs];
                  return (
                    <div
                      key={item.key}
                      className="flex items-center justify-between py-2 border-b border-[var(--rule)] last:border-b-0"
                    >
                      <span className="text-[14px]">{item.label}</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={val}
                        onClick={() =>
                          setNotifs((prev) => ({
                            ...prev,
                            [item.key]: !prev[item.key as keyof typeof prev],
                          }))
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
            </PaperCard>

            <PaperCard>
              <div id="units" className="scroll-mt-24 flex flex-col gap-3">
                <Chip>05 · Units & language</Chip>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px]">Temperature:</span>
                    {(["C", "F"] as const).map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setTempUnit(u)}
                        className={`px-2.5 py-1 rounded-[4px] font-mono text-[11px] cursor-pointer ${
                          tempUnit === u
                            ? "bg-[var(--lime)] text-[var(--ink)]"
                            : "bg-white border border-[var(--rule)]"
                        }`}
                      >
                        °{u}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Chip>English</Chip>
                    <Chip variant="ghost">More Indian languages soon</Chip>
                  </div>
                </div>
              </div>
            </PaperCard>

            <PaperCard>
              <div id="privacy" className="scroll-mt-24 flex flex-col gap-3">
                <Chip>06 · Data & privacy</Chip>
                <p className="text-[14px] text-[var(--muted)]">
                  AERIQ stores your saved locations, lifestyle preferences, and
                  household age groups. We never store health records.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="px-3.5 py-2 rounded-[6px] bg-white border border-[var(--rule)] font-mono text-[10.5px] uppercase cursor-pointer hover:border-[var(--ink)]"
                  >
                    Export my data
                  </button>
                  <button
                    type="button"
                    className="px-3.5 py-2 rounded-[6px] bg-white border border-[var(--rule)] font-mono text-[10.5px] uppercase cursor-pointer hover:border-[var(--ink)]"
                  >
                    Delete community reports
                  </button>
                </div>
              </div>
            </PaperCard>

            <PaperCard>
              <div id="account" className="scroll-mt-24 flex flex-col gap-3">
                <Chip>07 · Account</Chip>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmOpen(true)}
                    className="px-4 py-2 rounded-[8px] border border-[var(--aqi-verypoor)] text-[var(--aqi-verypoor)] font-mono text-[11px] uppercase cursor-pointer hover:bg-[var(--aqi-verypoor)] hover:text-white transition-colors"
                  >
                    Delete account
                  </button>
                </div>

                {deleteConfirmOpen && (
                  <div className="mt-3 p-4 rounded-[10px] bg-white border border-[var(--aqi-verypoor)] flex flex-col gap-3">
                    <p className="text-[13.5px]">
                      Type <strong>DELETE</strong> to confirm permanent account
                      removal.
                    </p>
                    <input
                      type="text"
                      value={deleteTyped}
                      onChange={(e) => setDeleteTyped(e.target.value)}
                      placeholder="DELETE"
                      className="h-10 px-3 rounded-[6px] border border-[var(--rule)] font-mono text-[12px]"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={deleteTyped !== "DELETE"}
                        className="px-4 py-2 rounded-[6px] bg-[var(--aqi-verypoor)] text-white font-mono text-[10.5px] uppercase disabled:opacity-40 cursor-pointer"
                      >
                        Confirm delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmOpen(false)}
                        className="px-4 py-2 rounded-[6px] bg-[var(--paper)] font-mono text-[10.5px] uppercase cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </PaperCard>
          </div>
        </div>
      </Panel>
    </div>
  );
}
