import { useEffect, useState } from "react";

const ZOOMS = [1, 1.75, 2.5, 3.5];

type Props = {
  src: string;
  title: string;
  /** Optional control from outside, so other parts of the page can open it. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/** The 12-lead, with a full-screen view that zooms and pans. */
export function EcgViewer({ src, title, open: openProp, onOpenChange }: Props) {
  const [openLocal, setOpenLocal] = useState(false);
  const open = openProp ?? openLocal;
  const setOpen = (v: boolean) => {
    setOpenLocal(v);
    onOpenChange?.(v);
  };
  const [zoom, setZoom] = useState(1.75);

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
          onClick={() => setOpen(true)}
        >
          <img src={src} alt={`12-lead ECG for ${title}. Opens full screen.`} />
        </button>
      </div>
      <p className="fine">Tap the trace to open it full screen and zoom in.</p>
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
          <p className="lb-hint">Turn your phone sideways to see the whole trace.</p>
          <div className="lb-stage">
            <img src={src} alt={`12-lead ECG for ${title}, zoomed`} style={{ width: `${zoom * 100}%` }} />
          </div>
        </div>
      ) : null}
    </>
  );
}
