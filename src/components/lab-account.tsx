import { useEffect, useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { authClient } from "@/lib/auth/client";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getMe } from "@/lib/lab/me";
import { getMyNotify, setMyNotify } from "@/lib/lab/notify";

const BEARER_KEY = "grok-auth.bearer-token";

type Mode = "in" | "up";

function storeBearer(response: Response) {
  const token = response.headers.get("set-auth-token");
  if (!token) return;
  try {
    sessionStorage.setItem(BEARER_KEY, token);
  } catch {
    /* preview storage can be blocked */
  }
}

type LabAccountProps = {
  /** Heading shown above the form. */
  title?: string;
  /** Replaces the default line under the heading. */
  lead?: string;
  /** Render nothing once signed in (used inside the case page). */
  hideWhenSignedIn?: boolean;
  /** Open on the create-account form. */
  startWithSignUp?: boolean;
};

export function LabAccount({ title, lead, hideWhenSignedIn, startWithSignUp }: LabAccountProps = {}) {
  const { user, isPending } = useCurrentUserState();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(startWithSignUp ? "up" : "in");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [wantsEmail, setWantsEmail] = useState(false);
  const [notify, setNotify] = useState<{ on: boolean; pending: boolean; emailed: boolean } | null>(null);
  const [notice, setNotice] = useState("");
  const [profile, setProfile] = useState<{ firstName: string; role: "learner" | "admin" } | null>(null);

  useEffect(() => {
    if (!user) {
      setNotify(null);
      return;
    }
    let off = false;
    getMyNotify()
      .then((v) => !off && setNotify(v))
      .catch(() => !off && setNotify(null));
    return () => {
      off = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    getMe()
      .then((row) => {
        if (!cancelled) setProfile(row);
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "up") {
        const { error: signUpError } = await authClient.signUp.email(
          { email: email.trim(), password, name: firstName.trim(), callbackURL: "/" },
          { onSuccess: (ctx) => storeBearer(ctx.response) },
        );
        if (signUpError) throw new Error(signUpError.message || "Could not create the account");
        if (wantsEmail) {
          try {
            await authClient.getSession();
            const next = await setMyNotify({ data: { on: true } });
            setNotify(next);
            setNotice(next.emailed ? "Check your inbox and click the link to confirm the new-case emails." : "");
            setNotice("Check your inbox to confirm the new-case emails.");
          } catch {
            /* the account exists; they can switch emails on from the home page */
          }
        }
      } else {
        const { error: signInError } = await authClient.signIn.email(
          { email: email.trim(), password, callbackURL: "/" },
          { onSuccess: (ctx) => storeBearer(ctx.response) },
        );
        if (signInError) throw new Error(signInError.message || "Email or password is wrong");
      }
      await authClient.getSession();
      await router.invalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  if (isPending) {
    return (
      <form className="signin" aria-busy="true">
                <h2>Sign in</h2>
        <p className="signin-lead">Checking this device.</p>
      </form>
    );
  }

  if (user && hideWhenSignedIn) return null;

  if (user) {
    const name = profile?.firstName || user.displayName || "there";
    const role = profile?.role === "admin" ? "Admin" : profile ? "Learner" : "…";
    return (
      <section className="signin" aria-live="polite">
        <p className="card-label">Signed in</p>
        <h2>{name}</h2>
        <p className="signin-lead">
          Role: <strong>{role}</strong>
        </p>
        {notify !== null ? (
          <label className="check">
            <input
              type="checkbox"
              checked={notify.on || notify.pending}
              onChange={async (e) => {
                const on = e.target.checked;
                const before = notify;
                setNotice("");
                try {
                  const next = await setMyNotify({ data: { on } });
                  setNotify(next);
                  if (next.pending) {
                    setNotice(
                      next.emailed
                        ? "Check your inbox and click the link to confirm."
                        : "We couldn't send the confirmation email just now. Try again later.",
                    );
                  }
                } catch {
                  setNotify(before);
                }
              }}
            />
            <span>Email me when a new case goes live</span>
          </label>
        ) : null}
        {notify?.pending ? <p className="signin-lead">Waiting for you to confirm by email.</p> : null}
        {notice ? <p className="signin-lead" role="status">{notice}</p> : null}
        <UserButton />
      </section>
    );
  }

  return (
    <form className="signin" onSubmit={onSubmit}>
            <h2>{title ?? (mode === "up" ? "Create an account" : "Sign in")}</h2>
      <p className="signin-lead">
        {lead ?? (mode === "up"
          ? "Anyone can join. Your name and email are stored with your account, not only on this device."
          : "Use the email and password for your account.")}
      </p>
      {mode === "up" ? (
        <label className="field">
          <span>First name</span>
          <input
            name="name"
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </label>
      ) : null}
      <label className="field">
        <span>Email</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>
      <label className="field">
        <span>Password</span>
        <input
          name="password"
          type="password"
          autoComplete={mode === "up" ? "new-password" : "current-password"}
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>
      {mode === "up" ? (
        <label className="check">
          <input type="checkbox" checked={wantsEmail} onChange={(e) => setWantsEmail(e.target.checked)} />
          <span>Email me when a new case goes live</span>
        </label>
      ) : null}
      {error ? (
        <p className="warn" role="alert">
          {error}
        </p>
      ) : null}
      {mode === "in" ? (
        <p className="signin-lead">
          <Link to="/forgot">Forgot your password?</Link>
        </p>
      ) : null}
      <button className="btn block" type="submit" disabled={busy}>
        {busy ? "Working" : mode === "up" ? "Create account" : "Continue"}
      </button>
      <button
        className="btn secondary block"
        type="button"
        onClick={() => {
          setMode(mode === "up" ? "in" : "up");
          setError("");
        }}
      >
        {mode === "up" ? "I already have an account" : "Create an account"}
      </button>
    </form>
  );
}
