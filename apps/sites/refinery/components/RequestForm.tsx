"use client";

import { useState } from "react";

export function RequestForm({ presetTopic }: { presetTopic?: string }) {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, company, message, topic: presetTopic ?? "custom-harvest" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `failed (${res.status})`);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="bh-card bh-card--organic" aria-live="polite">
        <h2 className="bh-card__title">Request received</h2>
        <p className="bh-card__body">
          {presetTopic && (
            <>Your request references <code>{presetTopic}</code>. </>
          )}
          The Data Operations team reviews scope and responds by email with a
          measured proposal — corpus size, cadence, provenance guarantees, and
          price.
        </p>
      </div>
    );
  }

  return (
    <form className="bh-card bh-card--organic" onSubmit={submit}>
      {presetTopic && (
        <p className="bh-meta" style={{ margin: "0 0 14px" }}>
          Requesting: <code>{presetTopic}</code> — this request stays tied to
          the dataset you were viewing.
        </p>
      )}
      <label className="bh-label" htmlFor="req-email">Work email</label>
      <input id="req-email" className="bh-input" type="email" required value={email}
             onChange={(e) => setEmail(e.target.value)} style={{ marginBottom: 12, width: "100%" }} />
      <label className="bh-label" htmlFor="req-company">Company</label>
      <input id="req-company" className="bh-input" type="text" value={company}
             onChange={(e) => setCompany(e.target.value)} style={{ marginBottom: 12, width: "100%" }} />
      <label className="bh-label" htmlFor="req-scope">Scope</label>
      <textarea id="req-scope" className="bh-textarea" rows={5} value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What sources, what cadence, what format — and what the data is for."
                style={{ marginBottom: 14 }} />
      <button type="submit" className="bh-btn bh-btn--primary" disabled={busy}>
        {busy ? "Sending…" : "Request a proposal"}
      </button>
      {error && <div className="bh-alert bh-alert--error" style={{ marginTop: 14 }}>{error}</div>}
    </form>
  );
}
