"use client";

import React, { useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { prefersReducedMotion } from "@/lib/motion";

export function WobbleCard({
  children,
  containerClassName,
  className,
}: {
  children: React.ReactNode;
  containerClassName?: string;
  className?: string;
}) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = (event: React.MouseEvent<HTMLElement>) => {
    if (prefersReducedMotion()) return;
    const { clientX, clientY } = event;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (clientX - (rect.left + rect.width / 2)) / 20;
    const y = (clientY - (rect.top + rect.height / 2)) / 20;
    setMousePosition({ x, y });
  };

  return (
    <motion.section
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => {
        setIsHovering(false);
        setMousePosition({ x: 0, y: 0 });
      }}
      style={{
        transform:
          isHovering && !prefersReducedMotion()
            ? `translate3d(${mousePosition.x}px, ${mousePosition.y}px, 0) scale3d(1, 1, 1)`
            : "translate3d(0px, 0px, 0) scale3d(1, 1, 1)",
        transition: "transform 0.1s ease-out",
      }}
      className={cn(
        "mx-auto w-full relative rounded-[16px] overflow-hidden",
        containerClassName
      )}
    >
      <div
        className="relative h-full [background-image:radial-gradient(88%_100%_at_top,rgba(255,255,255,0.22),rgba(255,255,255,0))] sm:mx-0 sm:rounded-[16px] overflow-hidden"
        style={{
          boxShadow:
            "0 10px 32px rgba(16, 41, 26, 0.12), 0 1px 1px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(255, 255, 255, 0.08)",
        }}
      >
        <motion.div
          style={{
            transform:
              isHovering && !prefersReducedMotion()
                ? `translate3d(${-mousePosition.x}px, ${-mousePosition.y}px, 0) scale3d(1.03, 1.03, 1)`
                : "translate3d(0px, 0px, 0) scale3d(1, 1, 1)",
            transition: "transform 0.1s ease-out",
          }}
          className={cn("h-full px-6 py-12 sm:px-10", className)}
        >
          <Noise />
          {children}
        </motion.div>
      </div>
    </motion.section>
  );
}

function Noise() {
  return (
    <div
      className="absolute inset-0 w-full h-full scale-[1.2] transform opacity-10 pointer-events-none"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        backgroundSize: "180px 180px",
      }}
      aria-hidden="true"
    />
  );
}
