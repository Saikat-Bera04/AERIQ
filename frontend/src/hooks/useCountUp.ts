"use client";

import { useEffect, useState } from "react";
import { easeCubicInOut, prefersReducedMotion } from "@/lib/motion";

export function useCountUp(
  target: number,
  active: boolean,
  duration = 1600
): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;

    let rafId = 0;
    if (prefersReducedMotion()) {
      rafId = requestAnimationFrame(() => setValue(target));
      return () => cancelAnimationFrame(rafId);
    }

    const start = performance.now();

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = easeCubicInOut(t);
      setValue(target * eased);
      if (t < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        setValue(target);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [target, active, duration]);

  return value;
}
