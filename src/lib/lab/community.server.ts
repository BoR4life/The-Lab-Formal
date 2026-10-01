/** Server only. Case discussion, reports and problem notes. */
import { getSql } from "@/lib/db";
import { loadProfile } from "./profile.server";

const AUTO_HIDE_AT = 3;
const MAX_PER_HOUR = 6;

export type Comment = {
  id: string;
  parentId: string | null;
  author: string;
  isAdmin: boolean;
  mine: boolean;
  body: string;
  createdAt: string;
  hidden: boolean;
  reports: number;
};

const iso = (d: Date | string) => (d instanceof Date ? d.toISOString() : new Date(d).toISOString());

async function hasSubmitted(userId: string, caseId: string) {
  const sql = await getSql();
  const r = await sql`select 1 from submissions where user_id = ${userId} and case_id = ${caseId} and status = 'submitted'`;
  return r.length > 0;
}

/** Discussion is for people who have finished their own read, so nobody gets spoilers. */
async function mayJoin(userId: string, caseId: string, role: string) {
  return role === "admin" || (await hasSubmitted(userId, caseId));
}

export async function listComments(userId: string, caseId: string): Promise<{ allowed: boolean; comments: Comment[] }> {
  const me = await loadProfile(userId);
  if (!(await mayJoin(userId, caseId, me.role))) return { allowed: false, comments: [] };
  const sql = await getSql();
  const rows = await sql<{
    id: string; parent_id: string | null; body: string; hidden: boolean; created_at: Date | string;
    user_id: string; first_name: string; role: string; reports: number;
  }>`
    select c.id, c.parent_id, c.body, c.hidden, c.created_at, c.user_id, u.first_name, u.role,
           (select count(*) from comment_reports r where r.comment_id = c.id) as reports
    from case_comments c join users u on u.id = c.user_id
    where c.case_id = ${caseId}
    order by c.created_at asc
  `;
  const admin = me.role === "admin";
  return {
    allowed: true,
    comments: rows
      .filter((r) => admin || !r.hidden)
      .map((r) => ({
        id: r.id,
        parentId: r.parent_id,
        author: r.first_name,
        isAdmin: r.role === "admin",
        mine: r.user_id === userId,
        body: r.hidden && !admin ? "" : r.body,
        createdAt: iso(r.created_at),
        hidden: r.hidden,
        reports: admin ? Number(r.reports) : 0,
      })),
  };
}

export async function postComment(userId: string, caseId: string, bodyRaw: string, parentId: string | null) {
  const me = await loadProfile(userId);
  if (!(await mayJoin(userId, caseId, me.role))) throw new Error("Finish your own read first, then join in.");
  const body = bodyRaw.replace(/\r\n/g, "\n").trim();
  if (!body) throw new Error("Write something first.");
  if (body.length > 1000) throw new Error("Keep it under 1,000 characters.");
  const sql = await getSql();
  const recent = await sql<{ n: number }>`
    select count(*) as n from case_comments where user_id = ${userId} and created_at > now() - interval '1 hour'
  `;
  if (Number(recent[0]?.n ?? 0) >= MAX_PER_HOUR) throw new Error("That's a lot of comments. Take a breather and try again soon.");
  if (parentId) {
    const p = await sql<{ parent_id: string | null }>`select parent_id from case_comments where id = ${parentId} and case_id = ${caseId}`;
    if (!p[0]) throw new Error("That comment is gone.");
    if (p[0].parent_id) parentId = p[0].parent_id; // one level of replies
  }
  await sql`
    insert into case_comments (id, case_id, user_id, parent_id, body)
    values (${crypto.randomUUID()}, ${caseId}, ${userId}, ${parentId}, ${body})
  `;
  return { ok: true };
}

export async function reportComment(userId: string, commentId: string, reason: string) {
  const me = await loadProfile(userId);
  const sql = await getSql();
  const c = await sql<{ case_id: string; user_id: string }>`select case_id, user_id from case_comments where id = ${commentId}`;
  if (!c[0]) throw new Error("That comment is gone.");
  if (!(await mayJoin(userId, c[0].case_id, me.role))) throw new Error("Not available");
  if (c[0].user_id === userId) throw new Error("That one's yours. You can delete it instead.");
  await sql`
    insert into comment_reports (id, comment_id, user_id, reason)
    values (${crypto.randomUUID()}, ${commentId}, ${userId}, ${reason.slice(0, 300)})
    on conflict (comment_id, user_id) do nothing
  `;
  const n = await sql<{ n: number }>`select count(*) as n from comment_reports where comment_id = ${commentId}`;
  if (Number(n[0]?.n ?? 0) >= AUTO_HIDE_AT) await sql`update case_comments set hidden = true where id = ${commentId}`;
  return { ok: true };
}

export async function deleteComment(userId: string, commentId: string) {
  const me = await loadProfile(userId);
  const sql = await getSql();
  const c = await sql<{ user_id: string }>`select user_id from case_comments where id = ${commentId}`;
  if (!c[0]) return { ok: true };
  if (c[0].user_id !== userId && me.role !== "admin") throw new Error("Not yours to delete");
  await sql`delete from case_comments where id = ${commentId}`;
  return { ok: true };
}

export async function setHidden(userId: string, commentId: string, hidden: boolean) {
  const me = await loadProfile(userId);
  if (me.role !== "admin") throw new Error("Admins only");
  const sql = await getSql();
  await sql`update case_comments set hidden = ${hidden} where id = ${commentId}`;
  if (!hidden) await sql`delete from comment_reports where comment_id = ${commentId}`;
  return { ok: true };
}

export async function addProblem(userId: string, caseId: string | null, message: string, replyEmail: string) {
  const me = await loadProfile(userId);
  const text = message.trim();
  if (!text) throw new Error("Tell us what went wrong.");
  const sql = await getSql();
  const recent = await sql<{ n: number }>`select count(*) as n from problem_reports where user_id = ${userId} and created_at > now() - interval '1 hour'`;
  if (Number(recent[0]?.n ?? 0) >= 5) throw new Error("Thanks, we've got your earlier notes.");
  await sql`
    insert into problem_reports (id, user_id, case_id, message, reply_email)
    values (${crypto.randomUUID()}, ${userId}, ${caseId}, ${text.slice(0, 2000)}, ${replyEmail.trim().slice(0, 200) || me.email})
  `;
  return { ok: true };
}

export async function listProblems(userId: string) {
  const me = await loadProfile(userId);
  if (me.role !== "admin") throw new Error("Admins only");
  const sql = await getSql();
  const rows = await sql<{ id: string; case_id: string | null; message: string; reply_email: string | null; created_at: Date | string }>`
    select id, case_id, message, reply_email, created_at from problem_reports order by created_at desc limit 30
  `;
  return rows.map((r) => ({ id: r.id, caseId: r.case_id, message: r.message, replyEmail: r.reply_email, createdAt: iso(r.created_at) }));
}

export async function reportedCount(userId: string) {
  const me = await loadProfile(userId);
  if (me.role !== "admin") throw new Error("Admins only");
  const sql = await getSql();
  const r = await sql<{ n: number }>`select count(distinct comment_id) as n from comment_reports`;
  return Number(r[0]?.n ?? 0);
}
