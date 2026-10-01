import { useEffect, useState } from "react";
import { getNotifyInfo, sendNewCaseEmailFn } from "@/lib/lab/notify";

type Info = Awaited<ReturnType<typeof getNotifyInfo>>;

/** Admin only: tell opted-in learners that the newest case is live. */
export function AdminNotify() {
  const [info, setInfo] = useState<Info | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getNotifyInfo().then(setInfo).catch(() => setInfo(null));
  }, []);

  if (!info) return null;

  async function send() {
    if (!info?.latest) return;
    const again = !!info.lastSent;
    const ask = `Email ${info.subscribers} ${info.subscribers === 1 ? "person" : "people"} about ${info.latest.title}?${
      again ? " This case has been emailed before." : ""
    }`;
    if (!window.confirm(ask)) return;
    setBusy(true);
    setNote("");
    try {
      const r = await sendNewCaseEmailFn({ data: { origin: window.location.origin, again } });
      setNote(`Sent to ${r.sent}.`);
      setInfo(await getNotifyInfo());
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Could not send");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-notify">
      <h3 className="card-label">New-case email</h3>
      <p className="fine">
        {info.subscribers} {info.subscribers === 1 ? "person has" : "people have"} opted in.
        {info.lastSent
          ? ` Last sent ${new Date(info.lastSent.at).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" })} to ${info.lastSent.recipients}.`
          : ""}
      </p>
      {!info.configured ? (
        <p className="warn">
          Sending isn't set up yet. It needs an email service key and a from address added to the app's settings.
        </p>
      ) : null}
      <button
        type="button"
        className="btn"
        disabled={busy || !info.configured || !info.latest || info.subscribers === 0}
        onClick={send}
      >
        {busy ? "Sending" : info.latest ? `Email about ${info.latest.title}` : "No open case"}
      </button>
      {note ? <p className="fine">{note}</p> : null}
    </div>
  );
}
