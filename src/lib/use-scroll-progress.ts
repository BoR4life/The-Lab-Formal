import { useEffect, useRef } from "react";

/**
 * Tracks how far an element has travelled through the viewport (0 when its top
 * meets the bottom of the screen, 1 when its bottom meets the top) and writes it
 * to the element as the CSS variable --p. No React re-renders: one rAF per
 * scroll frame. Reduced motion pins --p to 1 so drawings show complete.
 */
export function useScrollProgress<T extends HTMLElement>(onProgress?: (p: number) => void) {
  const ref = useRef<T | null>(null);
  const cb = useRef(onProgress);
  cb.current = onProgress;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    const update = () => {
      frame = 0;
      let p = 1;
      if (!reduce.matches) {
        const r = el.getBoundingClientRect();
        const vh = window.innerHeight || 1;
        p = (vh - r.top) / (vh + r.height);
        p = Math.min(1, Math.max(0, p));
      }
      el.style.setProperty("--p", p.toFixed(4));
      cb.current?.(p);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    reduce.addEventListener?.("change", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      reduce.removeEventListener?.("change", schedule);
    };
  }, []);

  return ref;
}
