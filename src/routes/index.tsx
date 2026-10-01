import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminNotify } from "@/components/admin-notify";
import { Lub } from "@/components/lub";
import { RibbonSculpture } from "@/components/ribbon-sculpture";
import { LabAccount } from "@/components/lab-account";
import { ParallaxImage } from "@/components/parallax-image";
import { ScrollTrace } from "@/components/scroll-trace";
import { SiteHeader } from "@/components/site-header";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getAdminCaseList, getCurrentCase, getMyAttempt, getOpenCases, getMyStats } from "@/lib/lab/cases";
import { getMe } from "@/lib/lab/me";

export const Route = createFileRoute("/")({
  loader: async () => {
    const [current, all] = await Promise.all([getCurrentCase(), getOpenCases()]);
    return { current, earlier: all.filter((c) => c.id !== current?.id) };
  },
  component: Home,
});

type AdminRow = { id: string; title: string; status: string; case_number: number; submissions: number };

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  open: "Open",
  closed: "Closed",
  feedback: "Feedback released",
};

const HOW = [
  {
    title: "Read the story",
    body: "A short vignette: who the patient is, and why they're in front of you.",
    img: "still-line",
    alt: "A flat line on paper with a single red dot.",
    pos: "pos-low",
  },
  {
    title: "Work the trace",
    body: "Rate, rhythm, axis, P waves, intervals, Q waves, ST, T and QT, one step at a time. Open the full 12-lead and zoom whenever you need to.",
    img: "still-glass-5",
    alt: "A glass cardiac monitor with its leads.",
  },
  {
    title: "See the key",
    body: "Submit, then see your read beside the verified key, a reason for anything you missed, and one teaching point to keep.",
    img: "still-heart-2",
    alt: "A small red heart on pale paper.",
  },
];

function Home() {
  const { current, earlier } = Route.useLoaderData();
  const { user, isPending } = useCurrentUserState();
  const [me, setMe] = useState<{ firstName: string; role: "learner" | "admin" } | null>(null);
  const [stats, setStats] = useState<{ reads: number; mean: number | null } | null>(null);
  const [attempt, setAttempt] = useState<"none" | "in_progress" | "submitted" | null>(null);
  const [adminCases, setAdminCases] = useState<AdminRow[]>([]);
  const userId = user?.id;
  const caseId = current?.id;

  useEffect(() => {
    if (!userId) {
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
          caseId ? getMyAttempt({ data: { caseId } }) : Promise.resolve(null),
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
  }, [userId, caseId]);

  const cta = !user
    ? "Read the latest case"
    : attempt === "submitted"
      ? "See your feedback"
      : attempt === "in_progress"
        ? "Continue your read"
        : "Start the latest case";

  return (
    <>
      <SiteHeader />
      <main className="home">
        <section className="hero">
          <div className="hero-copy">
            {me ? <p className="hello">Welcome back, {me.firstName}.</p> : null}
            <h1 className="wordmark">
              The Lab<span className="stop">.</span>
              <span className="wordmark-sub">Your call.</span>
            </h1>
            <p className="lede">
              One 12-lead, one patient story, one systematic read, step by step. About ten minutes, free for any nurse. New cases are added as they're ready, and every case stays open.
            </p>
            <div className="hero-actions">
              {current ? (
                <Link to="/case/$caseId" params={{ caseId: current.id }} className="btn btn-lg">
                  {cta}
                </Link>
              ) : (
                <p className="hero-wait">The first case is on its way.</p>
              )}
              <a href="#how" className="text-link">
                How it works
              </a>
            </div>
            {stats && stats.reads > 0 ? (
              <p className="stats-line">
                You've read <strong>{stats.reads}</strong> {stats.reads === 1 ? "case" : "cases"}
                {stats.mean != null ? `, averaging ${Math.round(stats.mean * 100)}%.` : "."}
              </p>
            ) : null}
          </div>
          <div className="hero-art">
            <RibbonSculpture className="hero-sculpture" />
            <ParallaxImage
              name="heart-cutout"
              alt="An anatomical human heart."
              className="hero-image cutout"
              drift={36}
              priority
              sizes="(min-width: 880px) 40vw, 80vw"
            />
            <span className="sticker" aria-hidden="true">
              Free for every nurse
            </span>
          </div>
        </section>

        <ScrollTrace caption="Every read starts from the baseline. Work it the same way each time, and the patterns start to jump out." />

        <section id="how" className="how" aria-labelledby="how-title">
          <h2 id="how-title" className="section-title">
            How a case works
          </h2>
          <ol className="how-steps">
            {HOW.map((s, i) => (
              <li key={s.title} className="how-step">
                <ParallaxImage name={s.img} alt={s.alt} className={`how-image ${"pos" in s ? s.pos : ""}`} drift={i % 2 ? 28 : 20} sizes="(min-width: 880px) 30vw, 100vw" />
                <div className="how-text">
                  <span className="how-n" aria-hidden="true">
                    {i + 1}
                  </span>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="this-week" aria-labelledby="tw-title">
          <div className="tw-case">
            <h2 id="tw-title" className="section-title">
              Latest case
            </h2>
            {current ? (
              <>
                <p className="tw-title">{current.title}</p>
                <p className="tw-vignette">{current.vignette}</p>
                <Link to="/case/$caseId" params={{ caseId: current.id }} className="btn">
                  {cta}
                </Link>
                {!user ? <p className="fine">No account needed to read it. You'll only need one to submit.</p> : null}
              </>
            ) : (
              <p className="tw-vignette">Nothing is open right now. New cases are added as they're ready.</p>
            )}
          </div>
          {!isPending && !user ? (
            <div className="tw-account">
              <LabAccount
                title="Keep your progress"
                lead="A free account saves your reads, so you can see how you're tracking over time."
                startWithSignUp
              />
            </div>
          ) : null}
        </section>

        {earlier.length ? (
          <section className="earlier" aria-labelledby="earlier-title">
            <h2 id="earlier-title" className="section-title">
              Earlier cases
            </h2>
            <ul className="case-list">
              {earlier.map((c) => (
                <li key={c.id}>
                  <Link to="/case/$caseId" params={{ caseId: c.id }} className="case-link">
                    <span className="case-title">{c.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {me?.role === "admin" ? (
          <section className="admin-block" aria-labelledby="admin-title">
            <h2 id="admin-title" className="section-title">
              All cases <span className="admin-tag">Admin</span>
            </h2>
            <ul className="case-list">
              {adminCases.map((c) => (
                <li key={c.id}>
                  <Link to="/case/$caseId" params={{ caseId: c.id }} className="case-link">
                    <span className="case-title">{c.title}</span>
                    <span className="case-meta">
                      Case {c.case_number}. {STATUS_LABEL[c.status] ?? c.status}.{" "}
                      {c.submissions} {Number(c.submissions) === 1 ? "submission" : "submissions"}.
                    </span>
                  </Link>
                </li>
              ))}
              {!adminCases.length ? <li className="fine">No cases yet.</li> : null}
            </ul>
            <AdminNotify />
          </section>
        ) : null}

        <footer className="site-foot">
          <Lub className="foot-lub" />
          <p>
            The Lab is a free learning resource from{" "}
            <a href="https://bundleofrays.com" target="_blank" rel="noopener noreferrer">
              Bundle of Rays
            </a>
            . It's for education, not clinical decision-making.{" "}
            <Link to="/privacy">Privacy</Link>
          </p>
        </footer>
      </main>
    </>
  );
}
