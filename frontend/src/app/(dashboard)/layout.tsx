import React from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Rail } from "@/components/layout/Rail";
import { MobileTabBar } from "@/components/layout/MobileTabBar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--stage)] text-[var(--ink)]">
      <TopBar />
      <Rail />
      <main>{children}</main>
      <MobileTabBar />
    </div>
  );
}
