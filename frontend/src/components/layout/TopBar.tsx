"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, LocateFixed, MapPin, Plus } from "lucide-react";
import {
  AqiBadge,
  CtaSquare,
  FreshnessDot,
  Logo,
} from "@/components/ui-aeriq";
import { MOCK_USER } from "@/mocks/data";
import { formatIST } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useLiveLocation } from "@/hooks/useLiveLocation";

export function TopBar() {
  const [scrolled, setScrolled] = useState(false);
  const [locOpen, setLocOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [query, setQuery] = useState("");

  const {
    location,
    syncing,
    error,
    syncByInput,
    syncBrowserOnce,
    toggleAutoSync,
    catalog,
    syncCoordinates,
  } = useLiveLocation();

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
          <FreshnessDot observedAt={location.observedAt} />
          <span className="hidden sm:inline">{location.city}</span>
          {location.autoSync && (
            <span
              className="w-2 h-2 rounded-full bg-[var(--lime2)] animate-pulse"
              title="Live auto-sync active"
            />
          )}
          <AqiBadge
            category={location.category}
            value={location.aqi}
            className="h-[18px] text-[9.5px] px-1.5"
          />
          <span className="hidden md:inline text-[var(--muted2)]">
            {formatIST(location.syncedAt)}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-[var(--muted)]" />
        </button>

        {locOpen && (
          <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-[320px] rounded-[14px] bg-white border border-[var(--rule)] shadow-xl p-3 z-50 flex flex-col gap-2.5">
            {/* Live tracking toggle */}
            <div className="flex items-center justify-between px-2 py-1.5 rounded-[8px] bg-[var(--paper)] border border-[var(--rule)]">
              <div className="flex flex-col">
                <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-[var(--ink)]">
                  Live auto-sync
                </span>
                <span className="font-mono text-[9px] text-[var(--muted2)]">
                  Rounded ~500 m ({location.lat}, {location.lng})
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={location.autoSync}
                onClick={() => toggleAutoSync(!location.autoSync)}
                className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                  location.autoSync ? "bg-[var(--lime)]" : "bg-[var(--rule)]"
                }`}
              >
                <span
                  className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                    location.autoSync ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Enter city or coordinates to auto-sync */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void syncByInput(query);
                setQuery("");
              }}
              className="flex gap-1.5"
            >
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="City or lat, lng..."
                className="flex-1 h-9 px-2.5 rounded-[6px] bg-[var(--paper)] border border-[var(--rule)] text-[12.5px]"
              />
              <button
                type="submit"
                className="h-9 px-2.5 rounded-[6px] bg-[var(--ink)] text-[var(--lime)] font-mono text-[10px] uppercase cursor-pointer"
              >
                Sync
              </button>
            </form>

            <button
              type="button"
              onClick={syncBrowserOnce}
              disabled={syncing}
              className="flex items-center justify-center gap-2 h-9 rounded-[6px] bg-[var(--lime)] text-[var(--ink)] font-mono text-[10px] tracking-[0.12em] uppercase cursor-pointer hover:bg-[var(--lime2)]"
            >
              <LocateFixed className="w-3.5 h-3.5" />
              {syncing ? "Syncing..." : "Use my current location"}
            </button>

            {error && (
              <p className="font-mono text-[9.5px] text-[var(--aqi-verypoor)]">
                {error}
              </p>
            )}

            <div className="px-1 pt-1 font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--muted2)]">
              Quick cities
            </div>
            <div className="max-h-44 overflow-y-auto flex flex-col gap-0.5">
              {catalog.map((loc) => (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => {
                    void syncCoordinates(loc.lat, loc.lng, { city: loc.city });
                    setLocOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-[8px] text-left hover:bg-[var(--paper)] cursor-pointer",
                    loc.city === location.city && "bg-[var(--paper)]"
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
            </div>

            <Link
              href="/settings#locations"
              onClick={() => setLocOpen(false)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-[8px] border-t border-[var(--rule)] font-mono text-[10.5px] tracking-[0.12em] uppercase text-[var(--ink)] hover:text-[var(--leaf)]"
            >
              <Plus className="w-3.5 h-3.5" />
              Manage locations
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
