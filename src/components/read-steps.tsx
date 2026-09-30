import {
  type Answers,
  type ChoiceGroup,
  type StepId,
  CHOICES,
  LEADS,
  STEPS,
  describeStep,
  prBand,
  PR_BAND_LABEL,
  qtcBand,
  QTC_BAND_LABEL,
  stepComplete,
} from "@/lib/lab/ecg";

type Props = {
  answers: Answers;
  onChange: (next: Answers) => void;
  index: number;
  onIndex: (i: number) => void;
  onSubmit: () => void;
  submitting: boolean;
  submitLabel: string;
  error: string;
  saveNote: string;
  /** Opens the full-screen ECG without leaving the step. */
  onShowEcg: () => void;
};

function Choices({
  group,
  value,
  onPick,
}: {
  group: ChoiceGroup;
  value: string;
  onPick: (v: string) => void;
}) {
  return (
    <div className="choices" role="radiogroup">
      {CHOICES[group].map(([v, label]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          className="choice"
          onClick={() => onPick(v)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function LeadPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="leads" role="group" aria-label="Leads">
      {LEADS.map((l) => {
        const on = value.includes(l);
        return (
          <button
            key={l}
            type="button"
            className="lead"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((x) => x !== l) : [...value, l])}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}

function StepBody({ id, a, set }: { id: StepId; a: Answers; set: (patch: Partial<Answers>) => void }) {
  switch (id) {
    case "rate":
      return <Choices group="rate" value={a.rate} onPick={(v) => set({ rate: v })} />;
    case "rhythm":
      return <Choices group="rhythm" value={a.rhythm} onPick={(v) => set({ rhythm: v })} />;
    case "axis":
      return <Choices group="axis" value={a.axis} onPick={(v) => set({ axis: v })} />;
    case "p":
      return <Choices group="pWaves" value={a.pWaves} onPick={(v) => set({ pWaves: v })} />;
    case "pr": {
      const band = prBand(a.pr);
      return (
        <>
          <label className="field">
            <span>PR interval in seconds</span>
            <input
              inputMode="decimal"
              value={a.pr}
              onChange={(e) => set({ pr: e.target.value.replace(/[^0-9.]/g, "").slice(0, 5) })}
              placeholder="e.g. 0.16"
            />
            {band ? (
              <span className="fine">
                {PR_BAND_LABEL[band]} (normal is 0.12 to 0.20 s, three to five small squares)
              </span>
            ) : a.pr ? (
              <span className="fine">Enter seconds, between 0.06 and 0.60.</span>
            ) : null}
          </label>
          <p className="sub-q">Is the PR segment sloped?</p>
          <Choices group="prSloped" value={a.prSloped} onPick={(v) => set({ prSloped: v })} />
        </>
      );
    }
    case "qrs":
      return (
        <>
          <Choices group="qrs" value={a.qrs} onPick={(v) => set({ qrs: v })} />
          <p className="sub-q">R-wave progression across V1 to V6</p>
          <Choices group="rProg" value={a.rProg} onPick={(v) => set({ rProg: v })} />
        </>
      );
    case "q":
      return (
        <>
          <Choices
            group="qWave"
            value={a.qWave}
            onPick={(v) => set({ qWave: v, qLeads: v === "none" ? [] : a.qLeads })}
          />
          {a.qWave === "pathological" ? (
            <>
              <p className="sub-q">Which leads?</p>
              <LeadPicker value={a.qLeads} onChange={(v) => set({ qLeads: v })} />
            </>
          ) : null}
        </>
      );
    case "st":
      return (
        <>
          <Choices
            group="st"
            value={a.st}
            onPick={(v) => set(v === "none" ? { st: v, stLeads: [], reciprocal: "" } : { st: v })}
          />
          {a.st && a.st !== "none" ? (
            <>
              <p className="sub-q">Which leads?</p>
              <LeadPicker value={a.stLeads} onChange={(v) => set({ stLeads: v })} />
              <p className="sub-q">Reciprocal change?</p>
              <Choices group="reciprocal" value={a.reciprocal} onPick={(v) => set({ reciprocal: v })} />
            </>
          ) : null}
          {a.st === "elevation" ? (
            <p className="safety">
              In a real patient, ST elevation means escalating now, following your local chest pain or STEMI
              pathway. Don't wait to finish the read.
            </p>
          ) : null}
        </>
      );
    case "t":
      return <Choices group="tWaves" value={a.tWaves} onPick={(v) => set({ tWaves: v })} />;
    case "qtc": {
      const band = qtcBand(a.qtc);
      return (
        <label className="field">
          <span>QTc in ms (200 to 800)</span>
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            value={a.qtc}
            onChange={(e) => set({ qtc: e.target.value.replace(/[^0-9]/g, "").slice(0, 3) })}
            placeholder="e.g. 440"
          />
          {band ? <span className="fine">Band: {QTC_BAND_LABEL[band]}</span> : null}
        </label>
      );
    }
    case "impression":
      return (
        <label className="field">
          <span>Your impression, in a sentence or two</span>
          <textarea
            rows={4}
            value={a.impression}
            maxLength={2000}
            onChange={(e) => set({ impression: e.target.value })}
            placeholder="Rhythm, key findings, and what you would do next."
          />
        </label>
      );
  }
}

export function ReadSteps(props: Props) {
  const { answers, onChange, index, onIndex } = props;
  const total = STEPS.length;
  const reviewing = index >= total;
  const set = (patch: Partial<Answers>) => onChange({ ...answers, ...patch });
  const done = STEPS.filter((s) => stepComplete(s.id, answers)).length;

  return (
    <section className="read card" aria-labelledby="read-title">
      <nav className="step-dots" aria-label="Steps">
        {STEPS.map((s, i) => {
          const complete = stepComplete(s.id, answers);
          return (
            <button
              key={s.id}
              type="button"
              className={`dot${complete ? " done" : ""}${i === index ? " here" : ""}`}
              aria-label={`${s.title}${complete ? ", answered" : ""}`}
              aria-current={i === index ? "step" : undefined}
              onClick={() => onIndex(i)}
            />
          );
        })}
        <button
          type="button"
          className={`dot review-dot${reviewing ? " here" : ""}`}
          aria-label="Check and submit"
          aria-current={reviewing ? "step" : undefined}
          onClick={() => onIndex(total)}
        />
      </nav>
      <p className="progress-label" aria-live="polite">
        {done} of {total} answered
        {props.saveNote ? <span className="save-note">{props.saveNote}</span> : null}
      </p>

      {reviewing ? (
        <>
          <h2 id="read-title" className="step-title">
            Check your read
          </h2>
          <ol className="review">
            {STEPS.map((s, i) => {
              const ok = stepComplete(s.id, answers);
              return (
                <li key={s.id} className={ok ? "" : "missing"}>
                  <button type="button" className="review-row" onClick={() => onIndex(i)}>
                    <span className="num">{i + 1}</span>
                    <span className="review-title">{s.title}</span>
                    <span className="review-val">{ok ? describeStep(s.id, answers) : "Still to answer"}</span>
                  </button>
                </li>
              );
            })}
          </ol>
          {props.error ? (
            <p className="warn" role="alert">
              {props.error}
            </p>
          ) : null}
          <button
            type="button"
            className="btn block"
            disabled={done < total || props.submitting}
            onClick={props.onSubmit}
          >
            {props.submitting ? "Scoring" : props.submitLabel}
          </button>
          <p className="fine">You can submit once. Feedback appears straight after.</p>
        </>
      ) : (
        <>
          <div className="step-head">
            <h2 id="read-title" className="step-title">
              <span className="step-n">{index + 1}</span>
              {STEPS[index].title}
            </h2>
            <button type="button" className="ecg-peek" onClick={props.onShowEcg}>
              View ECG
            </button>
          </div>
          <p className="step-prompt">{STEPS[index].prompt}</p>
          <StepBody id={STEPS[index].id} a={answers} set={set} />
          <div className="step-nav">
            <button type="button" className="btn secondary" disabled={index === 0} onClick={() => onIndex(index - 1)}>
              Back
            </button>
            <button type="button" className="btn" onClick={() => onIndex(index + 1)}>
              {index === total - 1 ? "Review" : "Next"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
