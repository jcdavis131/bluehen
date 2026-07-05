"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ArenaDeck } from "./decks";
import { RoundTimeline } from "./RoundTimeline";
import { SessionScoreCard } from "./SessionScoreCard";
import { TierReveal } from "./TierReveal";
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

const CERTIFY_HREF =
  "https://slasso.com/certify?utm_source=dumbmodel&utm_medium=arena-reveal";

/** Blind-rank reveal: tier list drop, then optional full ranking details. */
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
  const [tierDone, setTierDone] = useState(false);

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
      setTierDone(false);
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
    const top = result?.ranked[0]?.text ?? "something";
    const pct = Math.round((sessionStats.matches / sessionStats.total) * 100);
    const shareData = {
      title: `Blind Rank — ${deck.name}`,
      text: `My #1 on ${deck.name}: "${top}". We guessed ${sessionStats.matches}/${sessionStats.total} (${pct}%). Rank yours blind.`,
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
      await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("couldn't copy — grab the link from the address bar");
    }
  }

  if (loading) {
    return (
      <div className="arena-blind-reveal">
        <SessionScoreCard stats={sessionStats} />
        <p className="arena-tier-countdown">Building your tier list…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="arena-blind-reveal">
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
    <div className="arena-blind-reveal">
      <SessionScoreCard stats={sessionStats} />

      <p className="arena-blind-reveal-lead">
        {result.personalized
          ? "Built from your 8 picks — no peeking until now."
          : "Not enough signal yet — play again and the list gets sharper."}
      </p>

      <TierReveal
        ranked={result.ranked}
        pickedIds={pickedIds}
        onRevealDone={() => setTierDone(true)}
      />

      {tierDone && (
        <>
          <RoundTimeline rounds={sessionStats.rounds} />

          <details className="arena-blind-details">
            <summary>Full ranking + why</summary>
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
                  <details className="arena-reveal-factors">
                    <summary>Why here?</summary>
                    <dl>
                      <dt>Personal fit</dt>
                      <dd>
                        {item.factors.personal != null ? item.factors.personal.toFixed(3) : "n/a"}
                      </dd>
                      <dt>Query match</dt>
                      <dd>
                        {item.factors.query != null ? item.factors.query.toFixed(3) : "n/a"}
                      </dd>
                    </dl>
                  </details>
                </li>
              ))}
            </ol>
          </details>

          <div className="arena-share-row">
            <button type="button" className="bh-btn bh-btn--primary" onClick={onReplay}>
              Rank another deck
            </button>
            <button type="button" className="bh-btn bh-btn--ghost" onClick={share}>
              {copied ? "Copied!" : shareSupported ? "Share your list" : "Copy for TikTok"}
            </button>
            <Link href={CERTIFY_HREF} className="bh-btn bh-btn--ghost">
              Get certified
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
