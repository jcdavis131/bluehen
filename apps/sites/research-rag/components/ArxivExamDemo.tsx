"use client";

import { useEffect, useState } from "react";
import { TierComparePanel } from "../components/TierComparePanel";

const STEPS = [
  { id: "indexed", label: "Corpus indexed", hint: "39 arXiv abstracts → chunks in pgvector" },
  { id: "embed", label: "Embed query (two tiers)", hint: "Full 384d vs Matryoshka t=8 + int8" },
  { id: "retrieve", label: "Retrieve top-k", hint: "Side-by-side rank comparison" },
  { id: "exam", label: "Exam (coming)", hint: "Generate MCQ from retrieved context" },
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
          {STEPS.map((s, i) => (
            <li key={s.id} style={{ marginBottom: 10, opacity: i < 3 ? 1 : 0.55 }}>
              <strong>{s.label}</strong>
              <div style={{ opacity: 0.65, fontSize: 12, marginTop: 2 }}>{s.hint}</div>
            </li>
          ))}
        </ol>
      </div>

      <TierComparePanel />

      <div className="fleet-card" style={{ fontSize: 13, opacity: 0.75 }}>
        <strong>Corpus:</strong> harvested from arXiv (CS.CL / retrieval / embedding queries). Re-kickoff
        with <code>pnpm kickoff:research-rag</code> after <code>pnpm harvest:arxiv</code>. Feedback routes
        misses to Data / Research via Orchestration.
      </div>
    </div>
  );
}
