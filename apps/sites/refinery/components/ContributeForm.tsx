"use client";

import { useState } from "react";

/** Consented contribution: the user sees exactly what will be stored and
 * must check consent explicitly (Spec 0018, /contribute). */
export function ContributeForm() {
  const [raw, setRaw] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ receipt: string; stored: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const texts = raw.split(/\n+/).map((t) => t.trim()).filter(Boolean);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ texts, consent, tags: ["contributed"] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `failed (${res.status})`);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <div className="bh-card bh-card--organic" aria-live="polite">
        <h2 className="bh-card__title">Received, with a receipt</h2>
        <p className="bh-card__body">
          {result.stored} texts stored for review. Your provenance receipt:{" "}
          <code>{result.receipt}</code>. Approved contributions enter the
          public catalog with this receipt in their lineage; keep it. Erasure is
          handled on request via <a href="https://bhenre.com/contact?topic=data-erasure">contact</a>, quoting this receipt.
        </p>
      </div>
    );
  }

  return (
    <div className="bh-card bh-card--organic">
      <label className="bh-label" htmlFor="contribute-input">
        Your texts ({texts.length} line{texts.length === 1 ? "" : "s"}, one per line, max 64)
      </label>
      <textarea
        id="contribute-input"
        className="bh-textarea"
        rows={8}
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder={"Paste texts to contribute, one per line.\nEach becomes a reviewable chunk with your receipt in its provenance."}
        style={{ marginBottom: 12 }}
      />
      <label style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 14, fontSize: "0.8125rem" }}>
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 3 }} />
        <span className="bh-muted">
          I consent to these texts being stored, reviewed, and, if approved,
          published in the dataset catalog and used for model training. No
          account identity is attached; the receipt is the only link.{" "}
          <a href="https://bhenre.com/legal/privacy">Privacy note</a>.
        </span>
      </label>
      <button
        type="button"
        className="bh-btn bh-btn--primary"
        disabled={busy || texts.length === 0 || !consent}
        onClick={submit}
      >
        {busy ? "Storing…" : "Contribute with consent"}
      </button>
      {texts.length > 0 && !consent && (
        <span className="bh-muted" style={{ marginLeft: 10, fontSize: "0.75rem" }}>
          consent checkbox required
        </span>
      )}
      {error && <div className="bh-alert bh-alert--error" style={{ marginTop: 14 }}>{error}</div>}
    </div>
  );
}
