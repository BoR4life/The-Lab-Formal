/** Server only. Forgot-password and newsletter confirmation. */
import { createHash, randomBytes } from "node:crypto";
import { getSql } from "@/lib/db";
import { loadProfile } from "./profile.server";
import { button, esc, mailConfigured, sendMail, siteOrigin } from "./mail.server";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const TOKEN = /^[a-f0-9]{64}$/;

/** Always answers the same way, so the form cannot be used to find who has an account. */
export async function requestPasswordReset(emailRaw: string) {
  const email = emailRaw.trim().toLowerCase();
  const sql = await getSql();
  const users = await sql<{ id: string; name: string }>`
    select id, name from "user" where lower(email) = ${email}
  `;
  const u = users[0];
  if (!u || !mailConfigured()) return { ok: true };
  const recent = await sql<{ n: number }>`
    select count(*) as n from password_resets where user_id = ${u.id} and created_at > now() - interval '2 minutes'
  `;
  if (Number(recent[0]?.n ?? 0) > 0) return { ok: true };

  const token = randomBytes(32).toString("hex");
  await sql`
    insert into password_resets (token_hash, user_id, expires_at)
    values (${sha(token)}, ${u.id}, now() + interval '1 hour')
  `;
  const link = `${siteOrigin()}/reset?token=${token}`;
  const first = u.name.trim().split(/\s+/)[0] || "there";
  await sendMail({
    to: email,
    subject: "Reset your password for The Lab",
    text: `Hi ${first},\n\nUse this link to choose a new password. It works once and expires in an hour:\n${link}\n\nIf you didn't ask for this, ignore this email. Nothing has changed.\n\nBrad Chesham, RN\nThe Lab`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:520px;color:#16181d;line-height:1.5"><p>Hi ${esc(first)},</p><p>Use this button to choose a new password. It works once and expires in an hour.</p>${button(link, "Choose a new password")}<p style="font-size:12px;color:#777">If you didn't ask for this, ignore this email. Nothing has changed.</p></div>`,
  });
  return { ok: true };
}

export async function checkResetToken(token: string): Promise<boolean> {
  if (!TOKEN.test(token)) return false;
  const sql = await getSql();
  const r = await sql`
    select 1 from password_resets where token_hash = ${sha(token)} and used_at is null and expires_at > now()
  `;
  return r.length > 0;
}

export async function resetPassword(token: string, password: string) {
  if (!TOKEN.test(token)) throw new Error("That link has expired. Ask for a new one.");
  if (password.length < 8 || password.length > 128) throw new Error("Use a password of 8 to 128 characters.");
  const sql = await getSql();
  const rows = await sql<{ user_id: string }>`
    update password_resets set used_at = now()
    where token_hash = ${sha(token)} and used_at is null and expires_at > now()
    returning user_id
  `;
  const row = rows[0];
  if (!row) throw new Error("That link has expired. Ask for a new one.");

  const { auth } = await import("@/lib/auth/server");
  const ctx = await auth.$context;
  const hash = await ctx.password.hash(password);
  const done = await sql`
    update "account" set "password" = ${hash}, "updatedAt" = now()
    where "userId" = ${row.user_id} and "providerId" = 'credential' returning id
  `;
  if (!done.length) throw new Error("This account signs in another way, so it has no password to reset.");
  await sql`delete from "session" where "userId" = ${row.user_id}`;
  return { ok: true };
}

/** Turn newsletter on: sends a confirmation email. It only counts once they click it. */
export async function startNotify(userId: string) {
  await loadProfile(userId);
  const sql = await getSql();
  const rows = await sql<{ email: string; first_name: string; notify_new_cases: boolean }>`
    select email, first_name, notify_new_cases from users where id = ${userId}
  `;
  const u = rows[0];
  if (!u) throw new Error("No account for this session");
  if (u.notify_new_cases) return { on: true, pending: false, emailed: true };
  const token = randomBytes(32).toString("hex");
  await sql`update users set notify_confirm_token = ${token} where id = ${userId}`;
  const link = `${siteOrigin()}/confirm?token=${token}`;
  const emailed = await sendMail({
    to: u.email,
    subject: "Confirm: email me when a new case goes live",
    text: `Hi ${u.first_name},\n\nYou asked for an email when a new case goes live on The Lab. Confirm it here:\n${link}\n\nIf this wasn't you, ignore this email and you won't hear from us.\n\nBrad Chesham, RN\nThe Lab`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:520px;color:#16181d;line-height:1.5"><p>Hi ${esc(u.first_name)},</p><p>You asked for an email when a new case goes live on The Lab. Please confirm it.</p>${button(link, "Yes, email me")}<p style="font-size:12px;color:#777">If this wasn't you, ignore this email and you won't hear from us.</p></div>`,
  });
  return { on: false, pending: true, emailed };
}

export async function stopNotify(userId: string) {
  await loadProfile(userId);
  const sql = await getSql();
  await sql`update users set notify_new_cases = false, notify_confirm_token = null where id = ${userId}`;
  return { on: false, pending: false, emailed: true };
}

/** Public. The token is the credential; the person must be able to read the inbox. */
export async function confirmNotify(token: string): Promise<boolean> {
  if (!TOKEN.test(token)) return false;
  const sql = await getSql();
  const r = await sql`
    update users set notify_new_cases = true, notify_confirm_token = null
    where notify_confirm_token = ${token} returning id
  `;
  return r.length > 0;
}

export async function notifyState(userId: string) {
  await loadProfile(userId);
  const sql = await getSql();
  const rows = await sql<{ notify_new_cases: boolean; notify_confirm_token: string | null }>`
    select notify_new_cases, notify_confirm_token from users where id = ${userId}
  `;
  return { on: !!rows[0]?.notify_new_cases, pending: !!rows[0]?.notify_confirm_token, emailed: true };
}
