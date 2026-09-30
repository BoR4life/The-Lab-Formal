/** Server only. Scores a learner's read against the case key. */
import { type Answers, type StepId, qtcBand } from "./ecg";

function jaccard(a: string[], b: string[]): number {
  const A = new Set(a);
  const B = new Set(b);
  if (!A.size && !B.size) return 1;
  let inter = 0;
  A.forEach((x) => {
    if (B.has(x)) inter++;
  });
  const union = A.size + B.size - inter;
  return union ? inter / union : 1;
}

const eq = (x: string, y: string) => (x && x === y ? 1 : 0);

export function scoreStep(id: StepId, key: Answers, ans: Answers): number {
  switch (id) {
    case "rate":
      return eq(ans.rate, key.rate);
    case "rhythm":
      return eq(ans.rhythm, key.rhythm);
    case "p":
      return eq(ans.pWaves, key.pWaves);
    case "pr":
      return eq(ans.pr, key.pr);
    case "qrs":
      return eq(ans.qrs, key.qrs);
    case "q": {
      const kind = eq(ans.qWave, key.qWave);
      if (key.qWave !== "pathological") return kind;
      return (kind + jaccard(ans.qLeads, key.qLeads)) / 2;
    }
    case "st": {
      const kind = eq(ans.st, key.st);
      if (key.st === "none" || !key.st) return kind;
      return (kind + jaccard(ans.stLeads, key.stLeads) + eq(ans.reciprocal, key.reciprocal)) / 3;
    }
    case "t":
      return eq(ans.tWaves, key.tWaves);
    case "qtc": {
      const A = qtcBand(ans.qtc);
      const B = qtcBand(key.qtc);
      return A && B && A === B ? 1 : 0;
    }
    case "impression":
      return 0;
  }
}

export function scoreRead(scoredSteps: StepId[], key: Answers, ans: Answers) {
  const perStep: Partial<Record<StepId, number>> = {};
  let sum = 0;
  for (const id of scoredSteps) {
    const s = Math.round(scoreStep(id, key, ans) * 1000) / 1000;
    perStep[id] = s;
    sum += s;
  }
  const total = scoredSteps.length ? Math.round((sum / scoredSteps.length) * 1000) / 1000 : 0;
  return { perStep, total };
}
