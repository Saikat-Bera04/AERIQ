"use client";

import { useEffect, RefObject } from "react";
import {
  clamp,
  lerpPointer,
  prefersReducedMotion,
  smoothProgress,
} from "@/lib/motion";

export interface RafFrameState {
  /** Raw scroll progress 0..1 */
  p: number;
  /** Smoothed scroll progress 0..1 */
  sp: number;
  /** Smoothed pointer X (-0.5..0.5) */
  sx: number;
  /** Smoothed pointer Y (-0.5..0.5) */
  sy: number;
  /** Viewport width */
  W: number;
  /** Viewport height */
  H: number;
  /** Delta time in ms */
  dt: number;
}

export function useRafScroll(
  ref: RefObject<HTMLElement | null>,
  onFrame: (state: RafFrameState) => void,
  enabled = true
) {
  useEffect(() => {
    if (!enabled) return;
    const reduced = prefersReducedMotion();

    let sp = 0;
    let mx = 0;
    let my = 0;
    let sx = 0;
    let sy = 0;
    let last = performance.now();
    let rafId = 0;
    let running = !document.hidden;

    const onPointerMove = (e: PointerEvent) => {
      if (reduced) return;
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      mx = e.clientX / w - 0.5;
      my = e.clientY / h - 0.5;
    };

    const tick = (now: number) => {
      if (!running) return;
      const dt = Math.min(now - last, 64);
      last = now;

      const el = ref.current;
      const W = window.innerWidth;
      const H = window.innerHeight;
      let p = 0;

      if (el) {
        const rect = el.getBoundingClientRect();
        const denom = Math.max(1, el.offsetHeight - H);
        p = clamp(-rect.top / denom);
      }

      if (reduced) {
        sp = p;
        sx = 0;
        sy = 0;
      } else {
        sp = smoothProgress(sp, p, dt);
        sx = lerpPointer(sx, mx);
        sy = lerpPointer(sy, my);
      }

      onFrame({ p, sp, sx, sy, W, H, dt });
      rafId = requestAnimationFrame(tick);
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(rafId);
      } else {
        running = true;
        last = performance.now();
        rafId = requestAnimationFrame(tick);
      }
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    if (running) {
      rafId = requestAnimationFrame(tick);
    }

    return () => {
      running = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [ref, onFrame, enabled]);
}
