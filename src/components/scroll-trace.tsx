import { useEffect, useMemo, useRef, useState } from "react";
import { useScrollProgress } from "@/lib/use-scroll-progress";

/**
 * A lead II rhythm strip that draws itself as it scrolls through the screen.
 * The wordmark's red full stop rides the tip of the trace.
 */

const H = 180;
const BASE = 118;

/** One PQRST complex starting at x, roughly 0.8 s wide at 25 mm/s scaled. */
function beat(x: number): string {
  const p = [
    `L ${x + 40} ${BASE}`,
    `C ${x + 50} ${BASE} ${x + 54} ${BASE - 14} ${x + 62} ${BASE - 14}`,
    `C ${x + 70} ${BASE - 14} ${x + 74} ${BASE} ${x + 84} ${BASE}`,
    `L ${x + 104} ${BASE}`,
    `L ${x + 110} ${BASE + 10}`,
    `L ${x + 122} ${BASE - 96}`,
    `L ${x + 134} ${BASE + 26}`,
    `L ${x + 142} ${BASE}`,
    `L ${x + 172} ${BASE - 2}`,
    `C ${x + 186} ${BASE - 4} ${x + 196} ${BASE - 30} ${x + 212} ${BASE - 30}`,
    `C ${x + 228} ${BASE - 30} ${x + 236} ${BASE} ${x + 256} ${BASE}`,
  ];
  return p.join(" ");
}

function stripPath(W: number): string {
  // Flat line first: the page opens on a quiet baseline, then the rhythm starts.
  const lead = W > 800 ? 150 : 60;
  let d = `M 0 ${BASE} L ${lead} ${BASE}`;
  for (let x = lead; x + 256 <= W; x += 300) d += " " + beat(x);
  return d + ` L ${W} ${BASE}`;
}

export function ScrollTrace({ caption }: { caption: string }) {
  // Phones get two beats at a readable size; wider screens get four.
  const [W, setW] = useState(1200);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 700px)");
    const apply = () => setW(mq.matches ? 640 : 1200);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);
  const d = useMemo(() => stripPath(W), [W]);
  const pathRef = useRef<SVGPathElement | null>(null);
  const dotRef = useRef<SVGCircleElement | null>(null);

  const ref = useScrollProgress<HTMLDivElement>((p) => {
    const path = pathRef.current;
    const dot = dotRef.current;
    if (!path || !dot) return;
    // Draw across the middle of the band's journey, so it finishes on screen.
    const t = Math.min(1, Math.max(0, (p - 0.12) / 0.6));
    path.style.strokeDashoffset = String(1 - t);
    const len = path.getTotalLength();
    const pt = path.getPointAtLength(len * t);
    dot.setAttribute("cx", pt.x.toFixed(1));
    dot.setAttribute("cy", pt.y.toFixed(1));
  });

  return (
    <div className="trace-band" ref={ref}>
      <svg className="trace-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <path ref={pathRef} d={d} pathLength={1} className="trace-path" />
        <circle ref={dotRef} r={7} cx={0} cy={BASE} className="trace-dot" />
      </svg>
      <p className="trace-caption">{caption}</p>
    </div>
  );
}
