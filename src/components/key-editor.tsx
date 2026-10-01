import { type Answers, CHOICES, LEADS, type ChoiceGroup } from "@/lib/lab/ecg";

type Props = { value: Answers; onChange: (a: Answers) => void };

/** Admin: the answer key uses the same shape as a learner's read. */
export function KeyEditor({ value, onChange }: Props) {
  const set = <K extends keyof Answers>(k: K, v: Answers[K]) => onChange({ ...value, [k]: v });

  const pick = (label: string, k: keyof Answers, group: ChoiceGroup) => (
    <label className="field" key={k}>
      <span>{label}</span>
      <select value={value[k] as string} onChange={(e) => set(k, e.target.value as never)}>
        <option value="">Not set</option>
        {CHOICES[group].map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </label>
  );

  const leads = (label: string, k: "qLeads" | "stLeads") => (
    <fieldset className="field leads-set" key={k}>
      <legend>{label}</legend>
      <div className="lead-grid">
        {LEADS.map((l) => (
          <label key={l} className="check">
            <input
              type="checkbox"
              checked={value[k].includes(l)}
              onChange={(e) => set(k, e.target.checked ? [...value[k], l] : value[k].filter((x) => x !== l))}
            />
            <span>{l}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );

  return (
    <div className="key-grid">
      {pick("Rate", "rate", "rate")}
      {pick("Rhythm", "rhythm", "rhythm")}
      {pick("Axis", "axis", "axis")}
      {pick("P waves (lead II)", "pWaves", "pWaves")}
      <label className="field">
        <span>PR interval (seconds, for example 0.16)</span>
        <input value={value.pr} inputMode="decimal" onChange={(e) => set("pr", e.target.value)} />
      </label>
      {pick("PR segment sloped", "prSloped", "prSloped")}
      {pick("QRS width", "qrs", "qrs")}
      {value.qrs === "wide" ? pick("Bundle branch pattern", "bbb", "bbb") : null}
      {pick("QRS in V1", "qrsV1", "polarity")}
      {pick("QRS in V6", "qrsV6", "polarity")}
      {pick("R-wave progression", "rProg", "rProg")}
      {pick("Q waves", "qWave", "qWave")}
      {value.qWave === "pathological" ? leads("Leads with Q waves", "qLeads") : null}
      {pick("ST segment", "st", "st")}
      {value.st && value.st !== "none" ? leads("Leads with ST change", "stLeads") : null}
      {value.st && value.st !== "none" ? pick("Reciprocal change", "reciprocal", "reciprocal") : null}
      {pick("T waves", "tWaves", "tWaves")}
      <label className="field">
        <span>QTc (ms)</span>
        <input value={value.qtc} inputMode="numeric" onChange={(e) => set("qtc", e.target.value)} />
      </label>
    </div>
  );
}
