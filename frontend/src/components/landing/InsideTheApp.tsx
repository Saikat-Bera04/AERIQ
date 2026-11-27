"use client";

import React from "react";
import {
  Carousel,
  Card,
  CarouselCardData,
} from "@/components/ui/apple-cards-carousel";
import { Chip, FeatureList } from "@/components/ui-aeriq";
import { ASSETS } from "@/lib/assets";

function ModuleContent({
  lead,
  body,
  points,
  src,
  objectPosition,
}: {
  lead: string;
  body: string;
  points: string[];
  src: string;
  objectPosition?: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="bg-[var(--paper)] border border-[var(--rule)] rounded-[22px] p-8 md:p-14 flex flex-col gap-5">
        <p className="text-[var(--ink)] font-semibold text-xl md:text-2xl tracking-[-0.02em]">
          {lead}
        </p>
        <p className="text-[18px] leading-[1.5] text-[var(--muted)]">{body}</p>
        <FeatureList
          hideArrows
          items={points.map((pt, idx) => ({
            index: String(idx + 1).padStart(2, "0"),
            label: pt,
          }))}
        />
      </div>

      <figure className="flex flex-col gap-2">
        <div className="w-full aspect-video rounded-[16px] overflow-hidden bg-[var(--stage)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={lead}
            className="w-full h-full object-cover"
            style={{ objectPosition: objectPosition ?? "50% 50%" }}
          />
        </div>
        <figcaption className="mono text-[var(--muted2)]">
          Illustrative scene
        </figcaption>
      </figure>
    </div>
  );
}

const APP_MODULES: CarouselCardData[] = [
  {
    category: "Dashboard",
    title: "Today's air, with its source and time.",
    src: ASSETS.heroStill,
    objectPosition: "50% 60%",
    content: (
      <ModuleContent
        lead="Know the air before you step out."
        body="Current AQI, pollutants and weather in one view, each labelled with provider, station and observed time."
        points={[
          "CPCB AQI only when the data qualifies",
          "Observation vs forecast labels",
          "24h, 7d and 30d history",
        ]}
        src={ASSETS.heroStill}
        objectPosition="50% 60%"
      />
    ),
  },
  {
    category: "Gemini assistant",
    title: "Ask anything about the air you breathe.",
    src: ASSETS.islandClouds,
    objectPosition: "50% 50%",
    content: (
      <ModuleContent
        lead="Plain answers, grounded in real readings."
        body="Ask about runs, commutes or your kids' playtime. Gemini explains the validated data AERIQ sends it, and lists what it doesn't know."
        points={[
          "Shows the exact context it used",
          "Flags stale or missing data",
          "Never gives a diagnosis",
        ]}
        src={ASSETS.islandClouds}
        objectPosition="50% 50%"
      />
    ),
  },
  {
    category: "Daily planner",
    title: "Your day, timed to cleaner hours.",
    src: ASSETS.sensorMast,
    objectPosition: "22% 70%",
    content: (
      <ModuleContent
        lead="Move the walk, keep the routine."
        body="AERIQ times study, exercise and commutes to the cleaner hours of your day, with indoor alternatives ready."
        points={[
          "Hour-by-hour air window",
          "One-tap indoor swap",
          "Rebuilds when conditions change",
        ]}
        src={ASSETS.sensorMast}
        objectPosition="22% 70%"
      />
    ),
  },
  {
    category: "Indoor air coach",
    title: "Cleaner air inside your home.",
    src: ASSETS.sensorMast,
    objectPosition: "62% 30%",
    content: (
      <ModuleContent
        lead="The air inside matters too."
        body="Ventilation timing, smoke and dust reduction and purifier guidance, tuned to your home and household."
        points={[
          "When to open windows",
          "Cooking, incense and dust tips",
          "HEPA purifier guidance",
        ]}
        src={ASSETS.sensorMast}
        objectPosition="62% 30%"
      />
    ),
  },
  {
    category: "Impact simulator",
    title: "See what switching your commute changes.",
    src: ASSETS.heroStill,
    objectPosition: "80% 40%",
    content: (
      <ModuleContent
        lead="Compare before you commit."
        body="Car, bus, metro, cycling or walking: see estimated CO₂e for each, with the emission factors and assumptions shown."
        points={[
          "E = distance × factor × trips",
          "Every assumption listed",
          "Emissions kept separate from exposure",
        ]}
        src={ASSETS.heroStill}
        objectPosition="80% 40%"
      />
    ),
  },
  {
    category: "Community map",
    title: "What your neighbours are seeing.",
    src: ASSETS.islandClouds,
    objectPosition: "30% 60%",
    content: (
      <ModuleContent
        lead="Local eyes on local air."
        body="Report smoke, dust or burning waste near you, and see what others nearby have reported."
        points={[
          "Clearly marked as community reports",
          "Moderation status on every pin",
          "Locations rounded for privacy",
        ]}
        src={ASSETS.islandClouds}
        objectPosition="30% 60%"
      />
    ),
  },
];

export function InsideTheApp() {
  const cards = APP_MODULES.map((card, index) => (
    <Card key={card.category} card={card} index={index} />
  ));

  return (
    <section id="app" className="bg-white pt-10 pb-[90px]">
      <div className="max-w-7xl mx-auto px-[18px] md:px-[34px]">
        <Chip>Inside the app</Chip>
        <h2 className="text-[clamp(30px,3.6vw,54px)] font-medium tracking-[-0.04em] leading-none text-[var(--ink)] mt-5">
          Get to know AERIQ.
        </h2>
      </div>
      <Carousel items={cards} />
    </section>
  );
}
