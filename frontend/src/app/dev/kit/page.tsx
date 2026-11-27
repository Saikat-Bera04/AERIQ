"use client";

import React, { useState } from "react";
import {
  Logo,
  Chip,
  MonoLabel,
  MaskedHeadline,
  WordReveal,
  CountUp,
  Sparkline,
  GlassCard,
  PaperCard,
  TiltCard,
  AiCard,
  FeatureList,
  Hotspot,
  HudFrame,
  ProgressBar,
  CtaSquare,
  AqiBadge,
  SourceStamp,
  SkeletonBlock,
  EmptyState,
  ErrorCard,
} from "@/components/ui-aeriq";
import { ASSETS } from "@/lib/assets";

export default function DevKitPage() {
  const [openSpot, setOpenSpot] = useState(false);

  return (
    <main className="min-h-screen bg-white text-[var(--ink)] px-[18px] md:px-[34px] py-12 max-w-7xl mx-auto flex flex-col gap-12">
      <header className="flex items-center justify-between border-b border-[var(--rule)] pb-6">
        <Logo />
        <Chip>UI Kit · Section 3</Chip>
      </header>

      <section className="flex flex-col gap-4">
        <MonoLabel>Chips & Badges</MonoLabel>
        <div className="flex flex-wrap gap-2 items-center">
          <Chip>Urban air intelligence</Chip>
          <Chip variant="ink">Indoor</Chip>
          <Chip variant="ghost">Observation</Chip>
          <AqiBadge category="Good" value={42} />
          <AqiBadge category="Satisfactory" value={78} />
          <AqiBadge category="Moderate" value={145} />
          <AqiBadge category="Poor" value={212} />
          <AqiBadge category="Very Poor" value={338} />
          <AqiBadge category="Severe" value={428} />
          <AqiBadge category="Unavailable" />
        </div>
        <SourceStamp
          provider="CPCB"
          station="RABINDRA BHARATI"
          observedAt="2026-11-27T08:30:00+05:30"
        />
      </section>

      <section className="flex flex-col gap-4">
        <MonoLabel>Typography & Motion</MonoLabel>
        <MaskedHeadline className="text-[clamp(36px,4.5vw,64px)]">
          Intelligence for Every Breath
        </MaskedHeadline>
        <p className="text-[18px] max-w-2xl">
          <WordReveal text="AERIQ connects timestamped pollutant readings with your commute, study, exercise and home routines — so you know what to change today." />
        </p>
        <div className="flex items-center gap-8">
          <div className="text-[46px] font-medium tracking-[-0.04em]">
            <CountUp value={212} />{" "}
            <span className="mono text-[var(--muted2)]">CPCB AQI</span>
          </div>
          <Sparkline />
        </div>
        <ProgressBar progress={0.62} />
        <CtaSquare label="CREATE YOUR PROFILE" href="/register" />
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative h-[320px] rounded-[12px] overflow-hidden bg-[var(--stage)] p-6 flex flex-col justify-between">
          <GlassCard variant="dark" tilt className="p-4 w-[240px]">
            <h4 className="text-[15px] font-medium">Dark glass card</h4>
            <p className="text-[12px] text-white/75 mt-1">
              Backdrop blur 16px with pointer tilt.
            </p>
          </GlassCard>
          <HudFrame
            chip="Air quality"
            lines={["LAT  22.5726° N", "LON  88.3639° E", "KOLKATA · SAMPLE"]}
            className="ml-11"
          />
        </div>

        <TiltCard
          image={ASSETS.sensorMast}
          bgPosition="22% 70%"
          bgSize="260%"
          label="[For students & commuters]"
          title="Adaptive daily planner"
          body="Shifts outdoor study, exercise and waiting time to cleaner hours."
          height={320}
        />

        <div className="relative h-[320px] rounded-[12px] bg-[var(--paper)] border border-[var(--rule)] p-6">
          <Hotspot
            label="PM2.5"
            value="92 µg/m³"
            open={openSpot}
            onToggle={() => setOpenSpot((v) => !v)}
            style={{ left: "20%", top: "40%" }}
          />
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AiCard
          title="What to do today"
          summary="Morning PM2.5 is elevated across North Kolkata. Prefer covered metro transit before 10 AM and move outdoor exercise indoors."
          dataLimitations="Based on CPCB Rabindra Bharati 08:30 IST observation. Local street-level variation may occur."
        />
        <PaperCard>
          <FeatureList
            selectable
            items={[
              { label: "Environmental intelligence" },
              { label: "Gemini personalization" },
              { label: "Adaptive daily planner" },
              { label: "What-if impact simulator" },
              { label: "Community pollution map" },
            ]}
          />
        </PaperCard>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SkeletonBlock height="h-40" />
        <ErrorCard
          code="PROVIDER_OFFLINE"
          message="Live data from CPCB is unavailable right now. Showing the last reading from 07:30 IST."
          onRetry={() => {}}
        />
        <EmptyState
          title="No saved scenarios yet"
          description="Compare commute modes in the simulator to track avoided emissions."
        />
      </section>
    </main>
  );
}
