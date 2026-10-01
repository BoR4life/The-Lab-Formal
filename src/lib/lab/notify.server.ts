/** Server only. Opt-in new-case email: preferences, unsubscribe and sending. */
import { getSql } from "@/lib/db";
import { loadProfile } from "./profile.server";

import { mailConfigured } from "./mail.server";
import { buildNewCaseEmail } from "./newcase-email.ts";

async function requireAdmin(userId: string) {
  const p = await loadProfile(userId);
  if (p.role !== "admin") throw new Error("Admins only");
}

/** Public. The token is the credential; it only ever switches email off. */
export async function unsubscribe(token: string): Promise<boolean> {
  if (!/^[a-f0-9]{32,64}$/.test(token)) return false;
  const sql = await getSql();
  const rows = await sql<{ id: string }>`
    update users set notify_new_cases = false, notify_confirm_token = null where unsubscribe_token = ${token} returning id
  `;
  return rows.length > 0;
}

export async function notifyInfo(userId: string) {
  await requireAdmin(userId);
  const sql = await getSql();
  const [count] = await sql<{ n: number | string }>`select count(*) as n from users where notify_new_cases`;
  const latest = await sql<{ id: string; title: string; case_number: number }>`
    select id, title, case_number from cases where status = 'open' order by case_number desc, updated_at desc limit 1
  `;
  const sent = latest[0]
    ? await sql<{ sent_at: Date | string; recipients: number }>`
        select sent_at, recipients from case_emails where case_id = ${latest[0].id} order by sent_at desc limit 1
      `
    : [];
  return {
    subscribers: Number(count?.n ?? 0),
    configured: mailConfigured(),
    latest: latest[0] ? { id: latest[0].id, title: latest[0].title } : null,
    lastSent: sent[0]
      ? { at: sent[0].sent_at instanceof Date ? sent[0].sent_at.toISOString() : String(sent[0].sent_at), recipients: sent[0].recipients }
      : null,
  };
}

export async function sendNewCaseEmail(userId: string, origin: string, again: boolean) {
  await requireAdmin(userId);
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!key || !from) throw new Error("Email sending isn't set up yet.");
  if (!/^https?:\/\/[^/\s]+$/.test(origin)) throw new Error("Bad site address");
  const info = await notifyInfo(userId);
  if (!info.latest) throw new Error("No open case to announce.");
  if (info.lastSent && !again) throw new Error("This case has already been emailed.");

  const sql = await getSql();
  const [c] = await sql<{ id: string; title: string; vignette: string }>`
    select id, title, vignette from cases where id = ${info.latest.id}
  `;
  const people = await sql<{ first_name: string; email: string; unsubscribe_token: string }>`
    select first_name, email, unsubscribe_token from users where notify_new_cases order by created_at
  `;
  if (!people.length) throw new Error("Nobody has opted in yet.");

  let sent = 0;
  for (let i = 0; i < people.length; i += 100) {
    const batch = people.slice(i, i + 100).map((p) => {
      const m = buildNewCaseEmail(origin, c, p.first_name, p.unsubscribe_token);
      return {
        from,
        to: [p.email],
        subject: m.subject,
        text: m.text,
        html: m.html,
        headers: { "List-Unsubscribe": `<${m.stop}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
      };
    });
    const res = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(batch),
    });
    if (!res.ok) throw new Error(`The email service refused the send (${res.status}). ${sent} sent before it stopped.`);
    sent += batch.length;
  }
  await sql`insert into case_emails (case_id, subject, recipients) values (${c.id}, ${`New case live: ${c.title}`}, ${sent})`;
  return { sent };
}
