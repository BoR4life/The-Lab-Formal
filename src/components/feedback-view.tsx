import { type CaseFeedback, type StepId, STEPS, blankAnswers, describeStep } from "@/lib/lab/ecg";

function mark(score: number | undefined) {
  if (score == null) return { cls: "na", label: "Not scored" };
  if (score >= 0.999) return { cls: "right", label: "Correct" };
  if (score > 0) return { cls: "part", label: "Partly correct" };
  return { cls: "wrong", label: "Missed" };
}

export function FeedbackView({ feedback }: { feedback: CaseFeedback }) {
  const scored = STEPS.filter((s) => s.id !== "impression" && feedback.scorePerStep[s.id] != null);
  const points = scored.reduce((sum, s) => sum + (feedback.scorePerStep[s.id] ?? 0), 0);
  const keyBlank = JSON.stringify(feedback.key) === JSON.stringify(blankAnswers());

  return (
    <section className="feedback" aria-labelledby="fb-title">
      <div className="card score-card">
        <p className="eyebrow">Your read</p>
        <h2 id="fb-title" className="score">
          {Math.round(points * 10) / 10}
          <span> of {scored.length} steps</span>
        </h2>
        {keyBlank ? (
          <p className="warn">The answer key for this case hasn't been written yet, so every step shows as missed.</p>
        ) : null}
      </div>

      <ol className="fb-steps">
        {scored.map((s) => {
          const score = feedback.scorePerStep[s.id as StepId];
          const m = mark(score);
          const reason = feedback.stepReasons[s.id];
          return (
            <li key={s.id} className={`fb-step ${m.cls}`}>
              <header>
                <span className="num">{s.n}</span>
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
              {m.cls !== "right" && reason ? <p className="fb-reason">{reason}</p> : null}
            </li>
          );
        })}
      </ol>

      <div className="card">
        <p className="eyebrow">Impression</p>
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
        <p className="eyebrow">Teaching point</p>
        <p>{feedback.teachingPoint || "Not written yet."}</p>
      </div>
    </section>
  );
}
