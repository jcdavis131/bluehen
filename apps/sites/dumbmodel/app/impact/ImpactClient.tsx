"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const ARENA_USER_REF_KEY = "arena-user-ref";
const BEAT_USER_REF_KEY = "beat-user-ref";

type Counts = Record<string, number>;
type LeaderboardEntry = { ref: string; contributions: number };

type ImpactResponse = {
  sinceDays?: number;
  you?: Counts | null;
  totals?: Counts;
  leaderboard?: LeaderboardEntry[];
};

/** Known contribution kinds get a plain-English gloss; anything else the
 * API returns just gets a humanized label — the shape is API-owned, not
 * hardcoded here. */
const FIELD_EXPLANATIONS: Record<string, string> = {
  triplets: "hard negatives you mined by poisoning the baseline",
  picks: "this-or-that calls you made in Blind Rank",
  verdicts: "times the model predicted your pick, right or wrong, and you found out",
};

function humanize(key: string): string {
  const spaced = key.replace(/[_-]+/g, " ").trim();
  return spaced.replace(/\b\w/g, (c) => c.toUpperCase());
}

function readRef(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.sessionStorage.getItem(key);
    return v && v.trim() ? v.trim() : null;
  } catch {
    return null;
  }
}

async function fetchImpact(userRef: string | null): Promise<ImpactResponse | null> {
  try {
    const qs = userRef ? `?userRef=${encodeURIComponent(userRef)}` : "";
    const res = await fetch(`/api/impact${qs}`);
    const data = await res.json().catch(() => null);
    if (!res.ok || !data) return null;
    return data as ImpactResponse;
  } catch {
    return null;
  }
}

function mergeCounts(a: Counts, b: Counts): Counts {
  const out: Counts = { ...a };
  for (const [k, v] of Object.entries(b)) {
    if (typeof v !== "number") continue;
    out[k] = (out[k] ?? 0) + v;
  }
  return out;
}

function numericEntries(counts: Counts | undefined | null): [string, number][] {
  if (!counts) return [];
  return Object.entries(counts).filter((e): e is [string, number] => typeof e[1] === "number");
}

/**
 * Player Impact client (Spec GAME-002): reads the anonymous session refs
 * both games already mint (arena-user-ref, beat-user-ref), queries the
 * impact BFF once per ref found, and merges the "you" counts client-side
 * — one player, two games, one honest tally. Totals and the leaderboard
 * are fleet-wide and identical across calls, so the first response wins.
 */
export function ImpactClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [you, setYou] = useState<Counts | null>(null);
  const [totals, setTotals] = useState<Counts>({});
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [sinceDays, setSinceDays] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const refs = Array.from(
        new Set(
          [readRef(ARENA_USER_REF_KEY), readRef(BEAT_USER_REF_KEY)].filter(
            (r): r is string => r !== null,
          ),
        ),
      );

      const responses =
        refs.length > 0
          ? await Promise.all(refs.map((ref) => fetchImpact(ref)))
          : [await fetchImpact(null)];

      if (cancelled) return;

      const ok = responses.filter((r): r is ImpactResponse => r !== null);
      if (ok.length === 0) {
        setError("Couldn't reach the impact ledger — try again in a bit.");
        setLoading(false);
        return;
      }

      let mergedYou: Counts | null = null;
      for (const r of ok) {
        if (r.you) {
          mergedYou = mergedYou ? mergeCounts(mergedYou, r.you) : { ...r.you };
        }
      }

      setYou(mergedYou);
      setTotals(ok[0].totals ?? {});
      setLeaderboard(Array.isArray(ok[0].leaderboard) ? ok[0].leaderboard : []);
      setSinceDays(typeof ok[0].sinceDays === "number" ? ok[0].sinceDays : null);
      setLoading(false);
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const youEntries = numericEntries(you);
  const youTotal = youEntries.reduce((sum, [, v]) => sum + v, 0);
  const totalsEntries = numericEntries(totals);

  return (
    <div className="impact">
      {loading && <p className="bh-muted">Counting your dents…</p>}
      {error && <div className="bh-alert bh-alert--error">{error}</div>}

      {!loading && !error && (
        <>
          <section className="impact-card">
            <h3 className="impact-card-title">You</h3>
            {youTotal === 0 ? (
              <p className="impact-empty">No dents yet — go play.</p>
            ) : (
              <ul className="impact-count-list">
                {youEntries.map(([key, value]) => (
                  <li key={key} className="impact-count-row">
                    <span className="impact-count-value">{value}</span>
                    <span className="impact-count-label">
                      {humanize(key)}
                      {FIELD_EXPLANATIONS[key] && (
                        <span className="impact-count-explain"> — {FIELD_EXPLANATIONS[key]}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="impact-card">
            <h3 className="impact-card-title">Everyone</h3>
            {sinceDays != null && <p className="impact-since">last {sinceDays} days</p>}
            {totalsEntries.length === 0 ? (
              <p className="impact-empty">No contributions logged yet.</p>
            ) : (
              <ul className="impact-count-list">
                {totalsEntries.map(([key, value]) => (
                  <li key={key} className="impact-count-row">
                    <span className="impact-count-value">{value}</span>
                    <span className="impact-count-label">{humanize(key)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="impact-card">
            <h3 className="impact-card-title">Top contributors</h3>
            {leaderboard.length === 0 ? (
              <p className="impact-empty">Leaderboard is empty — be the first.</p>
            ) : (
              <ol className="impact-leaderboard">
                {leaderboard.slice(0, 10).map((entry, i) => (
                  <li key={entry.ref} className="impact-leaderboard-row">
                    <span className="impact-leaderboard-rank">{i + 1}</span>
                    <span className="impact-leaderboard-ref">{entry.ref}</span>
                    <span className="impact-leaderboard-count">{entry.contributions}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}

      <p className="impact-caption">
        Every contribution is a labeled training example for the next model — humans are the
        quality ceiling.
      </p>

      <div className="impact-tiles">
        <Link href="/beat" className="impact-tile">
          <h4>Beat the Baseline</h4>
          <p>Poison a query, mine a hard negative.</p>
        </Link>
        <Link href="/arena" className="impact-tile">
          <h4>Blind Rank</h4>
          <p>Eight picks, tier list reveal — shareable like the videos.</p>
        </Link>
      </div>
    </div>
  );
}
