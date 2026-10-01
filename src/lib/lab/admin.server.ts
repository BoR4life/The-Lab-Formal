/** Server only. Case editor, results and history. */
import { getSql } from "@/lib/db";
import {
  type Answers, type StepId, SCORED_STEP_IDS, STEPS, normaliseAnswers, stepComplete,
} from "./ecg";
import { loadProfile } from "./profile.server";

async function requireAdmin(userId: string) {
  const p = await loadProfile(userId);
  if (p.role !== "admin") throw new Error("Admins only");
}

const iso = (d: Date | string | null) => (d == null ? null : d instanceof Date ? d.toISOString() : new Date(d).toISOString());

export type EditableCase = {
  id: string;
  title: string;
  caseNumber: number;
  status: "draft" | "open" | "closed" | "feedback";
  vignette: string;
  chestPain: boolean;
  author: string;
  verifiedBy: string;
  provenance: string;
  learningOutcomes: string;
  modelImpression: string;
  teachingPoint: string;
  scoredSteps: StepId[];
  stepReasons: Partial<Record<StepId, string>>;
  answerKey: Answers;
  consentConfirmed: boolean;
  ecgImage: string;
};

type Row = {
  id: string; title: string; case_number: number; status: EditableCase["status"]; vignette: string;
  chest_pain: boolean; author: string; verified_by: string; provenance: string; learning_outcomes: string;
  model_impression: string; teaching_point: string; scored_steps: unknown; step_reasons: unknown;
  answer_key: unknown; consent_confirmed: boolean; ecg_image: string;
};

function steps(raw: unknown): StepId[] {
  const ok = new Set<string>(SCORED_STEP_IDS);
  const list = Array.isArray(raw) ? raw.filter((x): x is StepId => typeof x === "string" && ok.has(x)) : [];
  return list.length ? list : SCORED_STEP_IDS.slice();
}

function reasonMap(raw: unknown) {
  const out: Partial<Record<StepId, string>> = {};
  if (raw && typeof raw === "object") {
    for (const s of STEPS) {
      const v = (raw as Record<string, unknown>)[s.id];
      if (typeof v === "string") out[s.id] = v;
    }
  }
  return out;
}

export async function getEditable(userId: string, id: string): Promise<EditableCase | null> {
  await requireAdmin(userId);
  const sql = await getSql();
  const r = (await sql<Row>`select * from cases where id = ${id}`)[0];
  if (!r) return null;
  return {
    id: r.id, title: r.title, caseNumber: r.case_number, status: r.status, vignette: r.vignette,
    chestPain: r.chest_pain, author: r.author, verifiedBy: r.verified_by, provenance: r.provenance,
    learningOutcomes: r.learning_outcomes, modelImpression: r.model_impression, teachingPoint: r.teaching_point,
    scoredSteps: steps(r.scored_steps), stepReasons: reasonMap(r.step_reasons),
    answerKey: normaliseAnswers(r.answer_key), consentConfirmed: r.consent_confirmed, ecgImage: r.ecg_image,
  };
}

