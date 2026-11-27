"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  AqiCategory,
  FreshnessLevel,
  formatIST,
  getAqiColors,
  getFreshnessLevel,
} from "@/lib/format";

export function AqiBadge({
  category,
  value,
  className,
}: {
  category: AqiCategory;
  value?: number | null;
  className?: string;
}) {
  const c = getAqiColors(category);
  const label =
    category === "Unavailable"
      ? "AQI unavailable"
      : value !== undefined && value !== null
        ? `${value} · ${category}`
        : category;

  return (
    <span
      className={cn(
        "chip chip--aqi",
        c.dashed && "border border-dashed border-[var(--ink2)]/40",
        className
      )}
      style={{
        backgroundColor: c.bg,
        color: c.text,
      }}
    >
      {label}
    </span>
  );
}

function useFreshness(
  observedAt: string,
  freshMinutes?: number,
  agingMinutes?: number
): FreshnessLevel {
  const [level, setLevel] = useState<FreshnessLevel>("fresh");
  useEffect(() => {
    setLevel(getFreshnessLevel(observedAt, freshMinutes, agingMinutes));
  }, [observedAt, freshMinutes, agingMinutes]);
  return level;
}

export function FreshnessDot({
  observedAt,
  freshMinutes,
  agingMinutes,
  className,
}: {
  observedAt: string;
  freshMinutes?: number;
  agingMinutes?: number;
  className?: string;
}) {
  const level = useFreshness(observedAt, freshMinutes, agingMinutes);
  const color =
    level === "fresh"
      ? "var(--fresh)"
      : level === "aging"
        ? "var(--aging)"
        : "var(--stale)";

  return (
    <span
      className={cn("inline-block w-1.5 h-1.5 rounded-full shrink-0", className)}
      style={{ backgroundColor: color }}
      title={`Data ${level}`}
      aria-label={`Data ${level}`}
    />
  );
}

export function SourceStamp({
  provider,
  station,
  observedAt,
  isForecast = false,
  freshMinutes,
  agingMinutes,
  className,
}: {
  provider: string;
  station: string;
  observedAt: string;
  isForecast?: boolean;
  freshMinutes?: number;
  agingMinutes?: number;
  className?: string;
}) {
  const level = useFreshness(observedAt, freshMinutes, agingMinutes);
  const timeLabel = formatIST(observedAt, "HH:mm");

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.12em] uppercase text-[var(--muted2)] flex-wrap",
        className
      )}
    >
      <FreshnessDot
        observedAt={observedAt}
        freshMinutes={freshMinutes}
        agingMinutes={agingMinutes}
      />
      <span>
        {provider} · {station} · {timeLabel} ·{" "}
        {isForecast ? "FORECAST" : "OBSERVATION"}
      </span>
      {level === "stale" && (
        <span className="text-[var(--stale)]">
          · Stale — last updated {timeLabel}
        </span>
      )}
    </span>
  );
}
