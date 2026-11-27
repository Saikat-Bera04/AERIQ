import React from "react";
import { cn } from "@/lib/utils";

export type ChipVariant = "lime" | "ink" | "ghost";

export function Chip({
  children,
  variant = "lime",
  className,
}: {
  children: React.ReactNode;
  variant?: ChipVariant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "chip",
        variant === "ink" && "chip--ink",
        variant === "ghost" && "chip--ghost",
        className
      )}
    >
      {children}
    </span>
  );
}

export function MonoLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={cn("mono", className)}>{children}</span>;
}
