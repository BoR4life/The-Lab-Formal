import { useScrollProgress } from "@/lib/use-scroll-progress";

type Props = {
  /** Base name in /img, e.g. "still-heart-hero" (uses -sm and -lg .webp). */
  name: string;
  alt: string;
  /** How far it drifts across the scroll, in px. Small numbers read as depth. */
  drift?: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
};

/** A fluid, responsive image that drifts slightly slower than the page. */
export function ParallaxImage({ name, alt, drift = 36, className = "", priority, sizes = "(min-width: 880px) 45vw, 100vw" }: Props) {
  const ref = useScrollProgress<HTMLDivElement>();
  return (
    <div className={`parallax ${className}`} ref={ref} style={{ ["--drift" as string]: `${drift}px` }}>
      <img
        src={`/img/${name}-sm.webp`}
        srcSet={`/img/${name}-sm.webp 800w, /img/${name}-lg.webp 1600w`}
        sizes={sizes}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
      />
    </div>
  );
}
