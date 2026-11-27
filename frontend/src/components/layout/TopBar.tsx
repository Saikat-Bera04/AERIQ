"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, MapPin, Plus } from "lucide-react";
import {
  AqiBadge,
  CtaSquare,
  FreshnessDot,
  Logo,
} from "@/components/ui-aeriq";
import { MOCK_LOCATIONS, MOCK_USER } from "@/mocks/data";
import { formatIST } from "@/lib/format";
import { cn } from "@/lib/utils";

export function TopBar() {
  const [scrolled, setScrolled] = useState(false);
  const [locOpen, setLocOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [selectedLocId, setSelectedLocId] = useState(MOCK_LOCATIONS[0].id);

  const currentLoc =
    MOCK_LOCATIONS.find((l) => l.id === selectedLocId) ?? MOCK_LOCATIONS[0];

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 grid grid-cols-[1fr_auto_1fr] items-center px-[18px] py-[16px] md:px-[34px] md:py-[22px] transition-all duration-300",
        scrolled
          ? "bg-[var(--glass-light)] backdrop-blur-[14px] border-b border-[var(--rule)]"
          : "bg-transparent border-b border-transparent"
      )}
    >
      <Link href="/dashboard" className="justify-self-start">
        <Logo />
      </Link>

      {/* Centre location pill */}
      <div className="relative justify-self-center">
        <button
          type="button"
          onClick={() => {
            setLocOpen((v) => !v);
            setUserOpen(false);
          }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--glass-light)] backdrop-blur-[14px] border border-[var(--rule)] font-mono text-[11px] tracking-[0.14em] uppercase text-[var(--ink)] cursor-pointer hover:border-[var(--ink2)] transition-colors"
          aria-expanded={locOpen}
        >
          <FreshnessDot observedAt={currentLoc.observedAt} />
          <span className="hidden sm:inline">{currentLoc.city}</span>
          <AqiBadge
            category={currentLoc.category}
            value={currentLoc.aqi}
            className="h-[18px] text-[9.5px] px-1.5"
          />
          <span className="hidden md:inline text-[var(--muted2)]">
            {formatIST(currentLoc.observedAt)}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-[var(--muted)]" />
        </button>

        {locOpen && (
          <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-[280px] rounded-[12px] bg-white border border-[var(--rule)] shadow-xl p-2 z-50">
            <div className="px-2 py-1 font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--muted2)]">
              Saved locations
            </div>
            {MOCK_LOCATIONS.map((loc) => (
              <button
                key={loc.id}
                type="button"
                onClick={() => {
                  setSelectedLocId(loc.id);
                  setLocOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-[8px] text-left hover:bg-[var(--paper)] cursor-pointer",
                  loc.id === currentLoc.id && "bg-[var(--paper)]"
                )}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <MapPin className="w-3.5 h-3.5 text-[var(--leaf)] shrink-0" />
                  <span className="truncate text-[13px] font-medium">
                    {loc.city}
                  </span>
                </span>
                <AqiBadge category={loc.category} value={loc.aqi} />
              </button>
            ))}
            <Link
              href="/settings#locations"
              onClick={() => setLocOpen(false)}
              className="mt-1 flex items-center gap-2 px-2.5 py-2 rounded-[8px] border-t border-[var(--rule)] font-mono text-[10.5px] tracking-[0.12em] uppercase text-[var(--ink)] hover:text-[var(--leaf)]"
            >
              <Plus className="w-3.5 h-3.5" />
              Add location
            </Link>
          </div>
        )}
      </div>

      {/* Right actions */}
      <div className="justify-self-end flex items-center gap-4">
        <div className="hidden sm:block">
          <CtaSquare label="Ask AERIQ" href="/assistant" />
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setUserOpen((v) => !v);
              setLocOpen(false);
            }}
            className="w-8 h-8 rounded-full bg-[var(--ink)] text-[var(--lime)] font-mono text-[11px] font-medium inline-flex items-center justify-center cursor-pointer"
            aria-label="Account menu"
            aria-expanded={userOpen}
          >
            {MOCK_USER.initials}
          </button>

          {userOpen && (
            <div className="absolute right-0 mt-2 w-44 rounded-[12px] bg-white border border-[var(--rule)] shadow-xl p-1.5 z-50 flex flex-col">
              <div className="px-2.5 py-1.5 border-b border-[var(--rule)] mb-1">
                <p className="text-[13px] font-medium truncate">
                  {MOCK_USER.fullName}
                </p>
                <p className="font-mono text-[10px] text-[var(--muted2)] truncate">
                  {MOCK_USER.email}
                </p>
              </div>
              <Link
                href="/settings"
                onClick={() => setUserOpen(false)}
                className="px-2.5 py-2 rounded-[8px] text-[13px] hover:bg-[var(--paper)]"
              >
                Settings
              </Link>
              <Link
                href="/login"
                onClick={() => setUserOpen(false)}
                className="px-2.5 py-2 rounded-[8px] text-[13px] text-[var(--aqi-verypoor)] hover:bg-[var(--paper)]"
              >
                Sign out
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
