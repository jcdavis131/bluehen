"use client";

import { useEffect, useState } from "react";
import { TierComparePanel } from "../components/TierComparePanel";
import { ExamScorecard } from "../components/ExamScorecard";

const STEPS = [
  { id: "indexed", label: "Corpus indexed", hint: "arXiv abstracts → chunks in pgvector" },
  { id: "embed", label: "Embed query (two tiers)", hint: "Full 384d vs Matryoshka t=8 + int8" },
  { id: "retrieve", label: "Retrieve top-k", hint: "Side-by-side rank comparison" },
  { id: "exam", label: "Exam — org vs BGE/e5 panel", hint: "arXiv MCQ scorecard, top-3 retrieval" },
];

export function ArxivExamDemo() {
  const [modelVersion, setModelVersion] = useState<string | null>(null);
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((d) => setOnline(Boolean(d.online && d.apiKeyConfigured)))
      .catch(() => setOnline(false));
    fetch("/api/models")
      .then((r) => r.json())
      .then((d) => {
        const deployed = (d.models ?? []).find((m: { deployed?: boolean }) => m.deployed);
        setModelVersion(deployed?.version ?? null);
      })
      .catch(() => setModelVersion(null));
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="fleet-card">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          <span className={`fleet-badge ${online ? "ok" : "warn"}`}>
            {online === null ? "Checking API…" : online ? "Live stack" : "Offline — see setup below"}
          </span>
          {modelVersion && (
            <span className="fleet-badge ok" style={{ fontFamily: "ui-monospace" }}>
              {modelVersion}
            </span>
          )}
        </div>

        <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13 }}>
          {STEPS.map((s) => (
            <li key={s.id} style={{ marginBottom: 10 }}>
              <strong>{s.label}</strong>
              <div style={{ opacity: 0.65, fontSize: 12, marginTop: 2 }}>{s.hint}</div>
            </li>
          ))}
        </ol>
      </div>

      <TierComparePanel />

      <ExamScorecard />

      <div className="fleet-card" style={{ fontSize: 13, opacity: 0.75 }}>
        <strong>Corpus:</strong> harvested from arXiv (CS.CL / retrieval / embedding queries). Re-kickoff
        with <code>pnpm harvest:arxiv</code> then <code>pnpm kickoff:orgs</code> after the stack is up.
        Feedback routes misses to Data / Research via Orchestration.
      </div>
    </div>
  );
}
