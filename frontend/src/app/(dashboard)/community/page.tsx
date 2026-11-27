"use client";

import React, { useCallback, useEffect, useState } from "react";
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
import { api } from "@/lib/api";
import { formatIST, formatRelativeTime } from "@/lib/format";
import { useLiveLocation } from "@/hooks/useLiveLocation";
import type { CommunityReport, OfficialStationPin } from "@/types";

const LeafletMap = dynamic(
  () => import("@/components/community/LeafletMap").then((m) => m.LeafletMap),
  { ssr: false, loading: () => <SkeletonBlock height="h-screen" /> }
);

function RelativeTime({ iso }: { iso: string }) {
  const [text, setText] = React.useState(() => formatIST(iso));
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setText(formatRelativeTime(iso)));
    return () => cancelAnimationFrame(id);
  }, [iso]);
  return <>{text}</>;
}

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "smoke", label: "Smoke" },
  { key: "dust", label: "Dust" },
  { key: "burning_waste", label: "Burning waste" },
  { key: "vehicle_exhaust", label: "Vehicle exhaust" },
  { key: "industrial", label: "Industrial" },
  { key: "other", label: "Other" },
] as const;

export default function CommunityPage() {
  const { location: liveLoc } = useLiveLocation();
  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [stations, setStations] = useState<OfficialStationPin[]>([]);
  const [filterCat, setFilterCat] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const [cat, setCat] = useState("smoke");
  const [desc, setDesc] = useState("");
  const [formErr, setFormErr] = useState<string | null>(null);

  const loadHotspots = useCallback(async () => {
    const lat = liveLoc?.lat ?? 22.5726;
    const lng = liveLoc?.lng ?? 88.3639;
    const { data } = await api.get<{
      reports: {
        id: string;
        category: string;
        description: string;
        status: string;
        createdAt: string;
        roundedPoint: { lat: number; lng: number };
      }[];
      stations: {
        id: string;
        name: string;
        provider: string;
        point: { lat: number; lng: number };
      }[];
    }>(`/api/v1/community/hotspots?lat=${lat}&lng=${lng}&radiusKm=15`);

    setReports(
      data.reports.map((r) => ({
        id: r.id,
        category: (r.category.replace("_", " ") as CommunityReport["category"]) ?? "Other",
        description: r.description,
        status:
          r.status === "verified"
            ? "Verified"
            : r.status === "not_verified"
              ? "Not verified"
              : "Pending review",
        reportedAt: r.createdAt,
        lat: r.roundedPoint.lat,
        lng: r.roundedPoint.lng,
        areaLabel: "Rounded ~500m",
      }))
    );

    setStations(
      data.stations.map((s) => ({
        id: s.id,
        name: s.name,
        provider: s.provider.toUpperCase(),
        aqi: null,
        category: "Unavailable",
        observedAt: new Date().toISOString(),
        lat: s.point.lat,
        lng: s.point.lng,
      }))
    );
  }, [liveLoc?.lat, liveLoc?.lng]);

  useEffect(() => {
    const id = requestAnimationFrame(() => void loadHotspots());
    return () => cancelAnimationFrame(id);
  }, [loadHotspots]);

  const filtered =
    filterCat === "all"
      ? reports
      : reports.filter(
          (r) => r.category.toLowerCase().replace(/\s+/g, "_") === filterCat
        );

  const verifiedCount = reports.filter((r) => r.status === "Verified").length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (desc.trim().length < 5) {
      setFormErr("Describe what you observed (at least 5 characters)");
      return;
    }
    setFormErr(null);
    try {
      const { data } = await api.post<{
        id: string;
        category: string;
        description: string;
        status: string;
        createdAt: string;
        roundedPoint: { lat: number; lng: number };
      }>("/api/v1/community/reports", {
        category: cat,
        description: desc.trim(),
        lat: liveLoc?.lat ?? 22.5726,
        lng: liveLoc?.lng ?? 88.3639,
      });
      const created: CommunityReport = {
        id: data.id,
        category: (data.category.replace("_", " ") as CommunityReport["category"]) ?? "Other",
        description: data.description,
        status: "Pending review",
        reportedAt: data.createdAt,
        lat: data.roundedPoint.lat,
        lng: data.roundedPoint.lng,
        areaLabel: "Rounded ~500m",
      };
      setReports((prev) => [created, ...prev]);
      setSelectedId(created.id);
      setDesc("");
      setSheetOpen(false);
    } catch (err) {
      setFormErr(err instanceof Error ? err.message : "Failed to submit");
    }
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[var(--stage)]">
      <LeafletMap
        center={[liveLoc?.lat ?? 22.5726, liveLoc?.lng ?? 88.3639]}
        reports={filtered}
        stations={stations}
        selectedReportId={selectedId}
        onSelectReport={setSelectedId}
        height="100vh"
      />

      <div className="pointer-events-none fixed left-[18px] md:left-[126px] top-[90px] md:top-[110px] z-20 max-w-md">
        <Chip>Community</Chip>
        <MaskedHeadline className="text-[clamp(32px,4vw,56px)] text-[var(--ink)] mt-3">
          What your neighbours see
        </MaskedHeadline>
      </div>

      <div className="hidden lg:block fixed right-[420px] top-[110px] z-20 pointer-events-none">
        <HudFrame
          chip="Local reports"
          lines={[
            `REPORTS ${reports.length}`,
            `VERIFIED ${verifiedCount}`,
            "RADIUS 15 KM",
          ]}
        />
      </div>

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

      <GlassCard
        variant="light"
        className="fixed left-3 right-3 bottom-20 md:left-auto md:right-6 md:top-24 md:bottom-6 md:w-[380px] z-20 rounded-[14px] p-4 flex flex-col gap-3 max-h-[42vh] md:max-h-none overflow-hidden"
      >
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setFilterCat(c.key)}
              className={`px-2 py-1 rounded-[4px] font-mono text-[9.5px] uppercase tracking-[0.1em] cursor-pointer ${
                filterCat === c.key
                  ? "bg-[var(--lime)] text-[var(--ink)]"
                  : "bg-white/75 border border-[var(--rule)]"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 pr-1">
          {filtered.length === 0 ? (
            <p className="text-[13px] text-[var(--muted)] py-6 text-center">
              No community observations in this area yet.
            </p>
          ) : (
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
          )}
        </div>
      </GlassCard>

      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-30 h-11 px-5 rounded-full bg-[var(--lime)] text-[var(--ink)] font-mono text-[11px] tracking-[0.14em] uppercase font-medium shadow-lg inline-flex items-center gap-2 cursor-pointer hover:bg-[var(--lime2)]"
      >
        <Plus className="w-4 h-4" />
        Report an observation
      </button>

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
                  {CATEGORIES.filter((c) => c.key !== "all").map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setCat(c.key)}
                      className={`px-2.5 py-1.5 rounded-[4px] font-mono text-[10px] uppercase cursor-pointer border ${
                        cat === c.key
                          ? "bg-[var(--lime)] text-[var(--ink)] border-[var(--ink)]"
                          : "bg-[var(--paper)] border-[var(--rule)]"
                      }`}
                    >
                      {c.label}
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
