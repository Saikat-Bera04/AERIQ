import React from "react";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[9px] select-none",
        className
      )}
    >
      <svg
        width="26"
        height="26"
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
      >
        <path d="M16 2l12 7v14l-12 7-12-7V9z" fill="currentColor" />
        <path
          d="M9 13h10a3 3 0 1 0-3-3M8 17h15M10 21h8a3 3 0 1 1-3 3"
          stroke="#c6f35c"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      {showWordmark && (
        <span className="font-semibold text-[21px] tracking-[0.02em] leading-none">
          AERIQ
        </span>
      )}
    </span>
  );
}
