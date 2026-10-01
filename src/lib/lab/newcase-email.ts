import { esc } from "./html.ts";

export function buildNewCaseEmail(origin: string, c: { id: string; title: string; vignette: string }, firstName: string, token: string) {
  const link = `${origin}/case/${c.id}`;
  const stop = `${origin}/unsubscribe?token=${token}`;
  const teaser = c.vignette.length > 220 ? c.vignette.slice(0, 217).trimEnd() + "..." : c.vignette;
  const subject = `New case live: ${c.title}`;
  const text = [
    `Hi ${firstName},`,
    "",
    `${c.title} is live on The Lab. About ten minutes, free, same step-by-step read.`,
    "",
    teaser,
    "",
    `Read it here: ${link}`,
    "",
    "Brad Chesham, RN",
    "The Lab, a free learning resource from Bundle of Rays",
    "",
    `You're getting this because you asked for new-case emails. Unsubscribe: ${stop}`,
  ].join("\n");
  const html = `<div style="font-family:system-ui,sans-serif;max-width:520px;color:#16181d;line-height:1.5">
<p>Hi ${esc(firstName)},</p>
<p><strong>${esc(c.title)}</strong> is live on The Lab. About ten minutes, free, same step-by-step read.</p>
<p style="color:#555">${esc(teaser)}</p>
<p><a href="${link}" style="background:#c1273b;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;display:inline-block">Read the case</a></p>
<p>Brad Chesham, RN<br>The Lab, a free learning resource from Bundle of Rays</p>
<p style="font-size:12px;color:#777">You're getting this because you asked for new-case emails. <a href="${stop}">Unsubscribe</a></p>
</div>`;
  return { subject, text, html, stop };
}

