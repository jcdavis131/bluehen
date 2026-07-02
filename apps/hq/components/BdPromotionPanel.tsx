"use client";

import { useCallback, useEffect, useState } from "react";
import { GLOSSARY } from "@synthaembed/fleet";

type Candidate = {
  id: string;
  siteId: string;
  modelVersion?: string;
  method: string;
  status: string;
  submittedAt: string;
  evidenceRef?: string;
  notes?: string;
  recipe?: Record<string, unknown>;
};

export function BdPromotionPanel() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/bd/queue");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "failed to load queue");
      setCandidates(data.candidates ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function promote(candidate: Candidate, action: "charter" | "deploy") {
    setBusy(`${candidate.id}-${action}`);
    try {
      const res = await fetch("/api/admin/bd/promote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action,
          siteId: candidate.siteId,
          modelVersion: candidate.modelVersion ?? "*",
          recipe: candidate.recipe ?? {},
          candidateId: candidate.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? action + " failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="bh-grid">
      <div className="bh-card bh-card--column bh-note">
        <strong>Phase A+ promotion</strong>
        <p className="bh-card__body" style={{ margin: 0 }}>
          After eval gates pass, the worker appends candidates to the Validation Queue. Issue a
          charter, then deploy the approved model version.
        </p>
        {error && <pre className="bh-pre-result">{error}</pre>}
      </div>

      {candidates.length === 0 && !error && (
        <div className="bh-card bh-card__body">No candidates in queue.</div>
      )}

      {candidates.map((c) => (
        <article key={c.id} className="bh-card bh-card--column">
          <h3 className="bh-card__title bh-card__title--lg">
            {c.method} · {c.siteId}
          </h3>
          <p className="bh-card__body">{c.notes}</p>
          <div className="bh-meta">
            status: {c.status.replace(/_/g, " ")} · model: {c.modelVersion ?? "—"} · {c.submittedAt}
          </div>
          <div className="bh-card__row" style={{ gap: "var(--bh-space-2)", flexWrap: "wrap" }}>
            <button
              type="button"
              className="bh-btn bh-btn--sm"
              disabled={busy !== null}
              onClick={() => promote(c, "charter")}
            >
              {busy === `${c.id}-charter` ? "Issuing…" : "Issue charter"}
            </button>
            <button
              type="button"
              className="bh-btn bh-btn--primary bh-btn--sm"
              disabled={busy !== null || !c.modelVersion}
              onClick={() => promote(c, "deploy")}
            >
              {busy === `${c.id}-deploy` ? "Deploying…" : "Deploy model"}
            </button>
          </div>
        </article>
      ))}

      <div className="bh-card bh-note">
        <strong>{GLOSSARY.bdQueue}</strong> · live from core-api · requires <code>API_SECRET_KEY</code>
      </div>
    </section>
  );
}
