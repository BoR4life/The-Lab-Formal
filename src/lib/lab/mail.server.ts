/** Server only. One place that sends email (Resend) and knows the site address. */
import { getRequestUrl } from "@tanstack/react-start/server";

export const SITE_FALLBACK = "https://afterhoursinthelab.grok.me";

export { esc } from "./html.ts";
import { esc } from "./html.ts";

export function mailConfigured() {
  return !!(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}

/**
 * The address used in links we email. Never taken from a request header on the
 * live site, so a forged Host header cannot point a reset link somewhere else.
 */
export function siteOrigin(): string {
  const env = process.env.SITE_URL?.trim().replace(/\/+$/, "");
  if (env && /^https?:\/\/[^/\s]+$/.test(env)) return env;
  try {
    const o = getRequestUrl();
    if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/.test(o.hostname)) return o.origin;
  } catch {
    /* no request in scope */
  }
  return SITE_FALLBACK;
}

export async function sendMail(m: {
  to: string;
  subject: string;
  text: string;
  html: string;
  headers?: Record<string, string>;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!key || !from) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [m.to], subject: m.subject, text: m.text, html: m.html, headers: m.headers }),
  });
  return res.ok;
}

export function button(href: string, label: string) {
  return `<p><a href="${esc(href)}" style="background:#c1273b;color:#fff;padding:10px 16px;border-radius:999px;text-decoration:none;display:inline-block">${esc(label)}</a></p>`;
}
