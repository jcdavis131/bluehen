"use client";

import { useEffect, useState } from "react";
import type { LedgerEntry } from "./RaceFeed";
import { stageLabel } from "@synthaembed/fleet";

const STORAGE_KEY = "bh-last-visit";

/** "Since your last visit" — one honest, personal line computed from the
 * real ledger against a locally-stored last-visit timestamp. First-time
 * visitors see nothing (no manufactured familiarity). */
export function ReturnGreeting({ ledger }: { ledger: LedgerEntry[] }) {
  const [line, setLine] = useState<string | null>(null);

  useEffect(() => {
    let last: string | null = null;
    try {
      last = localStorage.getItem(STORAGE_KEY);
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {
      return;
    }
    if (!last) return;
    const advances = ledger.filter((e) => e.ts && e.ts > last);
    if (advances.length === 0) return;
    const latest = advances[0];
    setLine(
      `Since your last visit: ${advances.length} loop advance${advances.length === 1 ? "" : "s"}; latest, ${stageLabel(latest.stage)}.`,
    );
  }, [ledger]);

  if (!line) return null;
  return (
    <p className="bh-meta" role="status" style={{ margin: "0 0 12px" }}>
      {line}
    </p>
  );
}
