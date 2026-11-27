"use client";

import React, { useRef } from "react";
import { useInView } from "@/hooks/useInView";
import { useCountUp } from "@/hooks/useCountUp";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export function CountUp({
  value,
  decimals = 0,
  commas = true,
  duration = 1600,
  className,
  suffix = "",
  prefix = "",
}: {
  value: number;
  decimals?: number;
  commas?: boolean;
  duration?: number;
  className?: string;
  suffix?: string;
  prefix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { threshold: 0.6, once: true });
  const current = useCountUp(value, inView, duration);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {prefix}
      {formatNumber(current, { decimals, commas })}
      {suffix}
    </span>
  );
}

const DEFAULT_POINTS = "0,60 30,55 60,57 90,44 120,46 150,30 180,24 214,10";

export function Sparkline({
  points = DEFAULT_POINTS,
  width = 220,
  height = 70,
  progress,
  className,
}: {
  points?: string;
  width?: number;
  height?: number;
  /** Optional 0..1 draw progress; if omitted, draws on view */
  progress?: number;
  className?: string;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { threshold: 0.3, once: true });
  const length = 260;

  const dashOffset =
    progress !== undefined
      ? length * (1 - Math.max(0, Math.min(1, progress)))
      : inView
        ? 0
        : length;

  // Parse coordinates for dots
  const coords = points
    .trim()
    .split(/\s+/)
    .map((p) => {
      const [x, y] = p.split(",").map(Number);
      return { x, y };
    })
    .filter((pt) => !Number.isNaN(pt.x) && !Number.isNaN(pt.y));

  const last = coords[coords.length - 1];
  const midDots =
    coords.length >= 6
      ? [coords[Math.floor(coords.length * 0.4)], coords[Math.floor(coords.length * 0.7)]]
      : [];

  return (
    <svg
      ref={ref}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible", className)}
      aria-hidden="true"
    >
      <polyline
        fill="none"
        stroke="var(--lime)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        strokeDasharray={length}
        strokeDashoffset={dashOffset}
        style={{
          transition:
            progress === undefined
              ? "stroke-dashoffset 900ms cubic-bezier(0.2, 0.8, 0.2, 1)"
              : undefined,
        }}
      />
      {midDots.map((pt, i) => (
        <circle key={i} cx={pt.x} cy={pt.y} r="2.4" fill="#ffffff" />
      ))}
      {last && (
        <circle cx={last.x} cy={last.y} r="3.4" fill="var(--lime)" />
      )}
    </svg>
  );
}
