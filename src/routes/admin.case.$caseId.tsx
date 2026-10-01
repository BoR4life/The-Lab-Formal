import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { KeyEditor } from "@/components/key-editor";
import { SiteHeader } from "@/components/site-header";
import { adminGetCase, adminSaveCase, adminSetImage } from "@/lib/lab/admin";
import type { EditableCase } from "@/lib/lab/admin.server";
import { SCORED_STEP_IDS, STEPS, type StepId } from "@/lib/lab/ecg";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/admin/case/$caseId")({ component: Editor });

/** Shrink a photographed ECG to something that loads fast, in the browser. */
async function prepare(file: File): Promise<{ type: string; base64: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const url = canvas.toDataURL("image/jpeg", 0.86);
  return { type: "image/jpeg", base64: url.split(",")[1] };
}

function Editor() {
  const { caseId } = Route.useParams();
  const { user, isPending } = useCurrentUserState();
  const [c, setC] = useState<EditableCase | null>(null);
  const [state, setState] = useState<"loading" | "denied" | "missing" | "ready">("loading");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isPending) return;
    if (!user) return setState("denied");
    adminGetCase({ data: { caseId } })
      .then((r) => {
        if (!r) return setState("missing");
        setC(r);
        setState("ready");
      })
      .catch(() => setState("denied"));
  }, [caseId, user, isPending]);

  if (state !== "ready" || !c) {
    return (
      <>
        <SiteHeader />
        <main className="wrap narrow prose">
          <p>{state === "loading" ? "Loading" : state === "missing" ? "No such case." : "Admins only. Sign in as the site owner."}</p>
        </main>
      </>
    );
  }

  const up = <K extends keyof EditableCase>(k: K, v: EditableCase[K]) => setC({ ...c, [k]: v });

  async function save() {
    if (!c) return;
    setBusy(true);
    setNote("");
    try {
      await adminSaveCase({ data: { c } });
      setNote("Saved.");
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function upload(file: File | undefined) {
    if (!file || !c) return;
    setBusy(true);
    setNote("");
    try {
      const img = await prepare(file);
      const r = await adminSetImage({ data: { caseId: c.id, contentType: img.type, base64: img.base64 } });
      setC({ ...c, ecgImage: r.url });
      setNote("Image saved.");
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Could not upload");
    } finally {
      setBusy(false);
    }
  }

  const toggleStep = (id: StepId) =>
    up("scoredSteps", c.scoredSteps.includes(id) ? c.scoredSteps.filter((s) => s !== id) : [...c.scoredSteps, id]);

  return (
    <>
      <SiteHeader />
      <main className="wrap editor">
        <p><Link to="/admin">Back to admin</Link></p>
        <h1 className="h-page">Edit {c.title || "case"}</h1>

        <section className="card">
          <h2 className="card-label">The case</h2>
          <label className="field"><span>Title</span><input value={c.title} onChange={(e) => up("title", e.target.value)} /></label>
          <label className="field">
            <span>Case number</span>
            <input type="number" min={1} value={c.caseNumber} onChange={(e) => up("caseNumber", Number(e.target.value) || 1)} />
          </label>
          <label className="field">
            <span>Patient details (one fact per line)</span>
            <textarea rows={5} value={c.vignette} onChange={(e) => up("vignette", e.target.value)} />
          </label>
          <label className="check">
            <input type="checkbox" checked={c.chestPain} onChange={(e) => up("chestPain", e.target.checked)} />
            <span>Chest pain presentation</span>
          </label>
        </section>

        <section className="card">
          <h2 className="card-label">ECG image</h2>
          {c.ecgImage ? <img className="editor-ecg" src={c.ecgImage} alt="Current ECG" /> : <p className="fine">No image yet.</p>}
          <label className="field">
            <span>Upload a photo or scan (JPEG, PNG or WebP). Crop out any header first.</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => upload(e.target.files?.[0])} disabled={busy} />
          </label>
          <label className="check">
            <input type="checkbox" checked={c.consentConfirmed} onChange={(e) => up("consentConfirmed", e.target.checked)} />
            <span>This trace has no name, MRN, date of birth, hospital or machine header, and I have permission to publish it.</span>
          </label>
          <label className="field">
            <span>Provenance note</span>
            <textarea rows={2} value={c.provenance} onChange={(e) => up("provenance", e.target.value)} />
          </label>
        </section>

        <section className="card">
          <h2 className="card-label">Answer key</h2>
          <KeyEditor value={c.answerKey} onChange={(a) => up("answerKey", a)} />
          <fieldset className="field">
            <legend>Steps that are scored</legend>
            <div className="lead-grid">
              {SCORED_STEP_IDS.map((id) => (
                <label key={id} className="check">
                  <input type="checkbox" checked={c.scoredSteps.includes(id)} onChange={() => toggleStep(id)} />
                  <span>{STEPS.find((s) => s.id === id)?.title}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </section>

        <section className="card">
          <h2 className="card-label">Teaching</h2>
          {STEPS.filter((s) => s.id !== "impression").map((s) => (
            <label className="field" key={s.id}>
              <span>Why: {s.title}</span>
              <textarea
                rows={2}
                value={c.stepReasons[s.id] ?? ""}
                onChange={(e) => up("stepReasons", { ...c.stepReasons, [s.id]: e.target.value })}
              />
            </label>
          ))}
          <label className="field"><span>Model impression</span><textarea rows={3} value={c.modelImpression} onChange={(e) => up("modelImpression", e.target.value)} /></label>
          <label className="field"><span>Teaching point</span><textarea rows={3} value={c.teachingPoint} onChange={(e) => up("teachingPoint", e.target.value)} /></label>
          <label className="field"><span>Learning outcomes</span><textarea rows={3} value={c.learningOutcomes} onChange={(e) => up("learningOutcomes", e.target.value)} /></label>
          <label className="field"><span>Author</span><input value={c.author} onChange={(e) => up("author", e.target.value)} /></label>
          <label className="field"><span>Verified by</span><input value={c.verifiedBy} onChange={(e) => up("verifiedBy", e.target.value)} /></label>
        </section>

        <section className="card">
          <h2 className="card-label">Status</h2>
          <label className="field">
            <span>Draft hides it from learners. Open takes new reads. Closed and Feedback keep it visible without new reads.</span>
            <select value={c.status} onChange={(e) => up("status", e.target.value as EditableCase["status"])}>
              <option value="draft">Draft</option>
              <option value="open">Open</option>
              <option value="feedback">Feedback only</option>
              <option value="closed">Closed</option>
            </select>
          </label>
          {note ? <p className={note === "Saved." || note === "Image saved." ? "fine" : "warn"} role="status">{note}</p> : null}
          <div className="row-actions">
            <button type="button" className="btn" onClick={save} disabled={busy}>{busy ? "Working" : "Save"}</button>
            <Link className="btn secondary" to="/case/$caseId" params={{ caseId: c.id }}>Preview as learner</Link>
          </div>
        </section>
      </main>
    </>
  );
}
