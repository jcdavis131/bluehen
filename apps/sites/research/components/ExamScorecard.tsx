"use client";

import { useCallback, useEffect, useState } from "react";
import type { ExamScorecard, ModelScore } from "@synthaembed/eval-public";

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export function ExamScorecard() {
  const [scorecard, setScorecard] = useState<ExamScorecard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/exam", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "exam failed");
      setScorecard(data as ExamScorecard);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setScorecard(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    run();
  }, [run]);

  const panel = scorecard?.panel ?? [];
  const questions = scorecard ? scorecard.panel[0]?.perQuestion.length ?? 0 : 0;

  return (
    <div className="fleet-card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <span className="fleet-badge ok">arXiv MCQ exam</span>
        {scorecard && (
          <span className="fleet-badge" style={{ fontSize: 11 }}>
            {scorecard.mode} · top-{scorecard.topK} · {questions} questions
          </span>
        )}
        <button
          type="button"
          className="bh-btn bh-btn--ghost"
          onClick={run}
          disabled={loading}
          style={{ marginLeft: "auto" }}
        >
          {loading ? "Running…" : "Re-run exam"}
        </button>
      </div>

      <p style={{ fontSize: 12.5, opacity: 0.75, lineHeight: 1.5, margin: 0, maxWidth: 720 }}>
        Each arXiv-domain question is answerable from one source chunk. A model scores a hit when its
        retrieval places the source chunk in the top-{scorecard?.topK ?? 3}.{" "}
        <strong>{scorecard?.mode === "demo" ? "Demo mode" : "Live mode"}</strong>:{" "}
        {scorecard?.mode === "demo"
          ? "retrieval is simulated from the measured per-chunk bias panel (EVIDENCE §3.7). Live mode swaps in real org-embed vs BGE/e5 vectors."
          : "scored against real org-embed vs BGE/e5 vectors over the arXiv corpus."}
      </p>

      {error && (
        <div className="bh-alert bh-alert--error" style={{ fontSize: 13 }}>
          {error}
        </div>
      )}

      {panel.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", opacity: 0.65, fontSize: 12 }}>
                <th style={{ padding: "6px 10px" }}>Model</th>
                <th style={{ padding: "6px 10px" }}>Accuracy</th>
                <th style={{ padding: "6px 10px" }}>MRR</th>
                <th style={{ padding: "6px 10px" }}>Vendor</th>
              </tr>
            </thead>
            <tbody>
              {panel.map((m: ModelScore) => (
                <tr
                  key={m.modelId}
                  style={{
                    borderTop: "1px solid var(--fleet-border, #2a2f3a)",
                    background: m.isHen ? "var(--bh-stage-prod-tint)" : "transparent",
                  }}
                >
                  <td style={{ padding: "6px 10px", fontWeight: m.isHen ? 700 : 500 }}>
                    {m.name}
                    {m.isHen && <span style={{ marginLeft: 6, fontSize: 11, color: "var(--bh-stage-prod)" }}>org</span>}
                  </td>
                  <td style={{ padding: "6px 10px", fontFamily: "ui-monospace" }}>{pct(m.accuracy)}</td>
                  <td style={{ padding: "6px 10px", fontFamily: "ui-monospace" }}>{m.mrr.toFixed(3)}</td>
                  <td style={{ padding: "6px 10px", opacity: 0.7 }}>{m.vendor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
