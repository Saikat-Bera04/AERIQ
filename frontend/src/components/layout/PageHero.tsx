"use client";

import React, { useEffect, useRef } from "react";
import { ASSETS } from "@/lib/assets";
import {
  Chip,
  FloatingRock,
  HudFrame,
  MaskedHeadline,
  Mist,
  ROCK_CROPS,
} from "@/components/ui-aeriq";
import { lerpPointer, prefersReducedMotion, seg } from "@/lib/motion";

export function PageHero({
  chip,
  title,
  subtitle,
  hud,
  height = "44vh",
  crop = "50% 50%",
  rock = false,
  children,
}: {
  chip: string;
  title: string;
  subtitle?: string;
  hud?: string[];
  height?: string;
  crop?: string;
  rock?: boolean;
  children?: React.ReactNode;
}) {
  const camRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    let mx = 0;
    let my = 0;
    let sx = 0;
    let sy = 0;
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      mx = e.clientX / (window.innerWidth || 1) - 0.5;
      my = e.clientY / (window.innerHeight || 1) - 0.5;
    };

    const tick = () => {
      sx = lerpPointer(sx, mx);
      sy = lerpPointer(sy, my);
      if (camRef.current) {
        camRef.current.style.transform = `translate3d(${(-sx * 18).toFixed(2)}px, ${(-sy * 12).toFixed(2)}px, 0) scale(1.08)`;
      }
      const h = seg(window.scrollY / (window.innerHeight || 1), 0, 0.35);
      if (copyRef.current) {
        copyRef.current.style.transform = `translateY(${(-h * 40).toFixed(2)}px)`;
        copyRef.current.style.filter = `blur(${(h * 8).toFixed(2)}px)`;
        copyRef.current.style.opacity = String(1 - h);
      }
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <section
      className="relative w-full overflow-hidden bg-[var(--stage)] min-h-[34vh]"
      style={{ height }}
    >
      <div
        ref={camRef}
        className="absolute inset-0 scale-[1.08] will-change-transform transition-opacity duration-400"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ASSETS.heroStill}
          alt=""
          className="w-full h-full object-cover opacity-85"
          style={{ objectPosition: crop }}
        />
        <Mist />
      </div>

      {rock && (
        <FloatingRock
          crop={ROCK_CROPS.rk3}
          bobDuration="8s"
          className="hidden md:block right-[4%] top-[18%] w-[9vw]"
        />
      )}

      {hud && (
        <div className="hidden md:block absolute right-[9%] top-[30%] z-10">
          <HudFrame chip={chip} lines={hud} />
        </div>
      )}

      <div
        ref={copyRef}
        className="relative md:absolute left-[18px] md:left-[126px] bottom-[10vh] md:bottom-[14vh] pt-24 md:pt-0 pr-4 z-10 max-w-[680px]"
      >
        <Chip>{chip}</Chip>
        <MaskedHeadline className="text-[clamp(38px,5vw,76px)] text-[var(--ink)] mt-4">
          {title}
        </MaskedHeadline>
        {subtitle && (
          <p className="text-[15px] leading-[1.45] text-[var(--ink2)] max-w-[460px] mt-3">
            {subtitle}
          </p>
        )}
      </div>

      {children}
    </section>
  );
}
