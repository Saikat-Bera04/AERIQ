import React from "react";
import { cn } from "@/lib/utils";
import { Chip } from "@/components/ui-aeriq";

export function Panel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative z-10 bg-white rounded-t-[22px] -mt-[5vh] md:-mt-[8vh] px-[18px] pt-[40px] pb-[110px] md:pl-[126px] md:pr-[34px] md:pt-[56px] md:pb-[90px] min-h-[70vh] panel-enter",
        className
      )}
      style={{ boxShadow: "0 -30px 60px rgba(16,41,26,.12)" }}
    >
      <div className="max-w-7xl mx-auto">{children}</div>
    </div>
  );
}

export function SectionHeader({
  chip,
  title,
  description,
  rightSlot,
}: {
  chip: string;
  title: string;
  description?: string;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6 mb-8">
      <div>
        <Chip>{chip}</Chip>
        <h2 className="text-[clamp(28px,3.2vw,46px)] font-medium tracking-[-0.04em] leading-none text-[var(--ink)] mt-4">
          {title}
        </h2>
      </div>
      {description && (
        <p className="text-[15px] leading-[1.45] text-[var(--muted)] max-w-[360px]">
          {description}
        </p>
      )}
      {rightSlot}
    </div>
  );
}
