"use client";

import { useMemo, useState } from "react";

/** RANK-002: a live POST /v1/rank playground on the developers page,
 * proxied through /api/launchpad/rank with the sandbox key. Mirrors the
 * honest-state contract of the API itself — `personalized: false` is
 * rendered plainly, never hidden or dressed up. */

const MAX_ITEMS = 30;
const DEFAULT_ITEMS =
  "Waterproof trail running shoe built for wet, uneven terrain.\n" +
  "Vacuum-insulated stainless flask, keeps drinks cold for 24 hours.\n" +
  "Lightweight packable rain shell with pit zips.";

type Factors = {
  personal: number | null;
  query: number | null;
  boosts: Record<string, number | null> | null;
  weights: { personal: number; query: number; boosts: number };
};

type RankedItem = {
  id: string;
  text: string;
  score: number;
  factors: Factors;
};

type RankResponse = {
  ranked?: RankedItem[];
  personalized?: boolean;
  candidateCount?: number;
  note?: string;
};

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

function parseItems(raw: string): string[] {
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

export function RankPlayground() {
  const [itemsText, setItemsText] = useState(DEFAULT_ITEMS);
  const [query, setQuery] = useState("");
  const [userRef, setUserRef] = useState("");
  const [wPersonal, setWPersonal] = useState(45);
  const [wQuery, setWQuery] = useState(45);
  const [wBoosts, setWBoosts] = useState(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RankResponse | null>(null);

  const items = useMemo(() => parseItems(itemsText), [itemsText]);
  const overItems = items.length > MAX_ITEMS;

  const weightSum = wPersonal + wQuery + wBoosts;
  const normPersonal = weightSum > 0 ? wPersonal / weightSum : 0;
  const normQuery = weightSum > 0 ? wQuery / weightSum : 0;
  const normBoosts = weightSum > 0 ? wBoosts / weightSum : 0;

  const canRun = items.length > 0 && !overItems && !busy;

  async function handleRun() {
    if (!canRun) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/launchpad/rank", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: items.map((text, i) => ({ id: String(i + 1), text })),
          ...(query.trim() ? { query: query.trim() } : {}),
          ...(userRef.trim() ? { userRef: userRef.trim() } : {}),
          policy: { wPersonal: normPersonal, wQuery: normQuery, wBoosts: normBoosts },
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const message =
          data && typeof data === "object" && "error" in data && typeof data.error === "string"
            ? data.error
            : `request failed (${res.status})`;
        throw new Error(message);
      }
      setResult(data as RankResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : "rank failed");
      setResult(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bh-card" style={{ marginTop: 16, padding: 20 }}>
      <div className="bh-card__title" style={{ marginTop: 0 }}>
        Try it — POST /v1/rank
      </div>
      <p className="bh-card__body">
        Paste candidates, optionally add a query and a hashed userRef, tune the
        weights, and run it against the sandbox key. This calls the real
        endpoint — nothing here is simulated.
      </p>

      <label className="bh-label" htmlFor="rank-items">
        Items (one per line)
      </label>
      <textarea
        id="rank-items"
        className="bh-input"
        style={{ width: "100%", minHeight: 120, fontFamily: "var(--bh-font-mono)", marginBottom: 8 }}
        value={itemsText}
        onChange={(e) => setItemsText(e.target.value)}
        placeholder={"Waterproof trail running shoe...\nVacuum-insulated stainless flask...\n..."}
      />
      <p className="bh-meta" style={{ marginBottom: 16 }}>
        {items.length} of {MAX_ITEMS} items
        {overItems ? " — over the sandbox limit" : ""}
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ flex: "1 1 220px" }}>
          <label className="bh-label" htmlFor="rank-query">
            Query (optional)
          </label>
          <input
            id="rank-query"
            className="bh-input"
            style={{ width: "100%" }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. gift for someone who hikes"
          />
        </div>
        <div style={{ flex: "1 1 220px" }}>
          <label className="bh-label" htmlFor="rank-userref">
            userRef (optional, hashed)
          </label>
          <input
            id="rank-userref"
            className="bh-input"
            style={{ width: "100%", fontFamily: "var(--bh-font-mono)" }}
            value={userRef}
            onChange={(e) => setUserRef(e.target.value)}
            placeholder="e.g. 8f14e45fceea167a5a36dedd4bea2543"
          />
        </div>
      </div>

      <div className="bh-label" style={{ marginBottom: 8 }}>
        Policy weights — live-normalized to {pct(normPersonal)} / {pct(normQuery)} /{" "}
        {pct(normBoosts)}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        <WeightSlider label="Personal" value={wPersonal} pct={normPersonal} onChange={setWPersonal} />
        <WeightSlider label="Query" value={wQuery} pct={normQuery} onChange={setWQuery} />
        <WeightSlider label="Boosts" value={wBoosts} pct={normBoosts} onChange={setWBoosts} />
      </div>
      <p className="bh-meta" style={{ marginBottom: 16, fontStyle: "italic" }}>
        Boosts need contract-declared numeric/date fields (Spec 0028 §3) — this
        sandbox has none configured, so the boosts weight has nothing to act on.
      </p>

      {error && (
        <p className="bh-card__body" style={{ color: "var(--bh-danger, #a4322e)" }}>
          {error}
        </p>
      )}

      <button
        type="button"
        className="bh-btn bh-btn--primary"
        disabled={!canRun}
        onClick={handleRun}
        style={{ marginBottom: 20 }}
      >
        {busy ? "Ranking…" : "Run"}
      </button>

      {result && <RankResults result={result} />}
    </div>
  );
}

function WeightSlider({
  label,
  value,
  pct: p,
  onChange,
}: {
  label: string;
  value: number;
  pct: number;
  onChange: (v: number) => void;
}) {
  const id = `rank-w-${label.toLowerCase()}`;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <label className="bh-meta" htmlFor={id}>
          {label}
        </label>
        <span className="bh-meta">{pct(p)}</span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%" }}
        aria-label={`${label} weight`}
      />
    </div>
  );
}

