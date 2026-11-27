import React from "react";
import { cn } from "@/lib/utils";
import { ASSETS } from "@/lib/assets";

export function SkeletonBlock({
  className,
  height = "h-24",
}: {
  className?: string;
  height?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[12px] border border-[var(--rule)] skeleton-shimmer",
        height,
        className
      )}
      aria-busy="true"
      aria-label="Loading"
    />
  );
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-10 px-4 gap-3",
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={ASSETS.islandCutout}
        alt=""
        className="w-[160px] h-auto animate-bob select-none"
      />
      <h3 className="text-[20px] font-medium tracking-[-0.02em] text-[var(--ink)]">
        {title}
      </h3>
      {description && (
        <p className="text-[14px] text-[var(--muted)] max-w-[340px]">
          {description}
        </p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export function ErrorCard({
  code = "DATA_UNAVAILABLE",
  message,
  onRetry,
  className,
}: {
  code?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-[var(--paper)] border border-[var(--rule)] border-l-2 border-l-[var(--aqi-verypoor)] rounded-[12px] p-5 flex flex-col gap-2",
        className
      )}
      role="alert"
    >
      <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--aqi-verypoor)]">
        {code}
      </span>
      <p className="text-[14px] text-[var(--ink)] leading-[1.45]">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="self-start mt-1 font-mono text-[11px] tracking-[0.12em] uppercase text-[var(--ink)] underline underline-offset-4 hover:text-[var(--leaf)] cursor-pointer"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function ThreeDotLoader() {
  return (
    <span className="inline-flex items-center gap-1" aria-label="Loading">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-[var(--lime)]"
          style={{
            animation: `pulseDot 1.2s ease-in-out ${i * 0.16}s infinite`,
          }}
        />
      ))}
    </span>
  );
}
