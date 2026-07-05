"use client";

import { Suspense } from "react";
import type { ArenaDeck } from "./decks";
import { ArenaClient } from "./ArenaClient";

function ArenaClientFallback() {
  return <p className="bh-muted">Loading arena…</p>;
}

/** Client boundary wrapper for useSearchParams (deck deep links). */
export function ArenaClientShell({ decks }: { decks: ArenaDeck[] }) {
  return (
    <Suspense fallback={<ArenaClientFallback />}>
      <ArenaClient decks={decks} />
    </Suspense>
  );
}
