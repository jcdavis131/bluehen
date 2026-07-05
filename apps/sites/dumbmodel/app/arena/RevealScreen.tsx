"use client";

import { useEffect, useState } from "react";
import { ProgressMeter } from "@synthaembed/ui-fleet";
import type { ArenaDeck } from "./decks";

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

/** The Reveal (Spec 0029 §1.3): a real /v1/rank response, never
 * fabricated — the honest note appears whenever personalized is false. */
export function RevealScreen({
  deck,
  userRef,
  onReplay,
}: {
  deck: ArenaDeck;
  userRef: string;
  onReplay: () => void;
}) {
  const [result, setResult] = useState<RankResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareSupported, setShareSupported] = useState(false);

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
          body: JSON.stringify({ userRef, items: deck.items }),
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
    const shareData = {
      title: `${deck.name} — Rank Arena`,
      text: `I just ranked ${deck.name} in dumbmodel's Rank Arena. Your turn.`,
      url: typeof window !== "undefined" ? window.location.href : "",
    };
    if (shareSupported) {
      try {
        await navigator.share(shareData);
      } catch {
        // user cancelled the share sheet — not an error worth surfacing
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
    return <p className="bh-muted">Ranking your picks…</p>;
  }

  if (error) {
    return (
      <div>
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
      <p className="bh-meta">
        {result.personalized
          ? "Built from your 12 picks just now — play another deck and watch it sharpen."
          : "Not enough signal yet — the more you pick, the sharper this gets."}
      </p>

      <ol className="arena-reveal-list">
        {result.ranked.map((item, i) => (
          <li key={item.id} className="arena-reveal-item">
            <div>
              <span className="arena-reveal-rank">#{i + 1}</span>
              {item.text}
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
          Replay
        </button>
        <button type="button" className="bh-btn bh-btn--ghost" onClick={share}>
          {copied ? "Link copied!" : shareSupported ? "Share" : "Copy link"}
        </button>
      </div>
    </div>
  );
}
