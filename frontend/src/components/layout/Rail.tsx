"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageCircle,
  CalendarClock,
  Users,
  Home,
  Route,
  MapPin,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/assistant", label: "Assistant", icon: MessageCircle },
  { href: "/planner", label: "Planner", icon: CalendarClock },
  { href: "/family", label: "Family", icon: Users },
  { href: "/indoor-air", label: "Indoor air", icon: Home },
  { href: "/simulator", label: "Simulator", icon: Route },
  { href: "/community", label: "Community", icon: MapPin },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Rail() {
  const pathname = usePathname();

  return (
    <aside
      aria-label="Primary navigation"
      className="hidden md:flex fixed left-[18px] top-1/2 -translate-y-1/2 z-40 w-[56px] rounded-[28px] bg-[var(--glass-light)] backdrop-blur-[14px] border border-[var(--rule)] py-[10px] flex-col items-center gap-2"
    >
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.label}
            aria-current={active ? "page" : undefined}
            className="group relative flex items-center justify-center w-9 h-9 rounded-full"
          >
            <span
              className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center transition-colors",
                active
                  ? "bg-[var(--lime)] text-[var(--ink)]"
                  : "text-[var(--ink2)] hover:bg-white/60 hover:text-[var(--ink)]"
              )}
            >
              <Icon className="w-[18px] h-[18px]" strokeWidth={1.8} />
            </span>

            <span className="pointer-events-none opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 absolute left-[52px] px-2.5 py-1 rounded-[6px] bg-[var(--glass-light)] backdrop-blur-[14px] border border-[var(--rule)] font-mono text-[10.5px] tracking-[0.12em] uppercase text-[var(--ink)] whitespace-nowrap shadow-sm">
              {item.label}
            </span>
          </Link>
        );
      })}
    </aside>
  );
}
