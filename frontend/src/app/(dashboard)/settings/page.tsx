"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { PageHero } from "@/components/layout/PageHero";
import { Panel } from "@/components/layout/Panel";
import { Chip, FeatureList, PaperCard } from "@/components/ui-aeriq";
import { api } from "@/lib/api";

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
  const router = useRouter();
  const [user, setUser] = useState<{
    name: string;
    email: string;
    createdAt: string;
  } | null>(null);
  const [profile, setProfile] = useState<{
    lifestyle: string;
    transportModes: string[];
  } | null>(null);
  const [locations, setLocations] = useState<
    { id: string; label: string; city: string; isDefault: boolean }[]
  >([]);
  const [notifs, setNotifs] = useState({
    dailySummary: true,
    categoryChangeAlerts: true,
    planChangedAlerts: false,
    quietStart: "22:00",
    quietEnd: "07:00",
  });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTyped, setDeleteTyped] = useState("");

  useEffect(() => {
    Promise.all([
      api.get<{
        user: { name: string; email: string; createdAt: string };
        profile: { lifestyle: string; transportModes: string[] } | null;
        locations: { id: string; label: string; city: string; isDefault: boolean }[];
      }>("/api/v1/me"),
      api.get<typeof notifs>("/api/v1/notifications"),
    ]).then(([meRes, notifRes]) => {
      setUser(meRes.data.user);
      setProfile(meRes.data.profile);
      setLocations(meRes.data.locations);
      setNotifs(notifRes.data);
    });
  }, []);

  const toggleNotif = async (
    key: "dailySummary" | "categoryChangeAlerts" | "planChangedAlerts"
  ) => {
    const next = { ...notifs, [key]: !notifs[key] };
    setNotifs(next);
    await api.put("/api/v1/notifications", next);
  };

  const handleDeleteLoc = async (id: string) => {
    await api.delete(`/api/v1/locations/${id}`);
    setLocations((prev) => prev.filter((l) => l.id !== id));
  };

  const handleExport = async () => {
    const { data } = await api.get("/api/v1/account/export");
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "aeriq-export.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteAccount = async () => {
    await api.delete("/api/v1/account", { confirm: "DELETE" });
    router.push("/login");
  };

  return (
    <div>
      <PageHero
        chip="Settings"
        title="Your AERIQ"
        height="30vh"
        crop="50% 45%"
        hud={[
          `ACCOUNT ${(user?.email ?? "LOADING").toUpperCase()}`,
          `LOCATIONS ${locations.length}`,
          "PRIVACY FIRST",
        ]}
      />

      <Panel>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
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
                      value={user?.name ?? ""}
                      readOnly
                      className="w-full h-11 px-3 rounded-[8px] bg-white border border-[var(--rule)] text-[14px]"
                    />
                  </div>
                  <div>
                    <label className="mono text-[var(--muted2)] block mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={user?.email ?? ""}
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
                {locations.length === 0 ? (
                  <p className="text-[13px] text-[var(--muted)]">
                    No saved locations yet.
                  </p>
                ) : (
                  locations.map((loc) => (
                    <div
                      key={loc.id}
                      className="flex items-center justify-between px-3.5 py-2.5 rounded-[8px] bg-white border border-[var(--rule)]"
                    >
                      <span className="font-medium text-[14px]">
                        {loc.city} · {loc.label}
                      </span>
                      <div className="flex items-center gap-2">
                        {loc.isDefault && <Chip>Default</Chip>}
                        <button
                          type="button"
                          onClick={() => void handleDeleteLoc(loc.id)}
                          aria-label={`Delete ${loc.city}`}
                          className="text-[var(--muted2)] hover:text-[var(--aqi-verypoor)] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </PaperCard>

            <PaperCard>
              <div id="lifestyle" className="scroll-mt-24 flex flex-col gap-3">
                <Chip>03 · Lifestyle & routine</Chip>
                <p className="text-[14px] text-[var(--muted)]">
                  Profile: <strong>{profile?.lifestyle ?? "—"}</strong> · Transport:{" "}
                  <strong>{profile?.transportModes.join(", ") || "—"}</strong>
                </p>
              </div>
            </PaperCard>

            <PaperCard>
              <div id="notifications" className="scroll-mt-24 flex flex-col gap-3">
                <Chip>04 · Notifications</Chip>
                {[
                  { key: "dailySummary" as const, label: "Daily morning summary" },
                  {
                    key: "categoryChangeAlerts" as const,
                    label: "AQI category change alerts",
                  },
                  { key: "planChangedAlerts" as const, label: "Plan-changed alerts" },
                ].map((item) => {
                  const val = notifs[item.key];
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
                        onClick={() => void toggleNotif(item.key)}
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
                <div className="flex flex-wrap items-center gap-2">
                  <Chip>Metric (°C, µg/m³)</Chip>
                  <Chip>English</Chip>
                  <Chip variant="ghost">More Indian languages soon</Chip>
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
                <button
                  type="button"
                  onClick={() => void handleExport()}
                  className="self-start px-3.5 py-2 rounded-[6px] bg-white border border-[var(--rule)] font-mono text-[10.5px] uppercase cursor-pointer hover:border-[var(--ink)]"
                >
                  Export my data
                </button>
              </div>
            </PaperCard>

            <PaperCard>
              <div id="account" className="scroll-mt-24 flex flex-col gap-3">
                <Chip>07 · Account</Chip>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="self-start px-4 py-2 rounded-[8px] border border-[var(--aqi-verypoor)] text-[var(--aqi-verypoor)] font-mono text-[11px] uppercase cursor-pointer hover:bg-[var(--aqi-verypoor)] hover:text-white transition-colors"
                >
                  Delete account
                </button>

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
                        onClick={() => void handleDeleteAccount()}
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
