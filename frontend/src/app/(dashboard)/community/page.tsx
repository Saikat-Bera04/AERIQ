"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { Plus, X } from "lucide-react";
import {
  Chip,
  FeatureList,
  GlassCard,
  HudFrame,
  MaskedHeadline,
  SkeletonBlock,
} from "@/components/ui-aeriq";
import {
  MOCK_COMMUNITY_REPORTS,
  MOCK_OFFICIAL_STATIONS,
} from "@/mocks/data";
import { communityReportSchema } from "@/schemas";
import type { CommunityReport } from "@/types";
import { formatIST, formatRelativeTime } from "@/lib/format";

function RelativeTime({ iso }: { iso: string }) {
  const [text, setText] = React.useState(() => formatIST(iso));
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setText(formatRelativeTime(iso)));
    return () => cancelAnimationFrame(id);
  }, [iso]);
  return <>{text}</>;
}

const LeafletMap = dynamic(
  () => import("@/components/community/LeafletMap").then((m) => m.LeafletMap),
  { ssr: false, loading: () => <SkeletonBlock height="h-screen" /> }
);

const CATEGORIES = [
  "All",
  "Smoke",
  "Dust",
  "Burning waste",
  "Vehicle exhaust",
  "Industrial",
  "Other",
] as const;

