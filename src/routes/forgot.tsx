import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { requestReset } from "@/lib/lab/notify";

export const Route = createFileRoute("/forgot")({ component: Forgot });

function Forgot() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    try {
      await requestReset({ data: { email: email.trim() } });
      setState("sent");
    } catch {
      setState("error");
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="wrap narrow">
        {state === "sent" ? (
          <section className="signin" aria-live="polite">
            <h2>Check your inbox</h2>
            <p className="signin-lead">
              If there's an account for that email, a reset link is on its way. It works once and lasts an hour.
              Nothing arrived? Check spam, or email brad@bundleofrays.com.
            </p>
            <Link className="btn secondary block" to="/">Back to The Lab</Link>
          </section>
        ) : (
          <form className="signin" onSubmit={onSubmit}>
            <h2>Reset your password</h2>
            <p className="signin-lead">Enter the email you signed up with and we'll send you a link.</p>
            <label className="field">
              <span>Email</span>
              <input type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            {state === "error" ? <p className="warn" role="alert">Something went wrong. Try again.</p> : null}
            <button className="btn block" type="submit" disabled={state === "busy"}>
              {state === "busy" ? "Sending" : "Send the link"}
            </button>
          </form>
        )}
      </main>
    </>
  );
}
