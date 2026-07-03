"use client";

import { useState } from "react";

type Source = {
  id: string;
  name: string;
  intervalMinutes: number;
  kind: string;
  state: Record<string, unknown>;
};
type Job = { id: string; sourceId: string; status: string; error: string | null; updatedAt: string };
type Submission = { id: string; receipt: string; textCount: number; status: string; createdAt: string };

export function OpsConsole({
  sources,
  jobs,
  submissions,
}: {
  sources: Source[];
  jobs: Job[];
  submissions: Submission[];
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function act(payload: Record<string, string>, label: string) {
    setBusy(label);
    setMsg(null);
    try {
      const res = await fetch("/api/ops", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `failed (${res.status})`);
      setMsg(`${label}: ok — refresh to see updated state`);
    } catch (e) {
      setMsg(`${label}: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="bh-stack" style={{ gap: 20 }}>
      {msg && <div className="bh-alert" aria-live="polite">{msg}</div>}

      <section className="bh-card bh-card--flush">
        <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <h2 className="bh-card__title">Source registry ({sources.length})</h2>
          <button className="bh-btn bh-btn--ghost" disabled={busy !== null}
                  onClick={() => act({ action: "sync" }, "catalog sync")}>
            {busy === "catalog sync" ? "Syncing…" : "Sync catalog"}
          </button>
        </div>
        <div className="bh-table-wrap" style={{ border: 0 }}>
          <table className="bh-table">
            <tbody>
              <tr><th>Source</th><th>Kind</th><th>Interval</th><th>Last state</th><th /></tr>
              {sources.map((s) => (
                <tr key={s.id}>
                  <td><code>{s.id}</code></td>
                  <td>{s.kind}</td>
                  <td>{s.intervalMinutes}m</td>
                  <td className="bh-meta">
                    {Object.keys(s.state).length > 0 ? JSON.stringify(s.state).slice(0, 60) : "never collected"}
                  </td>
                  <td>
                    <button className="bh-btn bh-btn--ghost" disabled={busy !== null}
                            onClick={() => act({ action: "harvest", sourceId: s.id }, `harvest ${s.id}`)}>
                      {busy === `harvest ${s.id}` ? "Queued…" : "Harvest now"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bh-card bh-card--flush">
        <h2 className="bh-card__title" style={{ padding: "12px 16px 0" }}>
          Pending contributions ({submissions.length})
        </h2>
        {submissions.length === 0 ? (
          <p className="bh-card__body" style={{ padding: "8px 16px 16px" }}>
            Queue is empty — consented submissions from the Refinery land here
            for review.
          </p>
        ) : (
          <div className="bh-table-wrap" style={{ border: 0 }}>
            <table className="bh-table">
              <tbody>
                <tr><th>Receipt</th><th>Texts</th><th>Submitted</th><th /></tr>
                {submissions.map((s) => (
                  <tr key={s.id}>
                    <td><code>{s.receipt.slice(0, 13)}…</code></td>
                    <td>{s.textCount}</td>
                    <td className="bh-meta">{new Date(s.createdAt).toUTCString().slice(0, 22)}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button className="bh-btn bh-btn--ghost" disabled={busy !== null}
                              onClick={() => act({ action: "review", submissionId: s.id, decision: "approve" }, `approve ${s.id.slice(0, 6)}`)}>
                        Approve
                      </button>{" "}
                      <button className="bh-btn bh-btn--ghost" disabled={busy !== null}
                              onClick={() => act({ action: "review", submissionId: s.id, decision: "reject" }, `reject ${s.id.slice(0, 6)}`)}>
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="bh-card bh-card--flush">
        <h2 className="bh-card__title" style={{ padding: "12px 16px 0" }}>Recent harvest jobs</h2>
        {jobs.length === 0 ? (
          <p className="bh-card__body" style={{ padding: "8px 16px 16px" }}>
            No harvest jobs yet — use "Harvest now" on a source above.
          </p>
        ) : (
          <div className="bh-table-wrap" style={{ border: 0 }}>
            <table className="bh-table">
              <tbody>
                <tr><th>Source</th><th>Status</th><th>Updated</th><th>Error</th></tr>
                {jobs.map((j) => (
                  <tr key={j.id}>
                    <td><code>{j.sourceId}</code></td>
                    <td>{j.status}</td>
                    <td className="bh-meta">{new Date(j.updatedAt).toUTCString().slice(0, 22)}</td>
                    <td className="bh-meta">{j.error ? j.error.slice(0, 60) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
