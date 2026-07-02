"use client";

import { useState } from "react";
import { listSites, getSiteCircuit, GLOSSARY } from "@synthaembed/fleet";

const PHASE_A_SITES = listSites({ status: "active", phase: "A" }).filter(
  (s) => s.orgDivision && s.orgDivision !== "orchestration",
);

export function HillClimbActions() {
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, string>>({});

  async function trigger(siteId: string) {
    setLoading(siteId);
    try {
      const res = await fetch("/api/admin/hill-climb", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ siteId, corpusUri: "corpus.jsonl" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "failed");
      setResult((r) => ({ ...r, [siteId]: JSON.stringify(data).slice(0, 120) + "…" }));
    } catch (e) {
      setResult((r) => ({
        ...r,
        [siteId]: e instanceof Error ? e.message : String(e),
      }));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="bh-grid">
      {PHASE_A_SITES.map((site) => {
        const stop = getSiteCircuit(site.id);
        return (
          <article key={site.id} className="bh-card bh-card--column">
            <h3 className="bh-card__title bh-card__title--lg">{stop?.stop ?? site.name}</h3>
            <p className="bh-card__body">{site.description}</p>
            <button
              type="button"
              onClick={() => trigger(site.id)}
              disabled={loading === site.id}
              className="bh-btn bh-btn--primary bh-btn--sm"
            >
              {loading === site.id ? "Starting…" : GLOSSARY.hillClimbVerb}
            </button>
            {result[site.id] && <pre className="bh-pre-result">{result[site.id]}</pre>}
          </article>
        );
      })}
      <div className="bh-card bh-note">
        <strong>Operator note:</strong> Per-tenant {GLOSSARY.hillClimb.toLowerCase()} via{" "}
        <code>POST /v1/admin/hill-climb</code> (uses workspace for each <code>siteId</code>).
        Requires <code>API_SECRET_KEY</code> on Operations Center.
      </div>
    </div>
  );
}
