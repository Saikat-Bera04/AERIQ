"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

export interface FeatureItem {
  index?: string;
  label: React.ReactNode;
  href?: string;
  onClick?: () => void;
  active?: boolean;
  rightText?: string;
}

export function FeatureRow({
  index,
  label,
  href,
  onClick,
  active,
  isLast,
  hideArrow,
  className,
}: {
  index?: string;
  label: React.ReactNode;
  href?: string;
  onClick?: () => void;
  active?: boolean;
  isLast?: boolean;
  hideArrow?: boolean;
  className?: string;
}) {
  const content = (
    <>
      <span className="opacity-60 tabular-nums">{index ?? ""}</span>
      <span className="truncate">{label}</span>
      {!hideArrow && (
        <span
          className={cn(
            "transition-transform duration-300 text-right",
            active ? "translate-x-1" : "group-hover:translate-x-1"
          )}
          aria-hidden="true"
        >
          →
        </span>
      )}
    </>
  );

  const classes = cn(
    "group grid grid-cols-[30px_1fr_16px] items-center gap-2 py-[11px] font-mono text-[11px] tracking-[0.12em] uppercase transition-all duration-300 text-left w-full",
    !isLast && "border-b border-[rgba(16,41,26,0.14)]",
    active
      ? "text-[var(--leaf)] pl-[6px]"
      : "text-[var(--ink)] hover:text-[var(--leaf)] hover:pl-[6px]",
    hideArrow && "grid-cols-[30px_1fr]",
    className
  );

  if (href) {
    return (
      <a href={href} onClick={onClick} className={classes}>
        {content}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={classes}>
      {content}
    </button>
  );
}

export function FeatureList({
  items,
  selectable = false,
  hideArrows = false,
  className,
}: {
  items: FeatureItem[];
  selectable?: boolean;
  hideArrows?: boolean;
  className?: string;
}) {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className={cn("flex flex-col", className)}>
      {items.map((item, i) => {
        const idx = item.index ?? String(i + 1).padStart(2, "0");
        const isActive = item.active ?? (selectable && selected === i);
        return (
          <FeatureRow
            key={i}
            index={idx}
            label={item.label}
            href={item.href}
            active={isActive}
            isLast={i === items.length - 1}
            hideArrow={hideArrows}
            onClick={() => {
              if (selectable) setSelected(selected === i ? null : i);
              item.onClick?.();
            }}
          />
        );
      })}
    </div>
  );
}
