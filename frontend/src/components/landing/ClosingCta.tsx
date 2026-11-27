"use client";

import React from "react";
import Link from "next/link";
import { Chip, Mist } from "@/components/ui-aeriq";

export function ClosingCta() {
  return (
    <div className="bg-white pt-4 pb-[34px] px-[18px] md:px-[34px]">
      <section className="relative overflow-hidden bg-[var(--ink)] rounded-[22px] px-6 md:px-[34px] py-[80px] max-w-7xl mx-auto text-white">
        <Mist opacity={0.3} />
        <div className="relative z-10 max-w-2xl">
          <Chip>Start free</Chip>
          <h2 className="text-[clamp(30px,3.6vw,54px)] font-medium tracking-[-0.04em] leading-none text-white mt-5">
            Check the air before you step out
          </h2>
          <div className="flex flex-wrap items-center gap-3 mt-8">
            <Link
              href="/register"
              className="inline-flex items-center justify-center h-12 px-6 rounded-[8px] bg-[var(--lime)] text-[var(--ink)] font-mono text-[11.5px] tracking-[0.14em] uppercase font-medium hover:bg-[var(--lime2)] transition-colors"
            >
              Create your profile
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center h-12 px-6 rounded-[8px] border border-white/25 text-white font-mono text-[11.5px] tracking-[0.14em] uppercase hover:border-white/50 transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      <footer className="max-w-7xl mx-auto mt-8 flex flex-col gap-3 font-mono text-[10.5px] tracking-[0.12em] uppercase text-[var(--muted2)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span>© 2026 AERIQ · Intelligence for Every Breath</span>
          <div className="flex items-center gap-6">
            <a href="#sol" className="hover:text-[var(--ink)]">
              Data sources
            </a>
            <a href="#how" className="hover:text-[var(--ink)]">
              Privacy
            </a>
            <a href="#app" className="hover:text-[var(--ink)]">
              Terms
            </a>
          </div>
        </div>
        <p className="normal-case tracking-normal text-[11px] text-[var(--muted)]">
          AERIQ supports informed decisions. It does not diagnose health
          conditions or guarantee protection.
        </p>
      </footer>
    </div>
  );
}
