/**
 * Twelve Leads: the systematic read, step by step. Shared by client and server.
 * Holds the questions and labels only. The answer key never lives here.
 */

export const LEADS = ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"] as const;

export type StepId = "rate" | "rhythm" | "axis" | "p" | "pr" | "qrs" | "q" | "st" | "t" | "qtc" | "impression";

export const STEPS: { id: StepId; n: string; title: string; prompt: string }[] = [
  { id: "rate", n: "01", title: "Rate", prompt: "What is the ventricular rate?" },
  { id: "rhythm", n: "02", title: "Rhythm", prompt: "Is the rhythm regular?" },
  { id: "axis", n: "03", title: "Axis", prompt: "What is the cardiac axis? Look at leads I and aVF (and II)." },
  { id: "p", n: "04", title: "P wave", prompt: "What do the P waves look like in lead II?" },
  { id: "pr", n: "05", title: "PR interval", prompt: "Measure the PR interval, and look at the PR segment." },
  { id: "qrs", n: "06", title: "QRS", prompt: "How wide is the QRS, and how do the R waves progress across V1 to V6?" },
  { id: "q", n: "07", title: "Q wave", prompt: "Are there pathological Q waves?" },
  { id: "st", n: "08", title: "ST segment", prompt: "Is there ST elevation or depression?" },
  { id: "t", n: "09", title: "T wave", prompt: "What do the T waves show?" },
  { id: "qtc", n: "10", title: "QT", prompt: "What is the corrected QT (QTc) in milliseconds?" },
  { id: "impression", n: "11", title: "Impression", prompt: "Put it together. What is your impression?" },
];

export const SCORED_STEP_IDS: StepId[] = STEPS.filter((s) => s.id !== "impression").map((s) => s.id);

export const CHOICES = {
  rate: [["lt60", "<60"], ["normal", "60–100"], ["gt100", ">100"]],
  rhythm: [
    ["regular", "Regular"],
    ["occasional", "Occasionally irregular"],
    ["regularly", "Regularly irregular"],
    ["irregular", "Irregularly irregular"],
  ],
  axis: [
    ["normal", "Normal (−30° to +90°)"],
    ["left", "Left axis deviation (beyond −30°)"],
    ["right", "Right axis deviation (beyond +90°)"],
    ["extreme", "No man's land (−90° to 180°)"],
  ],
  pWaves: [
    ["positive", "Positive"],
    ["negative", "Negative"],
    ["flattened", "Flattened"],
    ["bifid", "Bifid"],
    ["tall", "Tall"],
    ["absent", "Absent"],
  ],
  prSloped: [["no", "No"], ["yes", "Yes"]],
  qrs: [
    ["narrow", "Narrow (under 0.12 s)"],
    ["wide", "Wide (0.12 s or more)"],
  ],
  rProg: [
    ["normal", "Normal"],
    ["poor", "Poor R-wave progression"],
  ],
  qWave: [["none", "No significant Q waves"], ["pathological", "Pathological Q waves"]],
  st: [["none", "None"], ["elevation", "Up (elevation)"], ["depression", "Down (depression)"]],
  tWaves: [
    ["positive", "Positive (upright)"],
    ["negative", "Negative (inverted)"],
    ["peaked", "Peaked"],
    ["absent", "Absent (flat)"],
  ],
  reciprocal: [["yes", "Yes"], ["no", "No"]],
} as const satisfies Record<string, readonly (readonly [string, string])[]>;

export type ChoiceGroup = keyof typeof CHOICES;

export type Answers = {
  rate: string;
  rhythm: string;
  axis: string;
  pWaves: string;
  pr: string;
  prSloped: string;
  qrs: string;
  rProg: string;
  qWave: string;
  qLeads: string[];
  st: string;
  stLeads: string[];
  reciprocal: string;
  tWaves: string;
  qtc: string;
  impression: string;
};

export function blankAnswers(): Answers {
  return {
    rate: "",
    rhythm: "",
    axis: "",
    pWaves: "",
    pr: "",
    prSloped: "",
    qrs: "",
    rProg: "",
    qWave: "",
    qLeads: [],
    st: "",
    stLeads: [],
    reciprocal: "",
    tWaves: "",
    qtc: "",
    impression: "",
  };
}

/** Coerce anything (stored JSON, browser input) into a clean Answers object. */
export function normaliseAnswers(raw: unknown): Answers {
  const a = blankAnswers();
  if (!raw || typeof raw !== "object") return a;
  const r = raw as Record<string, unknown>;
  const str = (v: unknown, max = 40) => (typeof v === "string" ? v.slice(0, max) : "");
  const leads = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && (LEADS as readonly string[]).includes(x)) : [];
  const pick = (group: ChoiceGroup, v: unknown) => {
    const s = str(v);
    return CHOICES[group].some(([value]) => value === s) ? s : "";
  };
  a.rate = pick("rate", r.rate);
  a.rhythm = pick("rhythm", r.rhythm);
  a.axis = pick("axis", r.axis);
  a.pWaves = pick("pWaves", r.pWaves);
  a.pr = str(r.pr, 5).replace(/[^0-9.]/g, "");
  a.prSloped = pick("prSloped", r.prSloped);
  a.qrs = pick("qrs", r.qrs);
  a.rProg = pick("rProg", r.rProg);
  a.qWave = pick("qWave", r.qWave);
  a.qLeads = leads(r.qLeads);
  a.st = pick("st", r.st);
  a.stLeads = leads(r.stLeads);
  a.reciprocal = pick("reciprocal", r.reciprocal);
  a.tWaves = pick("tWaves", r.tWaves);
  a.qtc = str(r.qtc, 6).replace(/[^0-9.]/g, "");
  a.impression = str(r.impression, 2000);
  return a;
}

