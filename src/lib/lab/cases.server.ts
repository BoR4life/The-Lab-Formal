/** Server only. Case and submission data access for The Lab. */
import { getSql } from "@/lib/db";
import {
  type Answers,
  type CaseFeedback,
  type PublicCase,
  type StepId,
  SCORED_STEP_IDS,
  STEPS,
  normaliseAnswers,
  stepComplete,
} from "./ecg";
import { loadProfile } from "./profile.server";
import { scoreRead } from "./scoring.server";

type CaseRow = {
  id: string;
  title: string;
  status: PublicCase["status"];
  vignette: string;
  ecg_image: string;
  scored_steps: unknown;
  answer_key: unknown;
  step_reasons: unknown;
  model_impression: string;
  teaching_point: string;
  month: number;
  week: number;
};

type SubmissionRow = {
  id: string;
  answers: unknown;
  status: "in_progress" | "submitted";
  score_per_step: unknown;
  total_score: number | string | null;
  submitted_at: Date | string | null;
};

const VISIBLE_TO_LEARNERS = ["open", "closed", "feedback"];

function stepList(raw: unknown): StepId[] {
  const valid = new Set<string>(SCORED_STEP_IDS);
  const list = Array.isArray(raw) ? raw.filter((x): x is StepId => typeof x === "string" && valid.has(x)) : [];
  return list.length ? list : SCORED_STEP_IDS.slice();
}

function toPublic(row: CaseRow): PublicCase {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    vignette: row.vignette,
    ecgImage: row.ecg_image,
    scoredSteps: stepList(row.scored_steps),
  };
}

function reasons(raw: unknown): Partial<Record<StepId, string>> {
  const out: Partial<Record<StepId, string>> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const s of STEPS) {
    const v = (raw as Record<string, unknown>)[s.id];
    if (typeof v === "string" && v.trim()) out[s.id] = v.trim();
  }
  return out;
}

async function isAdmin(userId: string) {
  const profile = await loadProfile(userId);
  return profile.role === "admin";
}

async function fetchCase(caseId: string): Promise<CaseRow | null> {
  const sql = await getSql();
  const rows = await sql<CaseRow>`
    select id, title, status, vignette, ecg_image, scored_steps, answer_key, step_reasons,
           model_impression, teaching_point, month, week
    from cases where id = ${caseId}
  `;
  return rows[0] ?? null;
}

/** Anyone, signed in or not: the case that is open now (latest by month and week). */
export async function currentOpenCase(): Promise<PublicCase | null> {
  const sql = await getSql();
  const rows = await sql<CaseRow>`
    select id, title, status, vignette, ecg_image, scored_steps, answer_key, step_reasons,
           model_impression, teaching_point, month, week
    from cases where status = 'open'
    order by month desc, week desc, updated_at desc
    limit 1
  `;
  return rows[0] ? toPublic(rows[0]) : null;
}

/** Anyone: a single case's learner-facing fields. Drafts are hidden. */
export async function publicCase(caseId: string): Promise<PublicCase | null> {
  const row = await fetchCase(caseId);
  if (!row || !VISIBLE_TO_LEARNERS.includes(row.status)) return null;
  return toPublic(row);
}

/** Admin only: any case, drafts included, for previewing. */
export async function adminCase(userId: string, caseId: string): Promise<PublicCase | null> {
  if (!(await isAdmin(userId))) throw new Error("Admins only");
  const row = await fetchCase(caseId);
  return row ? toPublic(row) : null;
}

export async function adminCaseList(userId: string) {
  if (!(await isAdmin(userId))) throw new Error("Admins only");
  const sql = await getSql();
  return sql<{ id: string; title: string; status: string; month: number; week: number; submissions: number }>`
    select c.id, c.title, c.status, c.month, c.week,
           (select count(*) from submissions s where s.case_id = c.id and s.status = 'submitted') as submissions
    from cases c
    order by c.month desc, c.week desc
  `;
}

function buildFeedback(row: CaseRow, sub: SubmissionRow): CaseFeedback {
  const submitted = sub.submitted_at instanceof Date ? sub.submitted_at.toISOString() : String(sub.submitted_at ?? "");
  return {
    key: normaliseAnswers(row.answer_key),
    stepReasons: reasons(row.step_reasons),
    modelImpression: row.model_impression,
    teachingPoint: row.teaching_point,
    scorePerStep: (sub.score_per_step ?? {}) as CaseFeedback["scorePerStep"],
    totalScore: Number(sub.total_score ?? 0),
    answers: normaliseAnswers(sub.answers),
    submittedAt: submitted,
  };
}

