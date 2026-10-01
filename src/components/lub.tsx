import { useEffect, useRef } from "react";

/**
 * Lub, the small arch-shaped mascot. The eyes follow the pointer (or the last
 * tap). It hops when hovered. Decorative only.
 */
export function Lub({ className = "" }: { className?: string }) {
  const svg = useRef<SVGSVGElement | null>(null);
  const eyes = useRef<SVGGElement[]>([]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) return;
    let raf = 0;
    const look = (x: number, y: number) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const box = svg.current?.getBoundingClientRect();
        if (!box) return;
        const dx = x - (box.left + box.width / 2);
        const dy = y - (box.top + box.height * 0.5);
        const d = Math.hypot(dx, dy) || 1;
        const m = Math.min(1, d / 220) * 2.6;
        eyes.current.forEach((g) => g && (g.style.transform = `translate(${(dx / d) * m}px, ${(dy / d) * m}px)`));
      });
    };
    const onMove = (e: PointerEvent) => look(e.clientX, e.clientY);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
    };
  }, []);

  return (
    <svg ref={svg} className={`lub ${className}`} viewBox="0 0 60 66" role="presentation" aria-hidden="true">
      <path d="M5 62V30a25 25 0 0 1 50 0v32z" className="lub-body" />
      <circle cx="17" cy="42" r="4.2" className="lub-cheek" />
      <circle cx="43" cy="42" r="4.2" className="lub-cheek" />
      <circle cx="21" cy="30" r="7.2" className="lub-eye" />
      <circle cx="39" cy="30" r="7.2" className="lub-eye" />
      <g ref={(el) => { if (el) eyes.current[0] = el; }} className="lub-pupil-g">
        <circle cx="21" cy="30" r="3.3" className="lub-pupil" />
      </g>
      <g ref={(el) => { if (el) eyes.current[1] = el; }} className="lub-pupil-g">
        <circle cx="39" cy="30" r="3.3" className="lub-pupil" />
      </g>
      <path d="M20 50h6l2.5-4 3 8 2.5-4h6" className="lub-mouth" />
    </svg>
  );
}
