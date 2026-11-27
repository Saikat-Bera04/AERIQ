"use client";

import React from "react";
import Link from "next/link";
import { ASSETS } from "@/lib/assets";
import {
  Chip,
  FloatingRock,
  FogBank,
  Logo,
  MaskedHeadline,
  Mist,
  ROCK_CROPS,
} from "@/components/ui-aeriq";

export function AuthSplitShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[var(--stage)] text-[var(--ink)]">
      {/* Left 58% misty stage */}
      <div className="relative h-[38vh] md:h-auto md:w-[58%] overflow-hidden bg-[var(--stage)] flex items-center justify-center">
        <Link
          href="/"
          className="absolute top-6 left-6 md:left-[34px] z-20"
        >
          <Logo />
        </Link>

        <Mist />
        <FogBank className="top-auto -bottom-[10vh] -left-[10vw]" />

        <FloatingRock
          crop={ROCK_CROPS.rk1}
          bobDuration="6s"
          className="left-[6%] top-[18%] w-[14vw] md:w-[7vw]"
        />
        <FloatingRock
          crop={ROCK_CROPS.rk3}
          bobDuration="8.5s"
          bobDelay="-3s"
          className="right-[10%] top-[24%] w-[20vw] md:w-[10vw]"
        />

        {/* Centred floating island cut-out */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ASSETS.islandCutout}
          alt="Floating moss island"
          className="relative z-10 w-[70%] max-w-[640px] object-contain animate-bob select-none"
          style={{ animationDuration: "9s" }}
        />

        {/* Stage copy */}
        <div className="hidden md:block absolute left-[34px] bottom-[34px] z-20 max-w-md">
          <Chip>Intelligence for every breath</Chip>
          <MaskedHeadline className="text-[clamp(40px,4.4vw,68px)] text-[var(--ink)] mt-4">
            Breathe smarter,
            <br />
            starting today.
          </MaskedHeadline>
          <div className="mt-5 pl-4 border-l-2 border-[var(--lime)] font-mono text-[11.5px] leading-[1.75] tracking-[0.13em] uppercase text-[var(--ink2)]">
            Your city&apos;s air.
            <br />
            Your routine.
            <br />
            One clear plan.
          </div>
        </div>
      </div>

      {/* Right 42% white panel */}
      <div
        className="relative z-20 flex-1 md:w-[42%] md:-ml-[22px] bg-white rounded-t-[22px] md:rounded-tr-none md:rounded-l-[22px] -mt-[22px] md:mt-0 px-6 py-10 md:px-[56px] md:py-[64px] flex flex-col justify-center"
        style={{ boxShadow: "-20px 0 60px rgba(16,41,26,.08)" }}
      >
        <div className="w-full max-w-[400px] mx-auto">{children}</div>
      </div>
    </div>
  );
}
