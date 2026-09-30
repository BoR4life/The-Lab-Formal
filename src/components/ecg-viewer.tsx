import { useEffect, useState } from "react";

const ZOOMS = [1, 1.75, 2.5, 3.5];

/** The 12-lead, with a full-screen view that zooms and pans. */
export function EcgViewer({ src, title }: { src: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const step = (dir: 1 | -1) => {
    const i = ZOOMS.indexOf(zoom);
    const next = ZOOMS[Math.min(ZOOMS.length - 1, Math.max(0, i + dir))];
    setZoom(next);
  };

  return (
    <>
      <div className="ecg-scroll">
        <button
          type="button"
          className="ecg-frame"
          onClick={() => {
            setZoom(1.75);
            setOpen(true);
          }}
        >
          <img src={src} alt={`12-lead ECG for ${title}. Opens full screen.`} />
        </button>
      </div>
      <p className="fine">Tap the trace for full screen and zoom.</p>
      {open ? (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label="ECG full screen">
          <div className="lb-bar">
            <button type="button" onClick={() => step(-1)} aria-label="Zoom out" disabled={zoom === ZOOMS[0]}>
              −
            </button>
            <span className="lb-zoom">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Zoom in"
              disabled={zoom === ZOOMS[ZOOMS.length - 1]}
            >
              +
            </button>
            <button type="button" className="lb-close" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
          <div className="lb-stage">
            <img src={src} alt={`12-lead ECG for ${title}, zoomed`} style={{ width: `${zoom * 100}%` }} />
          </div>
        </div>
      ) : null}
    </>
  );
}
