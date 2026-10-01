import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { checkReset, submitReset } from "@/lib/lab/notify";

export const Route = createFileRoute("/reset")({
  validateSearch: (s: Record<string, unknown>) => ({ token: typeof s.token === "string" ? s.token : "" }),
  component: Reset,
});

function Reset() {
  const { token } = Route.useSearch();
  const [valid, setValid] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return setValid(false);
    checkReset({ data: { token } }).then(setValid).catch(() => setValid(false));
  }, [token]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await submitReset({ data: { token, password } });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="wrap narrow">
        {done ? (
          <section className="signin" aria-live="polite">
            <h2>Password changed</h2>
            <p className="signin-lead">You've been signed out everywhere. Sign in with your new password.</p>
            <Link className="btn block" to="/">Go to The Lab</Link>
          </section>
        ) : valid === false ? (
          <section className="signin">
            <h2>That link has expired</h2>
            <p className="signin-lead">Reset links work once and last an hour.</p>
            <Link className="btn block" to="/forgot">Send me a new one</Link>
          </section>
        ) : (
          <form className="signin" onSubmit={onSubmit} aria-busy={valid === null}>
            <h2>Choose a new password</h2>
            <label className="field">
              <span>New password</span>
              <input type="password" autoComplete="new-password" minLength={8} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            {error ? <p className="warn" role="alert">{error}</p> : null}
            <button className="btn block" type="submit" disabled={busy || valid === null}>
              {busy ? "Saving" : "Save password"}
            </button>
          </form>
        )}
      </main>
    </>
  );
}
