import { Lub } from "@/components/lub";
import { type CaseFeedback, type StepId, STEPS, blankAnswers, describeStep } from "@/lib/lab/ecg";

function mark(score: number | undefined) {
  if (score == null) return { cls: "na", label: "Not scored" };
  if (score >= 0.999) return { cls: "right", label: "Correct" };
  if (score > 0) return { cls: "part", label: "Partly correct" };
  return { cls: "wrong", label: "Missed" };
}

export function FeedbackView({ feedback, trace }: { feedback: CaseFeedback; trace?: React.ReactNode }) {
  const scored = STEPS.filter((s) => s.id !== "impression" && feedback.scorePerStep[s.id] != null);
  const points = scored.reduce((sum, s) => sum + (feedback.scorePerStep[s.id] ?? 0), 0);
  const keyBlank = JSON.stringify(feedback.key) === JSON.stringify(blankAnswers());

  return (
    <section className="feedback" aria-labelledby="fb-title">
      <div className="card score-card">
        <Lub className="score-lub" />
        <p className="card-label">Your read</p>
        <h2 id="fb-title" className="score">
          {Math.round(points * 10) / 10}
          <span> of {scored.length} steps</span>
        </h2>
        <p className="fine">
          {scored.length - scored.filter((s) => (feedback.scorePerStep[s.id] ?? 0) >= 0.999).length === 0
            ? "Every step matched the key."
            : "Missed steps are marked in red, with the reasoning underneath."}
        </p>
        {keyBlank ? (
          <p className="warn">The answer key for this case hasn't been written yet, so every step shows as missed.</p>
        ) : null}
      </div>

      {trace ? <div className="fb-trace">{trace}</div> : null}

      <ol className="fb-steps">
        {scored.map((s) => {
          const score = feedback.scorePerStep[s.id as StepId];
          const m = mark(score);
          const reason = feedback.stepReasons[s.id];
          return (
            <li key={s.id} className={`fb-step ${m.cls}${m.cls === "right" ? " compact" : ""}`}>
              <header>
                <span className="num">{STEPS.findIndex((x) => x.id === s.id) + 1}</span>
                <h3>{s.title}</h3>
                <span className="fb-mark">{m.label}</span>
              </header>
              <dl>
                <div>
                  <dt>Your read</dt>
                  <dd>{describeStep(s.id, feedback.answers)}</dd>
                </div>
                <div>
                  <dt>Key</dt>
                  <dd>{describeStep(s.id, feedback.key)}</dd>
                </div>
              </dl>
              {m.cls === "right" ? <p className="fb-short">{describeStep(s.id, feedback.answers)}</p> : null}
              {m.cls !== "right" && reason ? <p className="fb-reason">{reason}</p> : null}
            </li>
          );
        })}
      </ol>

      <div className="card">
        <h3 className="card-label">Impression</h3>
        <dl className="impressions">
          <div>
            <dt>Yours</dt>
            <dd>{describeStep("impression", feedback.answers)}</dd>
          </div>
          <div>
            <dt>Model impression</dt>
            <dd>{feedback.modelImpression || "Not written yet."}</dd>
          </div>
        </dl>
      </div>

      <div className="card teaching">
        <h3 className="card-label">Teaching point</h3>
        <p>{feedback.teachingPoint || "Not written yet."}</p>
      </div>
    </section>
  );
}
