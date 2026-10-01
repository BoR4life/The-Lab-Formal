import { useCallback, useEffect, useState } from "react";
import {
  addComment, deleteCommentFn, getComments, hideCommentFn, reportCommentFn, reportProblem,
} from "@/lib/lab/community";

type Data = Awaited<ReturnType<typeof getComments>>;
type C = Data["comments"][number];

const when = (iso: string) =>
  new Date(iso).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });

/** Shown under a learner's feedback. Comments only open once they've submitted their own read. */
export function CaseDiscussion({ caseId, admin }: { caseId: string; admin: boolean }) {
  const [data, setData] = useState<Data | null>(null);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await getComments({ data: { caseId } }));
    } catch {
      setData({ allowed: false, comments: [] });
    }
  }, [caseId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!data?.allowed) return null;

  async function post(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await addComment({ data: { caseId, body, parentId: replyTo } });
      setBody("");
      setReplyTo(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post");
    } finally {
      setBusy(false);
    }
  }

  async function act(fn: () => Promise<unknown>, confirm?: string) {
    if (confirm && !window.confirm(confirm)) return;
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  const top = data.comments.filter((c) => !c.parentId);
  const replies = (id: string) => data.comments.filter((c) => c.parentId === id);

  const row = (c: C, nested: boolean) => (
    <li key={c.id} className={`cmt${nested ? " nested" : ""}${c.hidden ? " is-hidden" : ""}`}>
      <div className="cmt-head">
        <strong>{c.author}</strong>
        {c.isAdmin ? <span className="admin-tag">Brad</span> : null}
        <span className="fine">{when(c.createdAt)}</span>
        {c.hidden ? <span className="fine">Hidden{admin && c.reports ? `, ${c.reports} reports` : ""}</span> : null}
      </div>
      <p className="cmt-body">{c.body || "This comment was hidden."}</p>
      <div className="cmt-actions">
        {!nested ? (
          <button type="button" className="link" onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}>
            {replyTo === c.id ? "Cancel reply" : "Reply"}
          </button>
        ) : null}
        {c.mine || admin ? (
          <button type="button" className="link" onClick={() => act(() => deleteCommentFn({ data: { commentId: c.id } }), "Delete this comment?")}>
            Delete
          </button>
        ) : (
          <button
            type="button"
            className="link"
            onClick={() => act(() => reportCommentFn({ data: { commentId: c.id, reason: "" } }), "Report this comment to Brad?")}
          >
            Report
          </button>
        )}
        {admin ? (
          <button type="button" className="link" onClick={() => act(() => hideCommentFn({ data: { commentId: c.id, hidden: !c.hidden } }))}>
            {c.hidden ? "Unhide" : "Hide"}
          </button>
        ) : null}
      </div>
    </li>
  );

  return (
    <section className="discussion" aria-labelledby="disc-title">
      <h2 id="disc-title" className="section-title">What did you notice?</h2>
      <p className="fine">
        Compare notes on this ECG now that you've made your own read. Keep it kind. No patient details, no names of
        colleagues or hospitals.
      </p>
      <form onSubmit={post} className="cmt-form">
        <label className="field">
          <span>{replyTo ? "Your reply" : "Add to the discussion"}</span>
          <textarea
            rows={3}
            maxLength={1000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="A subtle sign you spotted, or one you missed."
            required
          />
        </label>
        {error ? <p className="warn" role="alert">{error}</p> : null}
        <button className="btn" type="submit" disabled={busy}>{busy ? "Posting" : replyTo ? "Post reply" : "Post"}</button>
      </form>
      <ul className="cmt-list">
        {top.map((c) => (
          <li key={c.id} className="cmt-thread">
            <ul>
              {row(c, false)}
              {replies(c.id).map((r) => row(r, true))}
            </ul>
          </li>
        ))}
        {!top.length ? <li className="fine">Nobody has posted yet. Start it off.</li> : null}
      </ul>
    </section>
  );
}

/** Small "report a problem" box, placed on the case page footer. */
export function ProblemLink({ caseId }: { caseId: string | null }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent">("idle");
  const [error, setError] = useState("");

  if (state === "sent") return <p className="fine">Thanks, that's with Brad.</p>;
  if (!open) {
    return (
      <button type="button" className="link" onClick={() => setOpen(true)}>
        Report a problem
      </button>
    );
  }
  return (
    <form
      className="cmt-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setState("busy");
        setError("");
        try {
          await reportProblem({ data: { caseId, message: msg, replyEmail: "" } });
          setState("sent");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not send");
          setState("idle");
        }
      }}
    >
      <label className="field">
        <span>What went wrong?</span>
        <textarea rows={3} maxLength={2000} value={msg} onChange={(e) => setMsg(e.target.value)} required />
      </label>
      {error ? <p className="warn" role="alert">{error}</p> : null}
      <button className="btn secondary" type="submit" disabled={state === "busy"}>Send</button>
    </form>
  );
}
