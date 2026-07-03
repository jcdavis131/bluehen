"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "bh-last-visit";

/** UX-120 (Spec 0020): refinery-grounded return greeting, same honest
 * pattern as ui-fleet's ReturnGreeting (locally-stored last-visit timestamp,
 * one line, nothing on first visit) — but computed from this catalog's real
 * dataset `createdAt` timestamps instead of the operations ledger, because
 * that primitive's copy ("loop advances") describes lifecycle state this
 * homepage does not fetch. No new datasets since last visit → renders
 * nothing; no manufactured familiarity. */
export function CatalogReturnGreeting({
  datasets,
}: {
  datasets: { slug: string; name: string; createdAt: string }[];
}) {
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
    const fresh = datasets.filter((d) => d.createdAt && d.createdAt > last);
    if (fresh.length === 0) return;
    const newest = fresh.reduce((a, b) => (a.createdAt >= b.createdAt ? a : b));
    setLine(
      `Since your last visit: ${fresh.length} new dataset${fresh.length === 1 ? "" : "s"} entered the catalog — latest, ${newest.name}.`,
    );
  }, [datasets]);

  if (!line) return null;
  return (
    <p className="bh-meta" role="status" style={{ margin: "0 0 12px" }}>
      {line}
    </p>
  );
}
