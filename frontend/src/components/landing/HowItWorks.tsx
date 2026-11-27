"use client";

import React, { useRef } from "react";
import { Chip } from "@/components/ui-aeriq";
import { useInView } from "@/hooks/useInView";
import { prefersReducedMotion } from "@/lib/motion";

const STEPS = [
  { index: "01", title: "Register", desc: "Create your account in seconds" },
  {
    index: "02",
    title: "Choose location & lifestyle",
    desc: "Pick your city, transport and routine",
  },
  {
    index: "03",
    title: "View environmental dashboard",
    desc: "Live CPCB & station readings with time",
  },
  {
    index: "04",
    title: "Receive Gemini recommendations",
    desc: "Plain-language advice grounded in data",
  },
  {
    index: "05",
    title: "Review daily planner & indoor coach",
    desc: "Time outdoor hours & home ventilation",
  },
  {
    index: "06",
    title: "Compare alternatives in simulator",
    desc: "See CO₂e impact with clear assumptions",
  },
  {
    index: "07",
    title: "Track actions & community reports",
    desc: "Log observations & check local pins",
  },
];

export function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { threshold: 0.2, once: true });
  const reduced = typeof window !== "undefined" && prefersReducedMotion();

  return (
    <section
      id="how"
      ref={ref}
      className="bg-white px-[18px] md:px-[34px] pb-[80px] pt-4"
    >
      <div className="max-w-7xl mx-auto">
        <Chip>How it works</Chip>
        <h2 className="text-[clamp(30px,3.6vw,54px)] font-medium tracking-[-0.04em] leading-none text-[var(--ink)] max-w-[680px] mt-5 mb-12">
          Seven steps from sign-up to cleaner choices
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
          {STEPS.map((step, i) => (
            <div
              key={step.index}
              className="relative bg-[var(--paper)] border border-[var(--rule)] rounded-[12px] p-4 flex flex-col justify-between min-h-[156px] overflow-hidden"
            >
              {/* Lime 2px top rule drawing left to right */}
              <div
                className="absolute top-0 left-0 right-0 h-[2px] bg-[var(--lime2)] origin-left transition-transform duration-700 ease-out"
                style={{
                  transform:
                    inView || reduced ? "scaleX(1)" : "scaleX(0)",
                  transitionDelay: reduced ? "0ms" : `${i * 70}ms`,
                }}
                aria-hidden="true"
              />
              <span className="mono text-[var(--muted2)]">{step.index}</span>
              <div className="mt-4">
                <h3 className="text-[15px] font-medium tracking-[-0.02em] leading-[1.2] text-[var(--ink)]">
                  {step.title}
                </h3>
                <p className="text-[12.5px] leading-[1.4] text-[var(--muted)] mt-1.5">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
