"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { prefersReducedMotion } from "@/lib/motion";
import { Chip } from "./Chip";
import { WordReveal } from "./Typography";

export function GlassCard({
  variant = "dark",
  tilt = false,
  children,
  className,
  style,
}: {
  variant?: "dark" | "light";
  tilt?: boolean;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [rot, setRot] = useState({ x: 0, y: 0 });

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!tilt || prefersReducedMotion()) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    setRot({ x: x * 8, y: -y * 8 });
  };

  return (
    <div
      onPointerMove={handleMove}
      onPointerLeave={() => tilt && setRot({ x: 0, y: 0 })}
      className={cn(
        "rounded-[10px] transition-transform duration-300 ease-out",
        variant === "dark"
          ? "bg-[var(--glass-dark)] border border-white/22 text-white backdrop-blur-[16px] backdrop-saturate-[1.2]"
          : "bg-[var(--glass-light)] border border-[rgba(16,41,26,0.1)] text-[var(--ink)] backdrop-blur-[14px]",
        className
      )}
      style={{
        ...style,
        transform: tilt
          ? `perspective(1000px) rotateY(${rot.x.toFixed(2)}deg) rotateX(${rot.y.toFixed(2)}deg)`
          : style?.transform,
      }}
    >
      {children}
    </div>
  );
}

export function PaperCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-[var(--paper)] border border-[var(--rule)] rounded-[12px] p-5",
        className
      )}
    >
      {children}
    </div>
  );
}

export function TiltCard({
  image,
  bgPosition = "50% 50%",
  bgSize = "cover",
  label,
  title,
  body,
  href,
  height = 440,
  children,
  className,
}: {
  image: string;
  bgPosition?: string;
  bgSize?: string;
  label: string;
  title: React.ReactNode;
  body?: string;
  href?: string;
  height?: number;
  children?: React.ReactNode;
  className?: string;
}) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  const onMove = (e: React.PointerEvent<HTMLElement>) => {
    if (prefersReducedMotion()) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: x * 6, y: -y * 6 });
  };

  const inner = (
    <>
      <div
        className="absolute inset-0 transition-transform duration-[1200ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]"
        style={{
          backgroundImage: `url("${image}")`,
          backgroundPosition: bgPosition,
          backgroundSize: bgSize,
          backgroundRepeat: "no-repeat",
          transform: hovered ? "scale(1.07)" : "scale(1)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(10,25,15,.45), transparent 35%, transparent 55%, rgba(10,25,15,.75))",
        }}
      />
      <div className="relative z-10 h-full flex flex-col justify-between p-[18px] text-white">
        <div className="flex items-start justify-between gap-2">
          <span className="mono text-white/90">{label}</span>
          <span
            className="w-7 h-7 rounded-full bg-[var(--lime)] text-[var(--ink)] inline-flex items-center justify-center text-sm transition-transform duration-300 shrink-0"
            style={{
              transform: hovered ? "rotate(-45deg)" : "rotate(0deg)",
            }}
            aria-hidden="true"
          >
            →
          </span>
        </div>

        <div>
          {children}
          <h3 className="text-[25px] font-medium tracking-[-0.03em] leading-[1.05] mt-2">
            {title}
          </h3>
          {body && (
            <p
              className="text-[13.5px] leading-[1.45] text-white/85 overflow-hidden transition-all duration-[600ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]"
              style={{
                maxHeight: hovered ? "80px" : "0px",
                marginTop: hovered ? "10px" : "0px",
                opacity: hovered ? 1 : 0,
              }}
            >
              {body}
            </p>
          )}
        </div>
      </div>
    </>
  );

  const sharedProps = {
    onPointerMove: onMove,
    onPointerEnter: () => setHovered(true),
    onPointerLeave: () => {
      setHovered(false);
      setTilt({ x: 0, y: 0 });
    },
    className: cn(
      "group relative block w-full rounded-[12px] overflow-hidden bg-[#1b3122] text-left transition-transform duration-300 ease-out focus-visible:outline-2 focus-visible:outline-[var(--lime2)]",
      className
    ),
    style: {
      height: `${height}px`,
      transform: `perspective(1000px) rotateY(${tilt.x.toFixed(2)}deg) rotateX(${tilt.y.toFixed(2)}deg)`,
    },
  };

  if (href) {
    return (
      <a href={href} {...sharedProps}>
        {inner}
      </a>
    );
  }
  return (
    <div tabIndex={0} {...sharedProps}>
      {inner}
    </div>
  );
}

export function AiCard({
  title,
  summary,
  dataLimitations,
  children,
  footer,
  className,
}: {
  title?: string;
  summary: string;
  dataLimitations: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <PaperCard className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Chip>AI explanation</Chip>
        {title && (
          <h3 className="text-[15px] font-medium tracking-[-0.02em] text-[var(--ink)]">
            {title}
          </h3>
        )}
      </div>
      <div className="text-[15px] leading-[1.5] text-[var(--ink)]">
        <WordReveal text={summary} />
      </div>
      {children}
      <div className="pt-3 border-t border-[var(--rule)] flex flex-col gap-2">
        <p className="font-mono text-[10.5px] tracking-[0.04em] text-[var(--muted2)] leading-[1.45]">
          {dataLimitations}
        </p>
        {footer}
      </div>
    </PaperCard>
  );
}
