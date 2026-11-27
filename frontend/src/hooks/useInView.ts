"use client";

import { useEffect, useState, RefObject } from "react";

export function useInView(
  ref: RefObject<Element | null>,
  options?: IntersectionObserverInit & { once?: boolean }
): boolean {
  const [inView, setInView] = useState(false);
  const once = options?.once ?? true;
  const threshold = options?.threshold ?? 0.2;
  const rootMargin = options?.rootMargin ?? "0px";

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, once, threshold, rootMargin]);

  return inView;
}
