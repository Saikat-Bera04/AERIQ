"use client";

import React from "react";
import { cn } from "@/lib/utils";

export const Hotspot = React.forwardRef<
  HTMLDivElement,
  {
    label: string;
    value: string;
    open: boolean;
    onToggle: () => void;
    className?: string;
    style?: React.CSSProperties;
  }
>(function Hotspot({ label, value, open, onToggle, className, style }, ref) {
  return (
    <div
      ref={ref}
      className={cn(
        "group/hs absolute inline-flex items-center gap-2.5",
        open && "on",
        className
      )}
      style={style}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-label={`${label}: ${value}`}
        onClick={onToggle}
        className="relative flex items-center gap-2.5 text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--lime2)] rounded-full"
      >
        <span
          className="w-[22px] h-[22px] rounded-full bg-[var(--lime)] relative inline-flex items-center justify-center shrink-0 animate-ping-hotspot transition-transform duration-200 group-hover/hs:scale-[1.15]"
          aria-hidden="true"
        >
          <span className="absolute w-[10px] h-[1.4px] bg-[var(--ink)]" />
          <span className="absolute w-[1.4px] h-[10px] bg-[var(--ink)]" />
        </span>

        <span
          className="px-[9px] py-[6px] rounded-[4px] bg-[rgba(246,248,245,0.72)] backdrop-blur-[8px] font-mono text-[10.5px] tracking-[0.14em] uppercase text-[var(--ink)] flex flex-col max-w-[200px]"
        >
          <span>{label}</span>
          <em
            className={cn(
              "not-italic text-[var(--leaf)] overflow-hidden transition-all duration-[450ms] ease-out",
              open
                ? "max-h-[24px] mt-0.5"
                : "max-h-0 group-hover/hs:max-h-[24px] group-hover/hs:mt-0.5"
            )}
          >
            {value}
          </em>
        </span>
      </button>
    </div>
  );
});
