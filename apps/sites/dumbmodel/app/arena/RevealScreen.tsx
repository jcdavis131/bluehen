"use client";

import { useEffect, useMemo, useState } from "react";
import { ProgressMeter } from "@synthaembed/ui-fleet";
import type { ArenaDeck } from "./decks";
import { SessionScoreCard } from "./SessionScoreCard";
import type { SessionStats } from "./types";

type RankFactors = {
  personal: number | null;
  query: number | null;
  boosts: Record<string, number | null> | null;
  weights: { personal: number; query: number; boosts: number };
};

type RankedItem = {
  id: string;
  text: string;
  score: number;
  factors: RankFactors;
};

type RankResponse = {
  ranked: RankedItem[];
  personalized: boolean;
  candidateCount: number;
};

/** The Reveal (Spec 0029 §1.3 + 0032): full-deck rank + session score. */
export function RevealScreen({
  deck,
  userRef,
  sessionStats,
  onReplay,
}: {
  deck: ArenaDeck;
  userRef: string;
  sessionStats: SessionStats;
  onReplay: () => void;
}) {
  const [result, setResult] = useState<RankResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareSupported, setShareSupported] = useState(false);

  const pickedIds = useMemo(
    () => new Set(sessionStats.picks.map((p) => p.id)),
    [sessionStats.picks],
  );

  useEffect(() => {
    setShareSupported(typeof navigator !== "undefined" && "share" in navigator);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function reveal() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/arena/reveal", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            userRef,
            query: deck.name,
            items: deck.items,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? `reveal failed (${res.status})`);
        if (!cancelled) setResult(data as RankResponse);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void reveal();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck.slug, userRef]);

  async function share() {
    const pct = Math.round((sessionStats.matches / sessionStats.total) * 100);
    const shareData = {
      title: `${deck.name} — Shapley Arena`,
      text: `I matched the model ${sessionStats.matches}/${sessionStats.total} (${pct}%) on ${deck.name}. Your turn.`,
      url: typeof window !== "undefined" ? `${window.location.origin}/arena?deck=${deck.slug}` : "",
    };
    if (shareSupported) {
      try {
        await navigator.share(shareData);
      } catch {
        // user cancelled
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(shareData.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("couldn't copy the link — copy it from the address bar");
    }
  }

  if (loading) {
    return (
      <div>
        <SessionScoreCard stats={sessionStats} />
        <p className="bh-muted">Ranking your picks…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <SessionScoreCard stats={sessionStats} />
        <div className="bh-alert bh-alert--error">{error}</div>
        <div className="arena-share-row">
          <button type="button" className="bh-btn bh-btn--ghost" onClick={onReplay}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div>
      <SessionScoreCard stats={sessionStats} />

      <p className="bh-meta">
        {result.personalized
          ? "Built from your 8 picks just now — play another deck and watch it sharpen."
          : "Not enough signal yet — the more you pick, the sharper this gets."}
      </p>

      {sessionStats.picks.length > 0 && (
        <details className="arena-pick-timeline-wrap" open>
          <summary>Your 8 picks</summary>
          <ol className="arena-pick-timeline">
            {sessionStats.picks.map((p) => (
              <li key={`${p.round}-${p.id}`}>
                <span className="arena-reveal-rank">R{p.round}</span>
                {p.text}
              </li>
            ))}
          </ol>
        </details>
      )}

      <h3 className="arena-reveal-heading">Full deck ranking</h3>
      <ol className="arena-reveal-list">
        {result.ranked.map((item, i) => (
          <li
            key={item.id}
            className={`arena-reveal-item${pickedIds.has(item.id) ? " is-picked" : ""}`}
          >
            <div>
              <span className="arena-reveal-rank">#{i + 1}</span>
              {item.text}
              {pickedIds.has(item.id) && (
                <span className="arena-picked-badge">you picked</span>
              )}
            </div>
            <ProgressMeter
              label="Score"
              value={item.score * 100}
              max={100}
              digits={0}
              suffix="%"
              tone="clay"
            />
            <details className="arena-reveal-factors">
              <summary>Why this rank?</summary>
              <dl>
                <dt>Personal fit</dt>
                <dd>
                  {item.factors.personal != null ? item.factors.personal.toFixed(3) : "n/a"}
                  {" (weight "}
                  {item.factors.weights.personal}
                  {")"}
                </dd>
                <dt>Query match</dt>
                <dd>
                  {item.factors.query != null ? item.factors.query.toFixed(3) : "n/a"}
                  {" (weight "}
                  {item.factors.weights.query}
                  {")"}
                </dd>
                <dt>Boosts</dt>
                <dd>
                  {item.factors.boosts
                    ? Object.entries(item.factors.boosts)
                        .map(([k, v]) => `${k}: ${v ?? "n/a"}`)
                        .join(", ")
                    : "none"}
                  {" (weight "}
                  {item.factors.weights.boosts}
                  {")"}
                </dd>
              </dl>
            </details>
          </li>
        ))}
      </ol>

      <div className="arena-share-row">
        <button type="button" className="bh-btn bh-btn--primary" onClick={onReplay}>
          Play another deck
        </button>
        <button type="button" className="bh-btn bh-btn--ghost" onClick={share}>
          {copied ? "Link copied!" : shareSupported ? "Share score" : "Copy link"}
        </button>
      </div>
    </div>
  );
}
