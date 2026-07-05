"use client";

import { ExamScorecard } from "./ExamScorecard";
import { TierComparePanel } from "./TierComparePanel";

const STEPS = [
  { id: "indexed", label: "Corpus indexed", hint: "arXiv abstracts → chunks in pgvector" },
  { id: "embed", label: "Embed query (two tiers)", hint: "Full 384d vs Matryoshka t=8 + int8" },
  { id: "retrieve", label: "Retrieve top-k", hint: "Side-by-side rank comparison" },
  { id: "exam", label: "Exam: org vs BGE/e5 panel", hint: "arXiv MCQ scorecard, top-3 retrieval" },
];

/** Tier compare + exam pipeline (UX-104 — below the search hero). */
export function ArxivExamDemo() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="fleet-card">
        <p className="bh-meta" style={{ margin: "0 0 12px" }}>
          Engineering deep dive — how the live stack is wired, not required to use search above.
        </p>
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
