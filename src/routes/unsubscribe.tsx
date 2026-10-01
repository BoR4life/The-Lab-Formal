import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { unsubscribeWithToken } from "@/lib/lab/notify";

export const Route = createFileRoute("/unsubscribe")({
  validateSearch: (s: Record<string, unknown>) => ({ token: typeof s.token === "string" ? s.token : "" }),
  component: Unsubscribe,
});

function Unsubscribe() {
  const { token } = Route.useSearch();
  const [state, setState] = useState<"working" | "done" | "bad">("working");
  useEffect(() => {
    if (!token) {
      setState("bad");
      return;
    }
    unsubscribeWithToken({ data: { token } })
      .then((ok) => setState(ok ? "done" : "bad"))
      .catch(() => setState("bad"));
  }, [token]);
  return (
    <>
      <SiteHeader />
      <main className="wrap narrow prose">
        <h1>{state === "done" ? "You're unsubscribed" : state === "bad" ? "That link didn't work" : "One moment"}</h1>
        <p>
          {state === "done"
            ? "You won't get new-case emails any more. Your account and reads are untouched, and you can switch emails back on from the home page whenever you like."
            : state === "bad"
              ? "The link may be incomplete. Sign in and turn new-case emails off from the home page, or email brad@bundleofrays.com and I'll do it."
              : "Updating your email settings."}
        </p>
      </main>
    </>
  );
}
