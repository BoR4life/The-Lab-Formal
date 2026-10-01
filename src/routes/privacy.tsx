import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/privacy")({ component: Privacy });

function Privacy() {
  return (
    <>
      <SiteHeader />
      <main className="wrap narrow prose">
        <h1>Privacy</h1>
        <p>The Lab is a free learning resource run by Bundle of Rays. This is what it keeps and why.</p>

        <h2>What we keep</h2>
        <p>
          Your first name, email address and password (stored scrambled, never in plain text), plus the reads you submit and
          your scores. If you tick the box, we also remember that you want new-case emails.
        </p>

        <h2>What we use it for</h2>
        <p>
          To run the cases, show you your results, and, only if you opt in, email you when a new case goes live. Every email
          has an unsubscribe link that works in one click.
        </p>

        <h2>Who sees it</h2>
        <p>
          Only the person who runs The Lab. We don't sell or share your details, and we don't pass individual reads to
          employers. Anything we publish about how learners are doing is combined, not individual.
        </p>

        <h2>The cases</h2>
        <p>
          Cases are for learning, not for making clinical decisions. ECGs are de-identified before they go up, and a case
          never shows a patient's name or details.
        </p>

        <h2>Cookies</h2>
        <p>One session cookie to keep you signed in. No advertising or tracking cookies.</p>

        <h2>Deleting your data</h2>
        <p>
          Email <a href="mailto:brad@bundleofrays.com">brad@bundleofrays.com</a> and I'll delete your account and every read
          attached to it.
        </p>

        <p className="fine">Last updated 01 Oct 2026.</p>
        <p>
          <Link to="/">Back to The Lab</Link>
        </p>
      </main>
    </>
  );
}
