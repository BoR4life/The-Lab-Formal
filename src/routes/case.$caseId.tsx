import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { EcgViewer } from "@/components/ecg-viewer";
import { FeedbackView } from "@/components/feedback-view";
import { LabAccount } from "@/components/lab-account";
import { ReadSteps } from "@/components/read-steps";
import { SiteHeader } from "@/components/site-header";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { type Answers, type CaseFeedback, type PublicCase, blankAnswers, normaliseAnswers } from "@/lib/lab/ecg";
import {
  getAdminCase,
  getMyAttempt,
  getPublicCase,
  resetMyPreview,
  saveMyProgress,
  submitMyRead,
} from "@/lib/lab/cases";
import { getMe } from "@/lib/lab/me";

export const Route = createFileRoute("/case/$caseId")({
  loader: ({ params }) => getPublicCase({ data: { caseId: params.caseId } }),
  component: CasePage,
});

const draftKey = (caseId: string) => `lab-draft-${caseId}`;

function readDraft(caseId: string): Answers | null {
  try {
    const raw = sessionStorage.getItem(draftKey(caseId));
    return raw ? normaliseAnswers(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function writeDraft(caseId: string, a: Answers) {
  try {
    sessionStorage.setItem(draftKey(caseId), JSON.stringify(a));
  } catch {
    /* storage can be blocked; the server copy still saves when signed in */
  }
}

function clearDraft(caseId: string) {
  try {
    sessionStorage.removeItem(draftKey(caseId));
  } catch {
    /* ignore */
  }
}

function isEmpty(a: Answers) {
  return JSON.stringify(a) === JSON.stringify(blankAnswers());
}

function CasePage() {
  const { caseId } = Route.useParams();
  const loaded = Route.useLoaderData();
  const { user, isPending } = useCurrentUserState();

  const [lab, setLab] = useState<PublicCase | null>(loaded);
  const [role, setRole] = useState<"learner" | "admin" | null>(null);
  const [answers, setAnswers] = useState<Answers>(blankAnswers());
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<CaseFeedback | null>(null);
  const [ready, setReady] = useState(false);
  const [needSignIn, setNeedSignIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [saveNote, setSaveNote] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submitAfterSignIn = useRef(false);

  // Load the learner's attempt (or the anonymous draft) once the session is known.
  useEffect(() => {
    if (isPending) return;
    let cancelled = false;
    (async () => {
      const local = readDraft(caseId);
      if (!user) {
        if (local) setAnswers(local);
        setReady(true);
        return;
      }
      try {
        const me = await getMe();
        if (cancelled) return;
        setRole(me.role);
        let current = lab;
        if (!current && me.role === "admin") {
          current = await getAdminCase({ data: { caseId } });
          if (cancelled) return;
          setLab(current);
        }
        if (!current) {
          setReady(true);
          return;
        }
        const attempt = await getMyAttempt({ data: { caseId } });
        if (cancelled) return;
        if (attempt.state === "submitted") {
          setFeedback(attempt.feedback);
          clearDraft(caseId);
        } else if (attempt.state === "in_progress" && !isEmpty(attempt.answers)) {
          setAnswers(attempt.answers);
        } else if (local) {
          setAnswers(local);
          void saveMyProgress({ data: { caseId, answers: local } }).catch(() => undefined);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load your read");
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, user?.id, isPending]);

  const onChange = useCallback(
    (next: Answers) => {
      setAnswers(next);
      setError("");
      writeDraft(caseId, next);
      if (!user) return;
      setSaveNote("Saving");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        saveMyProgress({ data: { caseId, answers: next } })
          .then(() => setSaveNote("Saved"))
          .catch(() => setSaveNote("Not saved, check your connection"));
      }, 700);
    },
    [caseId, user],
  );

  const submit = useCallback(async () => {
    if (!user) {
      submitAfterSignIn.current = true;
      setNeedSignIn(true);
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      const fb = await submitMyRead({ data: { caseId, answers } });
      setFeedback(fb);
      clearDraft(caseId);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit");
    } finally {
      setSubmitting(false);
    }
  }, [answers, caseId, user]);

  // Finish the submit the learner started before they had an account.
  useEffect(() => {
    if (user && ready && submitAfterSignIn.current && !feedback) {
      submitAfterSignIn.current = false;
      setNeedSignIn(false);
      void submit();
    }
  }, [user, ready, feedback, submit]);

  const resetPreview = async () => {
    await resetMyPreview({ data: { caseId } });
    clearDraft(caseId);
    setFeedback(null);
    setAnswers(blankAnswers());
    setIndex(0);
  };

  if (!lab) {
    return (
      <>
        <SiteHeader />
        <main className="wrap">
          <p className="eyebrow">Unavailable</p>
          <h1 className="h-page">{ready || !isPending ? "This case isn't open." : "Loading"}</h1>
          <p>
            <Link to="/">Back to this week's case</Link>
          </p>
        </main>
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="wrap case">
        {lab.status === "draft" ? (
          <p className="warn">Admin preview of a draft. Learners can't see this case yet.</p>
        ) : null}
        <p className="eyebrow">Twelve Leads · about 10 minutes</p>
        <h1 className="h-page">{lab.title}</h1>

        {feedback ? (
          <>
            <FeedbackView feedback={feedback} />
            {role === "admin" ? (
              <button type="button" className="btn secondary" onClick={resetPreview}>
                Clear my read and try again (admin)
              </button>
            ) : null}
            <p>
              <Link to="/">Back to home</Link>
            </p>
          </>
        ) : (
          <div className="case-grid">
            <div className="case-material">
              <div className="card vignette">
                <p className="eyebrow">Clinical vignette</p>
                <p>{lab.vignette}</p>
              </div>
              <EcgViewer src={lab.ecgImage} title={lab.title} />
            </div>
            <div className="case-work">
              {!ready ? (
                <p className="fine">Loading your read</p>
              ) : lab.status !== "open" && role !== "admin" ? (
                <div className="card">
                  <p className="eyebrow">Closed</p>
                  <p>This case no longer takes new reads.</p>
                </div>
              ) : (
                <ReadSteps
                  answers={answers}
                  onChange={onChange}
                  index={index}
                  onIndex={setIndex}
                  onSubmit={submit}
                  submitting={submitting}
                  submitLabel={user ? "Submit read" : "Submit read (free account)"}
                  error={error}
                  saveNote={user ? saveNote : ""}
                />
              )}
              {needSignIn && !user ? (
                <div className="signin-inline">
                  <LabAccount
                    hideWhenSignedIn
                    startWithSignUp
                    title="Save your read"
                    lead="Create a free account to submit and see your feedback. Your answers are kept."
                  />
                </div>
              ) : null}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
