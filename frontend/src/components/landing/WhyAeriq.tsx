"use client";

import React from "react";
import { WobbleCard } from "@/components/ui/wobble-card";
import { Chip, CtaSquare, HudFrame } from "@/components/ui-aeriq";

export function WhyAeriq() {
  return (
    <section className="bg-white px-[18px] md:px-[34px] pt-[90px] pb-[40px]">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-end justify-between gap-10 mb-12">
          <div>
            <Chip>Why AERIQ</Chip>
            <h2 className="text-[clamp(30px,3.6vw,54px)] font-medium tracking-[-0.04em] leading-none text-[var(--ink)] max-w-[640px] mt-5">
              Air data you can trust and act on
            </h2>
          </div>
          <p className="text-[15px] leading-[1.45] text-[var(--muted)] max-w-[360px]">
            Built on one rule: Gemini explains validated data, and deterministic
            code does every calculation.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-7xl mx-auto w-full">
          {/* Card A */}
          <WobbleCard
            containerClassName="col-span-1 lg:col-span-2 h-full bg-[var(--ink)] min-h-[420px] lg:min-h-[340px]"
            className="relative flex flex-col justify-between"
          >
            <div className="max-w-md relative z-10">
              <Chip>Personal guidance</Chip>
              <h3 className="text-left text-balance text-2xl lg:text-3xl font-medium tracking-[-0.03em] text-white mt-4 leading-[1.1]">
                Other apps show the number. AERIQ tells you what to do with it.
              </h3>
              <p className="mt-4 text-left text-[15px] leading-[1.5] text-white/78">
                Gemini turns validated, timestamped readings into advice for
                your commute, study, exercise and home — and says plainly when
                data is missing or stale.
              </p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/landing/why-guidance.jpg"
              width={520}
              height={360}
              alt="Minimalist environmental air-quality prism sensor"
              className="absolute -right-4 lg:-right-[10%] -bottom-10 w-[440px] max-w-none rounded-[18px] object-cover pointer-events-none select-none animate-bob opacity-90"
              style={{ animationDuration: "9s" }}
            />
          </WobbleCard>

          {/* Card B */}
          <WobbleCard
            containerClassName="col-span-1 min-h-[340px] bg-[var(--ink2)]"
            className="relative flex flex-col justify-between"
          >
            <div className="relative z-10">
              <Chip>Data integrity</Chip>
              <h3 className="max-w-80 text-left text-balance text-2xl lg:text-3xl font-medium tracking-[-0.03em] text-white mt-4 leading-[1.1]">
                No invented readings. Ever.
              </h3>
              <p className="mt-4 max-w-[26rem] text-left text-[15px] leading-[1.5] text-white/78">
                Every AQI value comes from deterministic code and a named
                source. If the data is incomplete, AERIQ shows &ldquo;AQI
                unavailable&rdquo; instead of guessing.
              </p>
            </div>
            <div className="mt-8 pl-11 relative z-10">
              <HudFrame
                chip="SOURCE CPCB"
                lines={["OBSERVED 08:30 IST", "STATUS OBSERVATION"]}
              />
            </div>
          </WobbleCard>

          {/* Card C */}
          <WobbleCard
            containerClassName="col-span-1 lg:col-span-3 bg-[#1b3122] min-h-[420px] lg:min-h-[360px]"
            className="relative flex flex-col justify-between"
          >
            <div className="max-w-lg relative z-10">
              <Chip>For the whole household</Chip>
              <h3 className="text-left text-balance text-2xl lg:text-3xl font-medium tracking-[-0.03em] text-white mt-4 leading-[1.1]">
                Plan your day around cleaner air — for you and everyone at home.
              </h3>
              <p className="mt-4 text-left text-[15px] leading-[1.5] text-white/78">
                Set your lifestyle and family once. AERIQ builds a daily plan,
                swaps in indoor alternatives when the air turns poor, and
                updates it when conditions change.
              </p>
              <div className="mt-6 text-white">
                <CtaSquare label="CREATE YOUR PROFILE" href="/register" />
              </div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/landing/why-household.jpg"
              width={640}
              height={400}
              alt="Sunlit modern living room with indoor plants and air purifier"
              className="hidden md:block absolute -right-10 md:-right-[24%] lg:-right-[8%] -bottom-10 w-[620px] rounded-[16px] object-cover pointer-events-none select-none"
            />
          </WobbleCard>
        </div>
      </div>
    </section>
  );
}
