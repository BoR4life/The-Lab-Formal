import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { confirmNotifyToken } from "@/lib/lab/notify";

export const Route = createFileRoute("/confirm")({
  validateSearch: (s: Record<string, unknown>) => ({ token: typeof s.token === "string" ? s.token : "" }),
  component: Confirm,
});

function Confirm() {
  const { token } = Route.useSearch();
  const [state, setState] = useState<"working" | "done" | "bad">("working");
  useEffect(() => {
    if (!token) return setState("bad");
    confirmNotifyToken({ data: { token } })
      .then((ok) => setState(ok ? "done" : "bad"))
      .catch(() => setState("bad"));
  }, [token]);
  return (
    <>
      <SiteHeader />
      <main className="wrap narrow prose">
        <h1>{state === "done" ? "You're on the list" : state === "bad" ? "That link didn't work" : "One moment"}</h1>
        <p>
          {state === "done"
            ? "We'll email you when a new case goes live. Every email has a one-click unsubscribe."
            : state === "bad"
              ? "The link may have been used already or be incomplete. Sign in and tick the new-case emails box again to get a fresh one."
              : "Confirming your email."}
        </p>
      </main>
    </>
  );
}