/** Returns the case if this user may work on it, otherwise throws. */
async function usableCase(userId: string, caseId: string): Promise<CaseRow> {
  const row = await fetchCase(caseId);
  if (row && (VISIBLE_TO_LEARNERS.includes(row.status) || (await isAdmin(userId)))) return row;
  throw new Error("Case not available");
}

export type Attempt =
  | { state: "none" }
  | { state: "in_progress"; answers: Answers }
  | { state: "submitted"; feedback: CaseFeedback };

/** Signed-in learner: their attempt on a case. Feedback only exists after they submit. */
export async function myAttempt(userId: string, caseId: string): Promise<Attempt> {
  const row = await usableCase(userId, caseId);
  const sql = await getSql();
  const subs = await sql<SubmissionRow>`
    select id, answers, status, score_per_step, total_score, submitted_at
    from submissions where user_id = ${userId} and case_id = ${caseId}
  `;
  const sub = subs[0];
  if (!sub) return { state: "none" };
  if (sub.status === "submitted") return { state: "submitted", feedback: buildFeedback(row, sub) };
  return { state: "in_progress", answers: normaliseAnswers(sub.answers) };
}

/** Autosave. Refuses once submitted or when the case no longer takes answers. */
export async function saveProgress(userId: string, caseId: string, raw: unknown) {
  const row = await usableCase(userId, caseId);
  if (row.status !== "open" && !(await isAdmin(userId))) throw new Error("This case is closed to new answers");
  await loadProfile(userId);
  const answers = normaliseAnswers(raw);
  const sql = await getSql();
  await sql`
    insert into submissions (id, user_id, case_id, answers, status, started_at, updated_at)
    values (${crypto.randomUUID()}, ${userId}, ${caseId}, ${JSON.stringify(answers)}::jsonb, 'in_progress', now(), now())
    on conflict (user_id, case_id) do update set
      answers = excluded.answers,
      updated_at = now()
    where submissions.status = 'in_progress'
  `;
  return { ok: true };
}

/** Score on the server and release feedback to this learner only. One submission per case. */
export async function submitRead(userId: string, caseId: string, raw: unknown): Promise<CaseFeedback> {
  const row = await usableCase(userId, caseId);
  const admin = await isAdmin(userId);
  if (row.status !== "open" && !admin) throw new Error("This case is closed to new answers");
  const answers = normaliseAnswers(raw);
  const missing = STEPS.filter((s) => !stepComplete(s.id, answers));
  if (missing.length) throw new Error("Still to answer: " + missing.map((s) => s.title).join(", "));

  const key = normaliseAnswers(row.answer_key);
  const { perStep, total } = scoreRead(stepList(row.scored_steps), key, answers);
  const sql = await getSql();
  const saved = await sql<SubmissionRow>`
    insert into submissions (id, user_id, case_id, answers, status, score_per_step, total_score, started_at, submitted_at, updated_at)
    values (${crypto.randomUUID()}, ${userId}, ${caseId}, ${JSON.stringify(answers)}::jsonb, 'submitted',
            ${JSON.stringify(perStep)}::jsonb, ${total}, now(), now(), now())
    on conflict (user_id, case_id) do update set
      answers = excluded.answers,
      status = 'submitted',
      score_per_step = excluded.score_per_step,
      total_score = excluded.total_score,
      submitted_at = now(),
      updated_at = now()
    where submissions.status = 'in_progress'
    returning id, answers, status, score_per_step, total_score, submitted_at
  `;
  if (!saved[0]) throw new Error("You have already submitted this case");
  return buildFeedback(row, saved[0]);
}

/** Admin only: clear their own attempt so they can preview a case again. */
export async function resetMyAttempt(userId: string, caseId: string) {
  if (!(await isAdmin(userId))) throw new Error("Admins only");
  const sql = await getSql();
  await sql`delete from submissions where user_id = ${userId} and case_id = ${caseId}`;
  return { ok: true };
}

export async function myStats(userId: string) {
  const sql = await getSql();
  const rows = await sql<{ reads: number; mean: number | string | null }>`
    select count(*) as reads, avg(total_score) as mean
    from submissions where user_id = ${userId} and status = 'submitted'
  `;
  const r = rows[0];
  return { reads: Number(r?.reads ?? 0), mean: r?.mean == null ? null : Number(r.mean) };
}
