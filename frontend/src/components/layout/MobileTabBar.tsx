"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageCircle,
  CalendarClock,
  Route,
  MoreHorizontal,
  Users,
  Home,
  MapPin,
  Settings,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PRIMARY_TABS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/assistant", label: "Assistant", icon: MessageCircle },
  { href: "/planner", label: "Planner", icon: CalendarClock },
  { href: "/simulator", label: "Simulator", icon: Route },
];

const MORE_TABS = [
  { href: "/family", label: "Family", icon: Users },
  { href: "/indoor-air", label: "Indoor air", icon: Home },
  { href: "/community", label: "Community", icon: MapPin },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MobileTabBar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-3 left-3 right-3 z-50 h-16 rounded-[20px] bg-[var(--glass-light)] backdrop-blur-[16px] border border-[var(--rule)] shadow-lg grid grid-cols-5 items-center px-2"
      >
        {PRIMARY_TABS.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              className="flex flex-col items-center justify-center gap-0.5 min-h-[44px]"
            >
              <span
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  active ? "bg-[var(--lime)] text-[var(--ink)]" : "text-[var(--ink2)]"
                )}
              >
                <Icon className="w-[18px] h-[18px]" />
              </span>
              <span className="font-mono text-[8.5px] tracking-[0.08em] uppercase text-[var(--ink)]">
                {item.label}
              </span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-label="More pages"
          className="flex flex-col items-center justify-center gap-0.5 min-h-[44px] cursor-pointer"
        >
          <span className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--ink2)]">
            <MoreHorizontal className="w-[18px] h-[18px]" />
          </span>
          <span className="font-mono text-[8.5px] tracking-[0.08em] uppercase text-[var(--ink)]">
            More
          </span>
        </button>
      </nav>

      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-end">
          <div className="w-full bg-white rounded-t-[22px] p-6 pb-8 flex flex-col gap-3">
            <div className="flex items-center justify-between mb-2">
              <span className="mono text-[var(--muted2)]">More pages</span>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="w-9 h-9 rounded-full bg-[var(--paper)] flex items-center justify-center cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {MORE_TABS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-[12px] bg-[var(--paper)] border border-[var(--rule)] text-[15px] font-medium"
                >
                  <Icon className="w-5 h-5 text-[var(--leaf)]" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