export async function createCase(userId: string) {
  await requireAdmin(userId);
  const sql = await getSql();
  const next = await sql<{ n: number }>`select coalesce(max(case_number), 0) + 1 as n from cases`;
  const n = Number(next[0]?.n ?? 1);
  const id = `c-${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
  await sql`
    insert into cases (id, title, month, week, slot_type, vignette, ecg_image, case_number, status, author, verified_by)
    values (${id}, ${`Case ${n}`}, 0, 0, 'undifferentiated', '', '', ${n}, 'draft', 'Brad Chesham, RN, MSc', 'Brad Chesham, RN, MSc')
  `;
  return { id };
}

export async function saveCase(userId: string, c: EditableCase) {
  await requireAdmin(userId);
  const sql = await getSql();
  const existing = (await sql<{ ecg_image: string }>`select ecg_image from cases where id = ${c.id}`)[0];
  if (!existing) throw new Error("No such case");

  const key = normaliseAnswers(c.answerKey);
  const scored = steps(c.scoredSteps);
  if (c.status !== "draft") {
    const problems: string[] = [];
    if (!c.title.trim()) problems.push("a title");
    if (!c.vignette.trim()) problems.push("the patient details");
    if (!existing.ecg_image) problems.push("an ECG image");
    if (!c.consentConfirmed) problems.push("confirmation that the trace is de-identified and cleared for use");
    const unanswered = STEPS.filter((s) => s.id !== "impression" && scored.includes(s.id as StepId) && !stepComplete(s.id, key));
    if (unanswered.length) problems.push("an answer key for " + unanswered.map((s) => s.title).join(", "));
    if (!c.modelImpression.trim()) problems.push("the model impression");
    if (!c.teachingPoint.trim()) problems.push("the teaching point");
    if (problems.length) throw new Error("Can't publish yet. Still needs " + problems.join("; ") + ".");
  }
  const reasons: Record<string, string> = {};
  for (const s of STEPS) {
    const v = c.stepReasons[s.id];
    if (v && v.trim()) reasons[s.id] = v.trim().slice(0, 1500);
  }
  await sql`
    update cases set
      title = ${c.title.trim().slice(0, 120)}, case_number = ${c.caseNumber}, status = ${c.status},
      vignette = ${c.vignette.slice(0, 2000)}, chest_pain = ${c.chestPain}, author = ${c.author.slice(0, 200)},
      verified_by = ${c.verifiedBy.slice(0, 200)}, provenance = ${c.provenance.slice(0, 1500)},
      learning_outcomes = ${c.learningOutcomes.slice(0, 2000)}, model_impression = ${c.modelImpression.slice(0, 3000)},
      teaching_point = ${c.teachingPoint.slice(0, 3000)}, scored_steps = ${JSON.stringify(scored)}::jsonb,
      step_reasons = ${JSON.stringify(reasons)}::jsonb, answer_key = ${JSON.stringify(key)}::jsonb,
      consent_confirmed = ${c.consentConfirmed}, updated_at = now()
    where id = ${c.id}
  `;
  return { ok: true };
}

const MAX_IMAGE = 3 * 1024 * 1024;

export async function setImage(userId: string, id: string, contentType: string, base64: string) {
  await requireAdmin(userId);
  if (!/^image\/(jpeg|png|webp)$/.test(contentType)) throw new Error("Use a JPEG, PNG or WebP image.");
  if (!/^[A-Za-z0-9+/=]+$/.test(base64)) throw new Error("Bad image data.");
  if (Math.floor((base64.length * 3) / 4) > MAX_IMAGE) throw new Error("That image is over 3 MB. Resize it and try again.");
  const sql = await getSql();
  const ok = await sql`select 1 from cases where id = ${id}`;
  if (!ok.length) throw new Error("No such case");
  await sql`
    insert into case_images (case_id, content_type, data, updated_at)
    values (${id}, ${contentType}, decode(${base64}, 'base64'), now())
    on conflict (case_id) do update set content_type = excluded.content_type, data = excluded.data, updated_at = now()
  `;
  const url = `/api/case-image/${id}?v=${Date.now()}`;
  await sql`update cases set ecg_image = ${url}, updated_at = now() where id = ${id}`;
  return { url };
}

/** Public image read for the case-image route. */
export async function readImage(id: string): Promise<{ type: string; base64: string } | null> {
  const sql = await getSql();
  const r = await sql<{ content_type: string; b64: string }>`
    select content_type, encode(data, 'base64') as b64 from case_images where case_id = ${id}
  `;
  return r[0] ? { type: r[0].content_type, base64: r[0].b64.replace(/\s/g, "") } : null;
}

export type CaseResult = {
  id: string; title: string; caseNumber: number; status: string;
  started: number; submitted: number; completionPct: number | null;
  medianMinutes: number | null; meanScore: number | null;
  steps: { id: StepId; title: string; correctPct: number }[];
};

export async function results(userId: string): Promise<CaseResult[]> {
  await requireAdmin(userId);
  const sql = await getSql();
  const cases = await sql<{ id: string; title: string; case_number: number; status: string; scored_steps: unknown }>`
    select id, title, case_number, status, scored_steps from cases order by case_number desc
  `;
  const subs = await sql<{
    case_id: string; status: string; score_per_step: Record<string, number> | null; total_score: number | string | null;
    started_at: Date | string; submitted_at: Date | string | null;
  }>`select case_id, status, score_per_step, total_score, started_at, submitted_at from submissions`;

  return cases.map((c) => {
    const mine = subs.filter((s) => s.case_id === c.id);
    const done = mine.filter((s) => s.status === "submitted");
    const mins = done
      .map((s) => (new Date(s.submitted_at as string).getTime() - new Date(s.started_at).getTime()) / 60000)
      .filter((m) => m >= 0)
      .sort((a, b) => a - b);
    const median = mins.length ? mins[Math.floor(mins.length / 2)] : null;
    const scored = steps(c.scored_steps);
    return {
      id: c.id, title: c.title, caseNumber: c.case_number, status: c.status,
      started: mine.length, submitted: done.length,
      completionPct: mine.length ? Math.round((done.length / mine.length) * 100) : null,
      medianMinutes: median == null ? null : Math.round(median * 10) / 10,
      meanScore: done.length ? Math.round((done.reduce((a, s) => a + Number(s.total_score ?? 0), 0) / done.length) * 100) : null,
      steps: done.length
        ? scored.map((id) => {
            const full = done.filter((s) => Number(s.score_per_step?.[id] ?? 0) >= 0.999).length;
            return { id, title: STEPS.find((x) => x.id === id)?.title ?? id, correctPct: Math.round((full / done.length) * 100) };
          })
        : [],
    };
  });
}

/** De-identified: no names, no emails, no user ids. */
export async function resultsCsv(userId: string): Promise<string> {
  await requireAdmin(userId);
  const sql = await getSql();
  const rows = await sql<{
    case_number: number; title: string; score_per_step: Record<string, number> | null; total_score: number | string | null;
    started_at: Date | string; submitted_at: Date | string;
  }>`
    select c.case_number, c.title, s.score_per_step, s.total_score, s.started_at, s.submitted_at
    from submissions s join cases c on c.id = s.case_id
    where s.status = 'submitted' order by c.case_number, s.submitted_at
  `;
  const ids = SCORED_STEP_IDS;
  const q = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;
  const head = ["case_number", "title", "submitted_on", "minutes", "total_fraction", ...ids].join(",");
  const lines = rows.map((r) => {
    const mins = Math.round(((new Date(r.submitted_at).getTime() - new Date(r.started_at).getTime()) / 60000) * 10) / 10;
    return [
      r.case_number, q(r.title), iso(r.submitted_at)!.slice(0, 10), mins, Number(r.total_score ?? 0),
      ...ids.map((id) => r.score_per_step?.[id] ?? ""),
    ].join(",");
  });
  return [head, ...lines].join("\n");
}

export async function history(userId: string) {
  await loadProfile(userId);
  const sql = await getSql();
  const rows = await sql<{
    id: string; title: string; case_number: number; status: string; sub_status: string;
    total_score: number | string | null; scored_steps: unknown; submitted_at: Date | string | null; updated_at: Date | string;
  }>`
    select c.id, c.title, c.case_number, c.status, s.status as sub_status, s.total_score, c.scored_steps, s.submitted_at, s.updated_at
    from submissions s join cases c on c.id = s.case_id
    where s.user_id = ${userId} and c.status in ('open', 'closed', 'feedback')
    order by c.case_number desc
  `;
  return rows.map((r) => ({
    id: r.id, title: r.title, caseNumber: r.case_number,
    state: r.sub_status as "in_progress" | "submitted",
    outOf: steps(r.scored_steps).length,
    score: r.sub_status === "submitted" ? Math.round(Number(r.total_score ?? 0) * steps(r.scored_steps).length * 10) / 10 : null,
    when: iso(r.submitted_at ?? r.updated_at)!,
  }));
}
