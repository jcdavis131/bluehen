"use client";

import { useState } from "react";
import { GLOSSARY } from "@synthaembed/fleet";
import { SearchHitList } from "./SearchHitList";
import type { SearchHit } from "./site-api";

const DEFAULT_QUERIES = [
  "How does contrastive learning prevent representation collapse?",
  "What is effective rank in embedding matrices?",
  "Matryoshka truncation for edge serving",
];

export function LiveSearchPanel({
  siteId,
  title = GLOSSARY.liveSearch,
  description = "Search the indexed corpus via core-api. Results reflect the current production embedding model.",
  defaultQuery = DEFAULT_QUERIES[0],
  sampleQueries = DEFAULT_QUERIES,
  showFeedback = true,
}: {
  siteId: string;
  title?: string;
  description?: string;
  defaultQuery?: string;
  sampleQueries?: string[];
  showFeedback?: boolean;
}) {
  const [query, setQuery] = useState(defaultQuery);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [modelVersion, setModelVersion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackSent, setFeedbackSent] = useState(false);

  async function runSearch() {
    setLoading(true);
    setError(null);
    setFeedbackSent(false);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query, k: 8 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `search failed (${res.status})`);
      setHits(data.hits ?? []);
      setModelVersion(data.modelVersion ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setHits([]);
    } finally {
      setLoading(false);
    }
  }

  async function sendFeedback(rating: "up" | "down") {
    const comment =
      rating === "up"
        ? "Search results are relevant for this query"
        : "Search results miss the mark; corpus or model needs improvement";
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ siteId, division: "bd", rating, query, comment }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "feedback failed");
      }
      setFeedbackSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="fleet-card bh-card--organic">
      <h3 className="bh-title--sm" style={{ margin: "0 0 8px" }}>
        {title}
      </h3>
      <p className="bh-lead" style={{ marginBottom: 16, fontSize: "0.8125rem" }}>
        {description}
      </p>

      <label className="bh-label" htmlFor={`search-${siteId}`}>
        Query
      </label>
      <textarea
        id={`search-${siteId}`}
        className="bh-textarea"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        rows={3}
        style={{ marginBottom: 10 }}
      />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
        {sampleQueries.map((q) => (
          <button key={q} type="button" className="bh-btn bh-btn--chip" onClick={() => setQuery(q)}>
            {q.slice(0, 42)}…
          </button>
        ))}
      </div>

      <button
        type="button"
        className="bh-btn bh-btn--primary"
        onClick={runSearch}
        disabled={loading || !query.trim()}
      >
        {loading ? "Searching…" : GLOSSARY.searchCorpus}
      </button>

      {error && (
        <div className="bh-alert bh-alert--error" style={{ marginTop: 16 }}>
          {error}
          {error.includes("SYNTH_API_KEY") && (
            <div className="bh-muted" style={{ marginTop: 8, fontSize: "0.75rem" }}>
              Run: <code>pnpm bootstrap:orgs</code> then <code>pnpm dev:site {siteId}</code>
            </div>
          )}
        </div>
      )}

      {(hits.length > 0 || (loading === false && hits.length === 0 && modelVersion)) && (
        <div style={{ marginTop: 20 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <span className="bh-section-title" style={{ margin: 0 }}>
              Results
            </span>
            {modelVersion && <code>{modelVersion}</code>}
          </div>
          <SearchHitList hits={hits} emptyMessage="No matches found. Run kickoff:orgs to train and index the corpus." />

          {showFeedback && hits.length > 0 && (
            <div style={{ marginTop: 16, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span className="bh-muted" style={{ fontSize: "0.75rem" }}>
                {GLOSSARY.hillClimbVerb}:
              </span>
              <button type="button" className="bh-btn bh-btn--ghost bh-btn--sm" onClick={() => sendFeedback("up")}>
                👍 Relevant
              </button>
              <button type="button" className="bh-btn bh-btn--ghost bh-btn--sm" onClick={() => sendFeedback("down")}>
                👎 Miss
              </button>
              {feedbackSent && (
                <span className="bh-alert bh-alert--ok" style={{ padding: "4px 10px", margin: 0 }}>
                  Split logged. Thank you.
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
