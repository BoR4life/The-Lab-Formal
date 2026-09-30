import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LabAccount } from "@/components/lab-account";
import { SiteHeader } from "@/components/site-header";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getAdminCaseList, getCurrentCase, getMyAttempt, getMyStats } from "@/lib/lab/cases";
import { getMe } from "@/lib/lab/me";

export const Route = createFileRoute("/")({
  loader: () => getCurrentCase(),
  component: Home,
});

type AdminRow = { id: string; title: string; status: string; month: number; week: number; submissions: number };

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  open: "Open",
  closed: "Closed",
  feedback: "Feedback released",
};

function Home() {
  const current = Route.useLoaderData();
  const { user, isPending } = useCurrentUserState();
  const [me, setMe] = useState<{ firstName: string; role: "learner" | "admin" } | null>(null);
  const [stats, setStats] = useState<{ reads: number; mean: number | null } | null>(null);
  const [attempt, setAttempt] = useState<"none" | "in_progress" | "submitted" | null>(null);
  const [adminCases, setAdminCases] = useState<AdminRow[]>([]);

  useEffect(() => {
    if (!user) {
      setMe(null);
      setStats(null);
      setAttempt(null);
      setAdminCases([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const profile = await getMe();
        if (cancelled) return;
        setMe(profile);
        const [s, a, list] = await Promise.all([
          getMyStats(),
          current ? getMyAttempt({ data: { caseId: current.id } }) : Promise.resolve(null),
          profile.role === "admin" ? getAdminCaseList() : Promise.resolve([] as AdminRow[]),
        ]);
        if (cancelled) return;
        setStats(s);
        setAttempt(a ? a.state : null);
        setAdminCases(list);
      } catch {
        /* the page still works without the extras */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, current?.id]);

  const cta =
    attempt === "submitted" ? "See your feedback" : attempt === "in_progress" ? "Continue your read" : "Start the read";

  return (
    <>
      <SiteHeader />
      <main className="wrap">
        <div className="landing-head">
          <p className="eyebrow">Twelve Leads</p>
          <h1>
            The Lab<span className="stop">.</span> Your call.
          </h1>
          <p className="lede">A 12-lead, a short story, ten steps. About ten minutes, every week. Free for any nurse.</p>
        </div>

        <div className="entry">
          <section className="card this-week" aria-labelledby="tw-title">
            <p className="eyebrow">{me ? `Hi ${me.firstName} · this week` : "This week"}</p>
            {current ? (
              <>
                <h2 id="tw-title">{current.title}</h2>
                <p className="vignette-preview">{current.vignette.split("\n").slice(0, 2).join(" · ")}</p>
                <Link to="/case/$caseId" params={{ caseId: current.id }} className="btn block as-link">
                  {user ? cta : "Read this week's case"}
                </Link>
                {!user ? <p className="fine">No account needed to read it. You'll only need one to submit.</p> : null}
              </>
            ) : (
              <>
                <h2 id="tw-title">The next case is on its way</h2>
                <p className="fine">A new case opens every Monday.</p>
              </>
            )}
            {stats ? (
              <p className="stats-line">
                <strong>{stats.reads}</strong> {stats.reads === 1 ? "read" : "reads"} completed
                {stats.mean != null ? ` · average ${Math.round(stats.mean * 100)}%` : ""}
              </p>
            ) : null}
          </section>

          {!isPending && !user ? <LabAccount /> : null}
        </div>

        {me?.role === "admin" ? (
          <section className="admin-block" aria-labelledby="admin-title">
            <p className="eyebrow">Admin</p>
            <h2 id="admin-title" className="section-title">
              All cases
            </h2>
            <ul className="case-list">
              {adminCases.map((c) => (
                <li key={c.id}>
                  <Link to="/case/$caseId" params={{ caseId: c.id }} className="case-link">
                    <span className="meta">
                      Month {c.month} · Week {c.week} · {STATUS_LABEL[c.status] ?? c.status}
                    </span>
                    <span className="case-title">{c.title}</span>
                    <span className="fine">
                      {c.submissions} {Number(c.submissions) === 1 ? "submission" : "submissions"} · Preview
                    </span>
                  </Link>
                </li>
              ))}
              {!adminCases.length ? <li className="fine">No cases yet.</li> : null}
            </ul>
          </section>
        ) : null}

        <footer className="site-foot">
          <p className="fine">
            The Lab is a free learning resource from{" "}
            <a href="https://bundleofrays.com" target="_blank" rel="noopener noreferrer">
              Bundle of Rays
            </a>
            . It is for education, not clinical decision-making.
          </p>
        </footer>
      </main>
    </>
  );
}
