"use client";

import { useEffect, useState } from "react";
import { SearchHitList } from "@synthaembed/ui-fleet";
import type { SearchHit } from "@synthaembed/ui-fleet";

const EDGE_TRUNCATE_DIMS = 8;

const SAMPLE_QUERIES = [
  "What methods prevent representation collapse in contrastive embedding training?",
  "Barlow Twins vs VICReg for embedding robustness",
  "Matryoshka truncation for edge deployment",
  "Effective rank and spectral collapse in RAG",
];

type TierResult = {
  hits: SearchHit[];
  modelVersion: string | null;
  backend?: string;
  tierLabel: string;
};

function rankMap(hits: SearchHit[]): Map<string, number> {
  return new Map(hits.map((h, i) => [h.id, i + 1]));
}

export function TierComparePanel() {
  const [query, setQuery] = useState(SAMPLE_QUERIES[0]);
  const [full, setFull] = useState<TierResult | null>(null);
  const [edge, setEdge] = useState<TierResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((d) => setOnline(Boolean(d.online && d.apiKeyConfigured)))
      .catch(() => setOnline(false));
  }, []);

  async function runCompare() {
    setLoading(true);
    setError(null);
    try {
      const [fullRes, edgeRes] = await Promise.all([
        fetch("/api/search", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ query, k: 6 }),
        }),
        fetch("/api/search", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ query, k: 6, truncateDims: EDGE_TRUNCATE_DIMS, quant: "int8" }),
        }),
      ]);
      const fullData = await fullRes.json();
      const edgeData = await edgeRes.json();
      if (!fullRes.ok) throw new Error(fullData.error ?? "full-tier search failed");
      if (!edgeRes.ok) throw new Error(edgeData.error ?? "edge-tier search failed");

      setFull({
        hits: fullData.hits ?? [],
        modelVersion: fullData.modelVersion ?? null,
        backend: fullData.backend,
        tierLabel: fullData.tier?.label ?? "full (384d)",
      });
      setEdge({
        hits: edgeData.hits ?? [],
        modelVersion: edgeData.modelVersion ?? null,
        backend: edgeData.backend,
        tierLabel: edgeData.tier?.label ?? `edge (t=${EDGE_TRUNCATE_DIMS} + int8)`,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setFull(null);
      setEdge(null);
    } finally {
      setLoading(false);
    }
  }

  const fullRanks = full ? rankMap(full.hits) : new Map<string, number>();
  const edgeRanks = edge ? rankMap(edge.hits) : new Map<string, number>();
  const topFull = full?.hits[0]?.id;
  const topEdge = edge?.hits[0]?.id;
  const rankChanged = topFull && topEdge && topFull !== topEdge;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="fleet-card">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          <span className={`fleet-badge ${online ? "ok" : "warn"}`}>
            {online === null ? "Checking API…" : online ? "Live stack" : "Offline"}
          </span>
          <span className="fleet-badge ok">Full vs edge compare</span>
        </div>

        <p style={{ fontSize: 13, opacity: 0.78, margin: "0 0 12px", lineHeight: 1.5 }}>
          Same query, two serving tiers side-by-side. <strong>Full</strong> uses the complete
          embedding (best retrieval). <strong>Edge</strong> applies Matryoshka prefix t=
          {EDGE_TRUNCATE_DIMS} + int8 quant — the home-device story from EVIDENCE.md Family B.
        </p>

        <label htmlFor="tier-query" style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>
          Query
        </label>
        <textarea
          id="tier-query"
          className="bh-textarea"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={3}
          style={{ width: "100%", marginBottom: 10 }}
        />

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {SAMPLE_QUERIES.map((q) => (
            <button
              key={q}
              type="button"
              className="bh-btn bh-btn--chip"
              onClick={() => setQuery(q)}
            >
              {q.slice(0, 40)}…
            </button>
          ))}
        </div>

        <button
          type="button"
          className="bh-btn bh-btn--primary"
          onClick={runCompare}
          disabled={loading || !query.trim()}
        >
          {loading ? "Searching both tiers…" : "Compare full vs edge"}
        </button>

        {error && (
          <div className="bh-alert bh-alert--error" style={{ marginTop: 14, fontSize: 13 }}>
            {error}
          </div>
        )}
      </div>

      {(full || edge) && (
        <>
          {rankChanged && (
            <div className="fleet-card" style={{ fontSize: 13, borderColor: "var(--bh-stage-validate)" }}>
              <strong>Rank shift at edge tier</strong> — top-1 differs between full and edge.
              MRL-trained checkpoints reduce this drop; post-hoc truncate may reorder results.
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            <div className="fleet-card">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <h3 style={{ margin: 0, fontSize: 15 }}>Full quality</h3>
                <span className="fleet-badge ok" style={{ fontSize: 11 }}>
                  {full?.tierLabel}
                </span>
              </div>
              {full?.modelVersion && (
                <code style={{ fontSize: 11, opacity: 0.7 }}>{full.modelVersion}</code>
              )}
              <div style={{ marginTop: 12 }}>
                <SearchHitList hits={full?.hits ?? []} emptyMessage="No hits" />
              </div>
            </div>

            <div className="fleet-card">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <h3 style={{ margin: 0, fontSize: 15 }}>Edge tier</h3>
                <span className="fleet-badge warn" style={{ fontSize: 11 }}>
                  t={EDGE_TRUNCATE_DIMS} + int8
                </span>
              </div>
              {edge?.modelVersion && (
                <code style={{ fontSize: 11, opacity: 0.7 }}>{edge.modelVersion}</code>
              )}
              <div style={{ marginTop: 12 }}>
                <SearchHitList hits={edge?.hits ?? []} emptyMessage="No hits" />
              </div>
            </div>
          </div>

          {full && edge && full.hits.length > 0 && (
            <div className="fleet-card" style={{ fontSize: 12.5 }}>
              <strong>Rank delta (top 6)</strong>
              <table style={{ width: "100%", marginTop: 10, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ textAlign: "left", opacity: 0.65 }}>
                    <th style={{ padding: "4px 8px" }}>Chunk</th>
                    <th style={{ padding: "4px 8px" }}>Full rank</th>
                    <th style={{ padding: "4px 8px" }}>Edge rank</th>
                  </tr>
                </thead>
                <tbody>
                  {[...new Set([...full.hits, ...edge.hits].map((h) => h.id))].slice(0, 6).map((id) => {
                    const fr = fullRanks.get(id);
                    const er = edgeRanks.get(id);
                    const delta = fr && er ? er - fr : null;
                    return (
                      <tr key={id}>
                        <td style={{ padding: "4px 8px", fontFamily: "ui-monospace", fontSize: 11 }}>
                          {id.slice(0, 28)}…
                        </td>
                        <td style={{ padding: "4px 8px" }}>{fr ?? "—"}</td>
                        <td style={{ padding: "4px 8px" }}>
                          {er ?? "—"}
                          {delta != null && delta !== 0 && (
                            <span style={{ marginLeft: 6, color: delta > 0 ? "var(--bh-stage-validate)" : "var(--bh-stage-prod)" }}>
                              ({delta > 0 ? "+" : ""}
                              {delta})
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
