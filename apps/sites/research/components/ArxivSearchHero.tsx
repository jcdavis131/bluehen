"use client";

import { useEffect, useState } from "react";
import { SearchHitList } from "@synthaembed/ui-fleet";
import type { SearchHit } from "@synthaembed/ui-fleet";

const SAMPLE_QUERIES = [
  "What methods prevent representation collapse in contrastive embedding training?",
  "Barlow Twins vs VICReg for embedding robustness",
  "Matryoshka truncation for edge deployment",
  "Effective rank and spectral collapse in RAG",
];

/** Single-query search hero (UX-104) — results above the fold. */
export function ArxivSearchHero() {
  const [query, setQuery] = useState(SAMPLE_QUERIES[0]!);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [modelVersion, setModelVersion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((d) => setOnline(Boolean(d.online && d.apiKeyConfigured)))
      .catch(() => setOnline(false));
  }, []);

  async function runSearch() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query, k: 8 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "search failed");
      setHits(data.hits ?? []);
      setModelVersion(data.modelVersion ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setHits([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bh-card bh-card--organic">
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <span className={`bh-badge ${online ? "bh-badge--ok" : "bh-badge--warn"}`}>
          {online === null ? "Checking API…" : online ? "Live arXiv RAG" : "Offline — set SYNTH_API_KEY"}
        </span>
        {modelVersion && <span className="bh-badge bh-badge--accent bh-mono">{modelVersion}</span>}
      </div>

      <label className="bh-label" htmlFor="arxiv-hero-query">
        Search the arXiv corpus
      </label>
      <textarea
        id="arxiv-hero-query"
        className="bh-textarea"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        rows={3}
        style={{ width: "100%", marginBottom: 10 }}
      />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
        {SAMPLE_QUERIES.map((q) => (
          <button key={q} type="button" className="bh-btn bh-btn--chip bh-btn--sm" onClick={() => setQuery(q)}>
            {q.slice(0, 36)}…
          </button>
        ))}
      </div>

      <button
        type="button"
        className="bh-btn bh-btn--primary bh-btn--hero"
        onClick={runSearch}
        disabled={loading || !query.trim()}
      >
        {loading ? "Searching…" : "Search"}
      </button>

      {error && (
        <div className="bh-alert bh-alert--error" style={{ marginTop: 14 }}>
          {error}
        </div>
      )}

      {hits.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <SearchHitList hits={hits} emptyMessage="No hits" />
        </div>
      )}
    </div>
  );
}
