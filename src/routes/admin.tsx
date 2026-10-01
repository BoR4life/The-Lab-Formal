import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminNotify } from "@/components/admin-notify";
import { SiteHeader } from "@/components/site-header";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { adminCreateCase, adminResults, adminResultsCsv } from "@/lib/lab/admin";
import { getProblems } from "@/lib/lab/community";

export const Route = createFileRoute("/admin")({ component: Admin });

type Results = Awaited<ReturnType<typeof adminResults>>;
type Problems = Awaited<ReturnType<typeof getProblems>>;
const date = (iso: string) => new Date(iso).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });

function Admin() {
  const { user, isPending } = useCurrentUserState();
  const nav = useNavigate();
  const [rows, setRows] = useState<Results | null>(null);
  const [problems, setProblems] = useState<Problems>([]);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isPending) return;
    if (!user) return setDenied(true);
    Promise.all([adminResults(), getProblems()])
      .then(([r, p]) => {
        setRows(r);
        setProblems(p);
      })
      .catch(() => setDenied(true));
  }, [user, isPending]);

  async function newCase() {
    try {
      const r = await adminCreateCase();
      nav({ to: "/admin/case/$caseId", params: { caseId: r.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create");
    }
  }

  async function csv() {
    const text = await adminResultsCsv();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
    a.download = "the-lab-results.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (denied || !rows) {
    return (
      <>
        <SiteHeader />
        <main className="wrap narrow prose">
          <p>{denied ? "Admins only. Sign in as the site owner." : "Loading"}</p>
        </main>
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="wrap admin-page">
        <h1 className="h-page">Admin</h1>
        <div className="row-actions">
          <button type="button" className="btn" onClick={newCase}>New case</button>
          <button type="button" className="btn secondary" onClick={csv}>Download results (CSV)</button>
        </div>
        {error ? <p className="warn" role="alert">{error}</p> : null}

        <section>
          <h2 className="section-title">Cases and results</h2>
          <div className="table-wrap">
            <table className="results">
              <thead>
                <tr><th>Case</th><th>Status</th><th>Started</th><th>Finished</th><th>Median min</th><th>Mean score</th><th /></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.title}</td>
                    <td>{r.status}</td>
                    <td>{r.started}</td>
                    <td>{r.submitted}{r.completionPct != null ? ` (${r.completionPct}%)` : ""}</td>
                    <td>{r.medianMinutes ?? "n/a"}</td>
                    <td>{r.meanScore == null ? "n/a" : `${r.meanScore}%`}</td>
                    <td><Link to="/admin/case/$caseId" params={{ caseId: r.id }}>Edit</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.filter((r) => r.steps.length).map((r) => (
            <details key={r.id} className="step-rates">
              <summary>{r.title}: how each step went</summary>
              <ul>
                {[...r.steps].sort((a, b) => a.correctPct - b.correctPct).map((s) => (
                  <li key={s.id}><span>{s.title}</span><strong>{s.correctPct}% fully correct</strong></li>
                ))}
              </ul>
            </details>
          ))}
        </section>

        <section>
          <h2 className="section-title">Problem reports</h2>
          {problems.length ? (
            <ul className="problem-list">
              {problems.map((p) => (
                <li key={p.id}>
                  <p>{p.message}</p>
                  <p className="fine">{date(p.createdAt)}{p.caseId ? `, ${p.caseId}` : ""}{p.replyEmail ? `, ${p.replyEmail}` : ""}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="fine">Nothing reported.</p>
          )}
        </section>

        <section>
          <h2 className="section-title">New-case email</h2>
          <AdminNotify />
        </section>
      </main>
    </>
  );
}
