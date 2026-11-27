// Mossline motion math primitives

export function clamp(v: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, v));
}

export function seg(p: number, a: number, b: number): number {
  if (b === a) return p >= b ? 1 : 0;
  return clamp((p - a) / (b - a));
}

export function easeCubicInOut(t: number): number {
  const c = clamp(t);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

export function smoothProgress(sp: number, p: number, dt: number): number {
  const clampedDt = Math.min(dt, 64);
  const next = sp + (p - sp) * (1 - Math.pow(0.86, clampedDt / 16.7));
  return Math.abs(p - next) < 0.0002 ? p : next;
}

export function lerpPointer(current: number, target: number): number {
  return current + (target - current) * 0.06;
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