export type QtcBand = "normal" | "prolonged" | "gt500";
export const QTC_BAND_LABEL: Record<QtcBand, string> = { normal: "Normal", prolonged: "Prolonged", gt500: ">500 ms" };

export type PrBand = "short" | "normal" | "long";
export const PR_BAND_LABEL: Record<PrBand, string> = { short: "Short", normal: "Normal", long: "Prolonged" };

/** PR interval in seconds (0.06 to 0.60) to a clinical band. */
export function prBand(v: string | number): PrBand | null {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").trim());
  if (!Number.isFinite(n) || n < 0.06 || n > 0.6) return null;
  if (n < 0.12) return "short";
  if (n <= 0.2) return "normal";
  return "long";
}

export function qtcBand(v: string | number): QtcBand | null {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").trim());
  if (!Number.isFinite(n) || n < 200 || n > 800) return null;
  if (n > 500) return "gt500";
  if (n >= 460) return "prolonged";
  return "normal";
}

export function stepComplete(id: StepId, a: Answers): boolean {
  switch (id) {
    case "rate":
      return !!a.rate;
    case "rhythm":
      return !!a.rhythm;
    case "axis":
      return !!a.axis;
    case "p":
      return !!a.pWaves;
    case "pr":
      return prBand(a.pr) != null && !!a.prSloped;
    case "qrs":
      return !!a.qrs && !!a.rProg;
    case "q":
      if (!a.qWave) return false;
      return a.qWave === "none" || a.qLeads.length > 0;
    case "st":
      if (!a.st) return false;
      return a.st === "none" || (a.stLeads.length > 0 && !!a.reciprocal);
    case "t":
      return !!a.tWaves;
    case "qtc":
      return qtcBand(a.qtc) != null;
    case "impression":
      return a.impression.trim().length >= 8;
  }
}

function labelOf(group: ChoiceGroup, value: string): string {
  const hit = CHOICES[group].find(([v]) => v === value);
  return hit ? hit[1] : "";
}

/** Plain-language description of one step's answer, for feedback screens. */
export function describeStep(id: StepId, a: Answers): string {
  let text = "";
  switch (id) {
    case "rate":
      text = labelOf("rate", a.rate);
      break;
    case "rhythm":
      text = labelOf("rhythm", a.rhythm);
      break;
    case "axis":
      text = labelOf("axis", a.axis);
      break;
    case "p":
      text = labelOf("pWaves", a.pWaves);
      break;
    case "pr": {
      const band = prBand(a.pr);
      if (band) {
        text = `${a.pr.trim()} s · ${PR_BAND_LABEL[band]}`;
        if (a.prSloped === "yes") text += ". PR segment sloped";
      }
      break;
    }
    case "qrs": {
      const bits = [labelOf("qrs", a.qrs), a.rProg ? "R-wave progression: " + labelOf("rProg", a.rProg).replace(" R-wave progression", "") : ""];
      text = bits.filter(Boolean).join(". ");
      break;
    }
    case "q":
      text =
        a.qWave === "pathological"
          ? "Pathological Q waves" + (a.qLeads.length ? " in " + a.qLeads.join(", ") : "")
          : labelOf("qWave", a.qWave);
      break;
    case "st": {
      const bits = [labelOf("st", a.st)];
      if (a.st && a.st !== "none") {
        if (a.stLeads.length) bits.push("Leads: " + a.stLeads.join(", "));
        if (a.reciprocal) bits.push("Reciprocal change: " + labelOf("reciprocal", a.reciprocal));
      }
      text = bits.filter(Boolean).join(". ");
      break;
    }
    case "t":
      text = labelOf("tWaves", a.tWaves);
      break;
    case "qtc": {
      const band = qtcBand(a.qtc);
      text = band ? `QTc ${a.qtc.trim()} ms · ${QTC_BAND_LABEL[band]}` : "";
      break;
    }
    case "impression":
      text = a.impression.trim();
      break;
  }
  return text || "Not answered";
}

/** What the browser is allowed to see about a case before the learner submits. */
export type PublicCase = {
  id: string;
  title: string;
  status: "draft" | "open" | "closed" | "feedback";
  vignette: string;
  ecgImage: string;
  scoredSteps: StepId[];
};

/** Released only after that learner has submitted. */
export type CaseFeedback = {
  key: Answers;
  stepReasons: Partial<Record<StepId, string>>;
  modelImpression: string;
  teachingPoint: string;
  scorePerStep: Partial<Record<StepId, number>>;
  totalScore: number;
  answers: Answers;
  submittedAt: string;
};
