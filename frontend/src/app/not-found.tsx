"use client";

import React from "react";
import { ASSETS, ROCK_CROPS } from "@/lib/assets";
import {
  Chip,
  CtaSquare,
  FloatingRock,
  FogBank,
  MaskedHeadline,
  Mist,
} from "@/components/ui-aeriq";

export default function NotFound() {
  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-[var(--stage)] text-[var(--ink)] flex flex-col items-center justify-center px-6 text-center">
      <Mist />
      <FogBank />
      <FloatingRock
        crop={ROCK_CROPS.rk1}
        bobDuration="6s"
        className="left-[8%] top-[18%] w-[14vw] md:w-[7.5vw]"
      />
      <FloatingRock
        crop={ROCK_CROPS.rk3}
        bobDuration="8.5s"
        bobDelay="-3s"
        className="right-[10%] bottom-[16%] w-[24vw] md:w-[12vw]"
      />

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={ASSETS.islandCutout}
        alt=""
        className="relative z-10 w-[260px] md:w-[360px] h-auto animate-bob select-none mb-4"
        style={{ animationDuration: "9s" }}
      />

      <div className="relative z-20 flex flex-col items-center gap-4">
        <Chip>404</Chip>
        <MaskedHeadline className="text-[clamp(40px,5vw,72px)]">
          Lost in the haze
        </MaskedHeadline>
        <div className="mt-2">
          <CtaSquare label="BACK TO DASHBOARD" href="/dashboard" />
        </div>
      </div>
    </main>
  );
}
