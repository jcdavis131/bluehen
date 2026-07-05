"use client";

import { useEffect, useMemo, useState } from "react";
import { groupIntoTiers, type RankedForTier } from "./tierBuckets";

type RankedItem = {
  id: string;
  text: string;
  score: number;
};

/** Staggered S→D tier list — the blind-rank video payoff. */
export function TierReveal({
  ranked,
  pickedIds,
  onRevealDone,
}: {
  ranked: RankedItem[];
  pickedIds: Set<string>;
  onRevealDone?: () => void;
}) {
  const groups = useMemo(() => groupIntoTiers(ranked), [ranked]);
  const flat = useMemo(
    () => groups.flatMap((g) => g.items.map((item) => ({ ...item, tier: g.id }))),
    [groups],
  );

  const [revealed, setRevealed] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setRevealed(0);
    setDone(false);
  }, [ranked]);

  useEffect(() => {
    if (flat.length === 0) return;
    if (revealed >= flat.length) {
      setDone(true);
      onRevealDone?.();
      return;
    }
    const delay = revealed === 0 ? 400 : revealed === 1 ? 700 : 320;
    const t = setTimeout(() => setRevealed((n) => n + 1), delay);
    return () => clearTimeout(t);
  }, [flat.length, onRevealDone, revealed]);

  const topPick = flat[0] as (RankedForTier & { tier: string }) | undefined;

  return (
    <div className="arena-tier-reveal">
      {!done && revealed === 0 && (
        <p className="arena-tier-countdown" aria-live="polite">
          Your ranking is ready…
        </p>
      )}

      {topPick && revealed >= 1 && (
        <div
          className={`arena-tier-crown${revealed === 1 ? " is-dropping" : ""}`}
          aria-label={`Number one: ${topPick.text}`}
        >
          <span className="arena-tier-crown-label">#1</span>
          <p className="arena-tier-crown-text">{topPick.text}</p>
          {pickedIds.has(topPick.id) && (
            <span className="arena-tier-you-picked">you picked this</span>
          )}
        </div>
      )}

      <div className="arena-tier-board" role="list" aria-label="Your blind rank tier list">
        {groups.map((group) => {
          const groupItems = group.items.filter((item) => {
            const flatIdx = flat.findIndex((f) => f.id === item.id);
            return flatIdx >= 0 && flatIdx < revealed;
          });
          if (groupItems.length === 0) return null;

          return (
            <section
              key={group.id}
              className={`arena-tier-row arena-tier-row--${group.id.toLowerCase()}`}
              role="listitem"
            >
              <header className="arena-tier-row-head">
                <span className="arena-tier-badge">{group.label}</span>
                <span className="arena-tier-tagline">{group.tagline}</span>
              </header>
              <ul className="arena-tier-items">
                {groupItems.map((item) => (
                  <li
                    key={item.id}
                    className={`arena-tier-item${pickedIds.has(item.id) ? " is-picked" : ""}`}
                  >
                    <span className="arena-tier-rank">#{item.rank}</span>
                    <span className="arena-tier-item-text">{item.text}</span>
                    {pickedIds.has(item.id) && (
                      <span className="arena-tier-picked-dot" title="You picked this">
                        ★
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      {done && (
        <p className="arena-tier-done" aria-live="polite">
          That&apos;s your list. Send it to someone who disagrees.
        </p>
      )}
    </div>
  );
}