function RankResults({ result }: { result: RankResponse }) {
  const ranked = result.ranked ?? [];

  return (
    <div>
      {result.personalized === false && (
        <div className="bh-card bh-card--inset" style={{ padding: 14, marginBottom: 16 }}>
          <p className="bh-card__body" style={{ margin: 0 }}>
            <strong>personalized: false</strong> — no consented interaction
            history for this userRef (or none was provided), so the personal
            weight redistributed to query/boosts rather than fabricating an
            affinity. This is the honest state, not an error.
          </p>
        </div>
      )}

      {ranked.length === 0 ? (
        <p className="bh-muted" style={{ fontSize: "0.8125rem" }}>
          No ranked results.
        </p>
      ) : (
        <div className="bh-table-wrap">
          <table className="bh-table">
            <tbody>
              <tr>
                <th>#</th>
                <th>Item</th>
                <th>Score</th>
                <th>Factors</th>
              </tr>
              {ranked.map((r, i) => (
                <tr key={r.id ?? i}>
                  <td>{i + 1}</td>
                  <td>{truncate(r.text, 70)}</td>
                  <td className="bh-mono">{r.score.toFixed(4)}</td>
                  <td>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      <span className={`bh-badge${r.factors.personal !== null ? " bh-badge--accent" : ""}`}>
                        personal {r.factors.personal !== null ? r.factors.personal.toFixed(2) : "—"}
                      </span>
                      <span className={`bh-badge${r.factors.query !== null ? " bh-badge--accent" : ""}`}>
                        query {r.factors.query !== null ? r.factors.query.toFixed(2) : "—"}
                      </span>
                      <span className="bh-badge">
                        w {pct(r.factors.weights.personal)}/{pct(r.factors.weights.query)}/
                        {pct(r.factors.weights.boosts)}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="bh-meta" style={{ marginTop: 8 }}>
        {result.candidateCount ?? ranked.length} candidate(s) ranked.
      </p>
    </div>
  );
}