export default function CommunityPage() {
  const [reports, setReports] = useState<CommunityReport[]>(
    MOCK_COMMUNITY_REPORTS
  );
  const [filterCat, setFilterCat] = useState<string>("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Report form
  const [cat, setCat] = useState<CommunityReport["category"]>("Smoke");
  const [desc, setDesc] = useState("");
  const [formErr, setFormErr] = useState<string | null>(null);

  const filtered =
    filterCat === "All"
      ? reports
      : reports.filter((r) => r.category === filterCat);

  const verifiedCount = reports.filter((r) => r.status === "Verified").length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = communityReportSchema.safeParse({
      category: cat,
      description: desc,
      lat: 22.5726,
      lng: 88.3639,
    });
    if (!res.success) {
      setFormErr(res.error.issues[0]?.message ?? "Check report details");
      return;
    }
    setFormErr(null);
    const created: CommunityReport = {
      id: `rep-${Date.now()}`,
      category: cat,
      description: desc.trim(),
      status: "Pending review",
      reportedAt: new Date().toISOString(),
      lat: 22.571 + (Math.random() - 0.5) * 0.015,
      lng: 88.364 + (Math.random() - 0.5) * 0.015,
      areaLabel: "Nearby (~500m)",
    };
    setReports((prev) => [created, ...prev]);
    setSelectedId(created.id);
    setDesc("");
    setSheetOpen(false);
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[var(--stage)]">
      <LeafletMap
        reports={filtered}
        stations={MOCK_OFFICIAL_STATIONS}
        selectedReportId={selectedId}
        onSelectReport={setSelectedId}
        height="100vh"
      />

      {/* Top-left title */}
      <div className="pointer-events-none fixed left-[18px] md:left-[126px] top-[90px] md:top-[110px] z-20 max-w-md">
        <Chip>Community</Chip>
        <MaskedHeadline className="text-[clamp(32px,4vw,56px)] text-[var(--ink)] mt-3">
          What your neighbours see
        </MaskedHeadline>
      </div>

      {/* Top-right HUD */}
      <div className="hidden lg:block fixed right-[420px] top-[110px] z-20 pointer-events-none">
        <HudFrame
          chip="Local reports"
          lines={[
            `REPORTS ${reports.length}`,
            `VERIFIED ${verifiedCount}`,
            "RADIUS 5 KM",
          ]}
        />
      </div>

      {/* Bottom-left legend */}
      <GlassCard
        variant="light"
        className="hidden md:flex flex-col gap-2 fixed left-[126px] bottom-6 z-20 p-3.5 max-w-[300px]"
      >
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase">
          <span className="w-3.5 h-3.5 rounded-full bg-[var(--lime)] border border-[var(--ink)] inline-block" />
          <span>Community observation</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase">
          <span className="w-3.5 h-3.5 rounded-[2px] bg-[var(--ink)] inline-flex items-center justify-center">
            <span className="w-1 h-1 rounded-full bg-white" />
          </span>
          <span>Official monitoring station</span>
        </div>
        <p className="text-[11px] text-[var(--muted)] leading-[1.35] pt-1 border-t border-[rgba(16,41,26,0.1)]">
          Community reports are observations from people, not official sensor
          measurements.
        </p>
      </GlassCard>

      {/* Right panel */}
      <GlassCard
        variant="light"
        className="fixed left-3 right-3 bottom-20 md:left-auto md:right-6 md:top-24 md:bottom-6 md:w-[380px] z-20 rounded-[14px] p-4 flex flex-col gap-3 max-h-[42vh] md:max-h-none overflow-hidden"
      >
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setFilterCat(c)}
              className={`px-2 py-1 rounded-[4px] font-mono text-[9.5px] uppercase tracking-[0.1em] cursor-pointer ${
                filterCat === c
                  ? "bg-[var(--lime)] text-[var(--ink)]"
                  : "bg-white/75 border border-[var(--rule)]"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 pr-1">
          <FeatureList
            items={filtered.map((r, i) => ({
              index: String(i + 1).padStart(2, "0"),
              active: selectedId === r.id,
              onClick: () => setSelectedId(r.id),
              label: (
                <div className="flex flex-col gap-0.5 normal-case tracking-normal font-sans">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10.5px] uppercase tracking-[0.1em]">
                      {r.category}
                    </span>
                    <Chip
                      variant={
                        r.status === "Verified"
                          ? "lime"
                          : r.status === "Pending review"
                            ? "ghost"
                            : "ink"
                      }
                    >
                      {r.status}
                    </Chip>
                  </div>
                  <span className="text-[12.5px] text-[var(--muted)] truncate">
                    {r.description}
                  </span>
                  <span className="font-mono text-[9.5px] text-[var(--muted2)]">
                    {r.areaLabel} · <RelativeTime iso={r.reportedAt} />
                  </span>
                </div>
              ),
            }))}
          />
        </div>
      </GlassCard>

      {/* Floating report CTA */}
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-30 h-11 px-5 rounded-full bg-[var(--lime)] text-[var(--ink)] font-mono text-[11px] tracking-[0.14em] uppercase font-medium shadow-lg inline-flex items-center gap-2 cursor-pointer hover:bg-[var(--lime2)]"
      >
        <Plus className="w-4 h-4" />
        Report an observation
      </button>

      {/* Report sheet */}
      {sheetOpen && (
        <div className="fixed inset-0 z-[60] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="w-full max-w-[460px] bg-white rounded-[22px] p-6 md:p-8 flex flex-col gap-4"
            role="dialog"
            aria-modal="true"
            aria-label="Report an observation"
          >
            <div className="flex items-center justify-between">
              <Chip>New observation</Chip>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label="Close"
                className="w-8 h-8 rounded-full bg-[var(--ink)] text-white inline-flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="mono text-[var(--ink2)] block mb-2">
                  Category
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.filter((c) => c !== "All").map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() =>
                        setCat(c as CommunityReport["category"])
                      }
                      className={`px-2.5 py-1.5 rounded-[4px] font-mono text-[10px] uppercase cursor-pointer border ${
                        cat === c
                          ? "bg-[var(--lime)] text-[var(--ink)] border-[var(--ink)]"
                          : "bg-[var(--paper)] border-[var(--rule)]"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="mono text-[var(--ink2)]">Description</label>
                  <span className="font-mono text-[10px] text-[var(--muted2)]">
                    {desc.length}/280
                  </span>
                </div>
                <textarea
                  rows={3}
                  maxLength={280}
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Describe smoke, dust, or burning waste you see nearby..."
                  className="w-full p-3 rounded-[8px] bg-[var(--paper)] border border-[var(--rule)] text-[14px]"
                />
              </div>

              <p className="font-mono text-[10px] tracking-[0.08em] uppercase text-[var(--muted2)]">
                We round locations to about 500 m to protect your privacy.
              </p>

              {formErr && (
                <p className="font-mono text-[10.5px] text-[var(--aqi-verypoor)]">
                  {formErr}
                </p>
              )}

              <button
                type="submit"
                className="h-11 rounded-[8px] bg-[var(--ink)] text-[var(--lime)] font-mono text-[11px] tracking-[0.14em] uppercase cursor-pointer"
              >
                Submit observation
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
