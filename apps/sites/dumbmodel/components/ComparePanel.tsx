"use client";

import { useMemo, useState } from "react";
import { BASELINE_MODELS } from "@/lib/baselines";
import { rankForModel, dumbnessLabel } from "@/lib/scoring";
import { ConeMascot, DumbnessMeter, HenMascot } from "@/components/site";
import { SearchHitList } from "@synthaembed/ui-fleet";
import type { SearchHit } from "@synthaembed/ui-fleet";

const DEFAULT_QUERY =
  "Why do contrastive embeddings collapse and how does spectral surgery help multi-hop RAG?";

export function ComparePanel() {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [dumbId, setDumbId] = useState("infonce");
  const [liveMode, setLiveMode] = useState(true);
  const [liveHits, setLiveHits] = useState<SearchHit[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [modelVersion, setModelVersion] = useState<string | null>(null);

  const dumb = BASELINE_MODELS.find((m) => m.id === dumbId)!;
  const hen = BASELINE_MODELS.find((m) => m.isHen)!;

  const dumbHits = useMemo(() => rankForModel(query, dumb, 3), [query, dumb]);
  const staticHenHits = useMemo(() => rankForModel(query, hen, 3), [query, hen]);

  async function runLiveSearch() {
    setLiveLoading(true);
    setLiveError(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query, k: 5 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "search failed");
      setLiveHits(data.hits ?? []);
      setModelVersion(data.modelVersion ?? null);
    } catch (e) {
      setLiveError(e instanceof Error ? e.message : String(e));
      setLiveHits([]);
    } finally {
      setLiveLoading(false);
    }
  }

  return (
    <div className="bh-stack">
      <div className="bh-card">
        <label htmlFor="query" className="bh-label">
          Your query
        </label>
        <textarea
          id="query"
          className="bh-textarea"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={3}
        />
        <div className="bh-compare-toolbar">
          <div className="bh-compare-toolbar__field">
            <label htmlFor="dumb-pick" className="bh-label">
              Baseline model
            </label>
            <select
              id="dumb-pick"
              className="bh-select"
              value={dumbId}
              onChange={(e) => setDumbId(e.target.value)}
            >
              {BASELINE_MODELS.filter((m) => !m.isHen).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} (collapse score {m.dumbnessScore})
                </option>
              ))}
            </select>
          </div>
          <label className="bh-compare-check">
            <input type="checkbox" checked={liveMode} onChange={(e) => setLiveMode(e.target.checked)} />
            Live org model (core-api)
          </label>
          {liveMode && (
            <button
              type="button"
              onClick={runLiveSearch}
              disabled={liveLoading || !query.trim()}
              className="bh-btn bh-btn--hen"
            >
              {liveLoading ? "Searching…" : "Search live corpus"}
            </button>
          )}
        </div>
      </div>

      <div className="bh-grid bh-grid--2">
        <CompareColumn
          mascot={<ConeMascot size={40} />}
          title={dumb.name}
          subtitle={`${dumb.tagline} · demo corpus`}
          score={dumb.dumbnessScore}
          rank={dumb.effectiveRank}
          ndcg={dumb.ndcg10}
          hits={dumbHits}
          variant="cone"
        />
        {liveMode ? (
          <div className="bh-card bh-card--hen">
            <div className="bh-card__header">
              <HenMascot size={40} />
              <div>
                <div className="bh-card__title">Blue Hen org model</div>
                <div className="bh-card__subtitle">
                  Live pgvector · {modelVersion ?? "run search"}
                </div>
              </div>
            </div>
            {liveError && <div className="bh-alert bh-alert--error">{liveError}</div>}
            <SearchHitList
              hits={liveHits}
              emptyMessage='Click "Search live corpus" to compare against your deployed org model.'
            />
          </div>
        ) : (
          <CompareColumn
            mascot={<HenMascot size={40} />}
            title={hen.name}
            subtitle={`${hen.tagline} · demo corpus`}
            score={hen.dumbnessScore}
            rank={hen.effectiveRank}
            ndcg={hen.ndcg10}
            hits={staticHenHits}
            variant="hen"
          />
        )}
      </div>
    </div>
  );
}

function CompareColumn({
  mascot,
  title,
  subtitle,
  score,
  rank,
  ndcg,
  hits,
  variant,
}: {
  mascot: React.ReactNode;
  title: string;
  subtitle: string;
  score: number;
  rank: number;
  ndcg: number;
  hits: { chunk: { id: string; title: string; text: string }; score: number }[];
  variant: "cone" | "hen";
}) {
  const statClass = variant === "hen" ? "bh-stat--hen" : "bh-stat--cone";
  const cardClass = variant === "hen" ? "bh-card bh-card--hen" : "bh-card bh-card--cone";

  return (
    <div className={cardClass}>
      <div className="bh-card__header">
        {mascot}
        <div>
          <div className="bh-card__title">{title}</div>
          <div className="bh-card__subtitle">{subtitle}</div>
        </div>
      </div>
      <DumbnessMeter score={score} label={dumbnessLabel(score)} />
      <div className="bh-compare-stats">
        <span>
          erank <strong className={statClass}>{rank.toFixed(1)}</strong>
        </span>
        <span>
          nDCG@10 <strong>{ndcg.toFixed(2)}</strong>
        </span>
      </div>
      <div>
        <div className="bh-label">Top retrieval (demo corpus)</div>
        <div className="bh-hits">
          {hits.map(({ chunk, score: s }, i) => (
            <div key={chunk.id} className="bh-hit">
              <div className="bh-hit__title">
                #{i + 1} · {chunk.title}
                <span className="bh-hit__score">{(s * 100).toFixed(0)}%</span>
              </div>
              <div className="bh-hit__body">{chunk.text.slice(0, 120)}…</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
