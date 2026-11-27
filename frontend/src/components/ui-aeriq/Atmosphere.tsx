"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { ASSETS } from "@/lib/assets";
import { Chip } from "./Chip";

export function Mist({
  opacity = 1,
  className,
}: {
  opacity?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "absolute -inset-[10%] pointer-events-none animate-drift",
        className
      )}
      style={{
        opacity,
        backgroundImage:
          "radial-gradient(40% 30% at 20% 80%, rgba(255,255,255,0.55) 0%, transparent 70%), radial-gradient(35% 25% at 85% 30%, rgba(255,255,255,0.4) 0%, transparent 70%)",
      }}
      aria-hidden="true"
    />
  );
}

const FOG_SVG_1 = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="460"><filter id="n1"><feTurbulence type="fractalNoise" baseFrequency="0.006 0.014" numOctaves="3" seed="4"/><feColorMatrix type="matrix" values="0 0 0 0 .74 0 0 0 0 .78 0 0 0 0 .79 1.4 0 0 0 -.7"/></filter><rect width="100%" height="100%" filter="url(#n1)"/></svg>`
);
const FOG_SVG_2 = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="460"><filter id="n2"><feTurbulence type="fractalNoise" baseFrequency="0.004 0.009" numOctaves="4" seed="11"/><feColorMatrix type="matrix" values="0 0 0 0 .9 0 0 0 0 .92 0 0 0 0 .92 1.6 0 0 0 -.55"/></filter><rect width="100%" height="100%" filter="url(#n2)"/></svg>`
);

export const FogBank = React.forwardRef<
  HTMLDivElement,
  { className?: string; style?: React.CSSProperties }
>(function FogBank({ className, style }, ref) {
  return (
    <div
      ref={ref}
      className={cn(
        "absolute -left-[8vw] -top-[6vh] w-[56vw] h-[60vh] pointer-events-none",
        className
      )}
      style={{
        maskImage:
          "radial-gradient(ellipse 52% 48% at 46% 46%, #000 44%, rgba(0,0,0,.7) 64%, transparent 100%)",
        WebkitMaskImage:
          "radial-gradient(ellipse 52% 48% at 46% 46%, #000 44%, rgba(0,0,0,.7) 64%, transparent 100%)",
        ...style,
      }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 blur-[10px]"
        style={{
          background:
            "radial-gradient(60% 55% at 40% 45%, #d9dddd, #cfd4d4 60%, #c9cfcf)",
        }}
      />
      <div
        className="absolute -inset-[20%] opacity-[0.55] blur-[14px] animate-fogA"
        style={{
          backgroundImage: `url("data:image/svg+xml,${FOG_SVG_1}")`,
          backgroundSize: "cover",
        }}
      />
      <div
        className="absolute -inset-[20%] opacity-[0.9] blur-[8px] animate-fogB"
        style={{
          backgroundImage: `url("data:image/svg+xml,${FOG_SVG_2}")`,
          backgroundSize: "cover",
        }}
      />
    </div>
  );
});

export interface RockCrop {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const ROCK_CROPS = {
  rk1: { x: 30, y: 200, w: 260, h: 295 },
  rk3: { x: 895, y: 240, w: 265, h: 270 },
} as const;

export const FloatingRock = React.forwardRef<
  HTMLDivElement,
  {
    crop: RockCrop;
    bobDuration?: string;
    bobDelay?: string;
    className?: string;
    style?: React.CSSProperties;
  }
>(function FloatingRock(
  { crop, bobDuration = "7s", bobDelay = "0s", className, style },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn("absolute overflow-hidden pointer-events-none", className)}
      style={{
        aspectRatio: `${crop.w} / ${crop.h}`,
        ...style,
      }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 animate-bob"
        style={{
          animationDuration: bobDuration,
          animationDelay: bobDelay,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ASSETS.rockSprite}
          alt=""
          className="absolute max-w-none select-none"
          style={{
            width: `${(1200 / crop.w) * 100}%`,
            left: `${(-crop.x / crop.w) * 100}%`,
            top: `${(-crop.y / crop.h) * 100}%`,
          }}
        />
      </div>
    </div>
  );
});

export const HudFrame = React.forwardRef<
  HTMLDivElement,
  {
    chip: string;
    lines: string[];
    className?: string;
    style?: React.CSSProperties;
  }
>(function HudFrame({ chip, lines, className, style }, ref) {
  return (
    <div ref={ref} className={cn("relative inline-block", className)} style={style}>
      {/* White 22px crosshair 44px to the left, top 4px */}
      <div
        className="absolute -left-[44px] top-[4px] w-[22px] h-[22px] pointer-events-none"
        aria-hidden="true"
      >
        <span className="absolute left-0 right-0 top-[10.5px] h-[1px] bg-white/85" />
        <span className="absolute top-0 bottom-0 left-[10.5px] w-[1px] bg-white/85" />
      </div>

      {/* Corner-bracket frame clip-pathed to 14px ticks */}
      <div
        className="pointer-events-none absolute -left-2 -top-2 -right-[14px] -bottom-[10px] border border-white/55"
        style={{
          clipPath:
            "polygon(0 0, 14px 0, 14px 1px, 1px 1px, 1px 14px, 0 14px, 0 calc(100% - 14px), 1px calc(100% - 14px), 1px calc(100% - 1px), 14px calc(100% - 1px), 14px 100%, 0 100%, calc(100% - 14px) 100%, calc(100% - 14px) calc(100% - 1px), calc(100% - 1px) calc(100% - 1px), calc(100% - 1px) calc(100% - 14px), 100% calc(100% - 14px), 100% 100%, 100% 14px, calc(100% - 1px) 14px, calc(100% - 1px) 1px, calc(100% - 14px) 1px, calc(100% - 14px) 0, 100% 0)",
        }}
        aria-hidden="true"
      />

      <Chip>{chip}</Chip>
      <pre
        className="mt-3 font-mono text-[11px] tracking-[0.12em] leading-[1.65] text-white whitespace-pre"
        style={{ textShadow: "0 1px 6px rgba(0,0,0,.35)" }}
      >
        {lines.join("\n")}
      </pre>
    </div>
  );
});

export const ProgressBar = React.forwardRef<
  HTMLDivElement,
  { progress?: number; className?: string }
>(function ProgressBar({ progress = 0, className }, ref) {
  return (
    <div
      className={cn(
        "w-[120px] h-[2px] bg-[rgba(16,41,26,0.18)] rounded-[2px] overflow-hidden",
        className
      )}
    >
      <div
        ref={ref}
        className="w-full h-full bg-[var(--lime2)] origin-left"
        style={{ transform: `scaleX(${progress})` }}
      />
    </div>
  );
});

export function CtaSquare({
  label,
  href,
  onClick,
  darkText = false,
  className,
}: {
  label: string;
  href?: string;
  onClick?: () => void;
  darkText?: boolean;
  className?: string;
}) {
  const inner = (
    <>
      <span className="font-mono text-[11.5px] tracking-[0.16em] uppercase">
        {label}
      </span>
      <span
        className="w-5 h-5 rounded-[3px] bg-[var(--lime)] text-[var(--ink)] inline-flex items-center justify-center text-[13px] leading-none transition-transform duration-300 group-hover:translate-x-[3px]"
        aria-hidden="true"
      >
        ›
      </span>
    </>
  );

  const classes = cn(
    "group inline-flex items-center gap-3 cursor-pointer",
    darkText ? "text-[var(--ink)]" : "text-current",
    className
  );

  if (href) {
    return (
      <a href={href} onClick={onClick} className={classes}>
        {inner}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={classes}>
      {inner}
    </button>
  );
}
