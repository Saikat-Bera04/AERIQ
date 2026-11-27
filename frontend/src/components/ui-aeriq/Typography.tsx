"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { clamp, prefersReducedMotion } from "@/lib/motion";
import { useInView } from "@/hooks/useInView";

export function MaskedHeadline({
  children,
  as: Tag = "h1",
  className,
  style,
}: {
  children: React.ReactNode;
  as?: "h1" | "h2";
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <Tag
      className={cn(
        "font-medium tracking-[-0.045em] leading-[0.92]",
        Tag === "h2" && "tracking-[-0.04em] leading-none",
        className
      )}
      style={style}
    >
      <span className="block overflow-hidden pb-[0.06em]">
        <span className="block translate-y-[105%] animate-rise">{children}</span>
      </span>
    </Tag>
  );
}

export function WordReveal({
  text,
  className,
  triggerOnView = true,
  progress,
}: {
  text: string;
  className?: string;
  triggerOnView?: boolean;
  /** Optional external 0..1 progress (e.g. from scroll) */
  progress?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { threshold: 0.15, once: true });
  const [animT, setAnimT] = useState(0);
  const words = text.split(" ");
  const count = words.length;

  useEffect(() => {
    if (progress !== undefined || !triggerOnView || !inView) return;
    if (prefersReducedMotion()) {
      setAnimT(1);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 900);
      setAnimT(t);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, triggerOnView, progress]);

  const t = progress !== undefined ? progress : triggerOnView ? animT : 1;
  const reduced = typeof window !== "undefined" && prefersReducedMotion();

  return (
    <span ref={ref} className={className}>
      {words.map((word, i) => {
        const k = reduced ? 1 : clamp(t * 2.2 - (i / count) * 1.2);
        const opacity = 0.15 + 0.85 * k;
        const blur = (1 - k) * 6;
        return (
          <React.Fragment key={i}>
            <span
              className="inline-block will-change-[opacity,filter]"
              style={{
                opacity,
                filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : undefined,
              }}
            >
              {word}
            </span>
            {i < count - 1 ? " " : ""}
          </React.Fragment>
        );
      })}
    </span>
  );
}
