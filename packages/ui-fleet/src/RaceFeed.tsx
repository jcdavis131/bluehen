"use client";

import { useEffect, useRef, useState } from "react";
import { ledgerStageToDivision, stageLabel } from "@synthaembed/fleet";

export interface LedgerEntry {
  stage: string;
  siteId?: string | null;
  notes?: string | null;
  modelVersion?: string | null;
  metricDelta?: number | null;
  costUsd?: number | null;
  ts?: string;
}

const DIVISION_ACCENT: Record<string, string> = {
  orchestration: "var(--bh-div-orchestration)",
  data: "var(--bh-div-data)",
  research: "var(--bh-div-research)",
  bd: "var(--bh-div-bd)",
  execution: "var(--bh-div-execution)",
};

/** Stable entry identity: ts + stage alone collide for same-second,
 * same-stage entries — include a slice of the payload. */
function entryKey(e: LedgerEntry): string {
  return `${e.ts}-${e.stage}-${(e.notes ?? e.modelVersion ?? "").slice(0, 24)}`;
}

function relTime(ts?: string): string {
  if (!ts) return "";
  const ms = Date.now() - new Date(ts).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "";
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/** Race Feed — the ledger as a living feed. Entries slide in as they
 * arrive (polled via the site's BFF /api/ledger); every field shown is a
 * real ledger column. */
export function RaceFeed({
  initial = [],
  pollMs = 20000,
  limit = 10,
}: {
  initial?: LedgerEntry[];
  pollMs?: number;
  limit?: number;
}) {
  const [entries, setEntries] = useState<LedgerEntry[]>(initial.slice(0, limit));
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const known = useRef(new Set(initial.map(entryKey)));

  useEffect(() => {
    let live = true;
    const tick = async () => {
      try {
        const res = await fetch("/api/ledger", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { entries?: LedgerEntry[] };
        if (!live || !data.entries) return;
        const arrived: string[] = [];
        for (const e of data.entries) {
          const key = entryKey(e);
          if (!known.current.has(key)) {
            known.current.add(key);
            arrived.push(key);
          }
        }
        if (known.current.size > 500) {
          known.current = new Set(data.entries.map(entryKey)); // bound growth
        }
        setEntries(data.entries.slice(0, limit));
        if (arrived.length > 0) {
          setFresh(new Set(arrived));
          setTimeout(() => live && setFresh(new Set()), 2400);
        }
      } catch {
        // feed keeps last-known entries; staleness is visible via timestamps
      }
    };
    tick(); // immediate first poll — no blind first interval
    const id = setInterval(tick, pollMs);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [pollMs, limit]);

  if (entries.length === 0) {
    return (
      <div className="bh-muted" style={{ padding: 16, fontSize: "0.8125rem" }}>
        No entries yet. Start core-api and run: <code>synth budget</code>
      </div>
    );
  }

  return (
    <ol className="bh-feed" aria-live="polite" aria-label="Race log feed">
      {entries.map((e, i) => {
        const key = entryKey(e);
        const division = ledgerStageToDivision(e.stage);
        const accent = (division && DIVISION_ACCENT[division]) || "var(--bh-muted)";
        return (
          <li
            key={key}
            className={`bh-feed__item${fresh.has(key) ? " is-fresh" : ""}`}
          >
            <span className="bh-feed__dot" style={{ background: accent }} aria-hidden />
            <span className="bh-feed__stage bh-mono" style={{ color: accent }}>
              {stageLabel(e.stage)}
            </span>
            <span className="bh-feed__body">
              {e.notes ?? e.modelVersion ?? ""}
              {typeof e.metricDelta === "number" && (
                <span className={`bh-feed__delta${e.metricDelta >= 0 ? " is-up" : " is-down"}`}>
                  {e.metricDelta >= 0 ? "+" : ""}
                  {e.metricDelta.toFixed(4)}
                </span>
              )}
              {typeof e.costUsd === "number" && e.costUsd > 0 && (
                <span className="bh-feed__cost bh-mono">${e.costUsd.toFixed(2)}</span>
              )}
            </span>
            <span className="bh-feed__time bh-mono">
              {i === 0 && <span className="bh-feed__here">latest</span>}
              {relTime(e.ts)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
