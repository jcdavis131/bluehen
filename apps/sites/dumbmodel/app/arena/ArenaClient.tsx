"use client";

import { useEffect, useState } from "react";
import type { ArenaDeck } from "./decks";
import { DeckSelect } from "./DeckSelect";
import { Gauntlet } from "./Gauntlet";
import { RevealScreen } from "./RevealScreen";

const USER_REF_KEY = "arena-user-ref";

function readOrCreateUserRef(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.sessionStorage.getItem(USER_REF_KEY);
    if (existing) return existing;
    const fresh = crypto.randomUUID().slice(0, 12);
    window.sessionStorage.setItem(USER_REF_KEY, fresh);
    return fresh;
  } catch {
    // sessionStorage unavailable (private mode, etc.) — still play, just
    // without cross-deck compounding this tab session.
    return crypto.randomUUID().slice(0, 12);
  }
}

type Screen = "select" | "gauntlet" | "reveal";

/** Rank Arena orchestrator (Spec 0029): deck select -> gauntlet -> reveal,
 * with a session-scoped anonymous userRef that persists across replays so
 * the taste vector compounds (spec §1.4 — "the compounding is the game"). */
export function ArenaClient({ decks }: { decks: ArenaDeck[] }) {
  const [userRef, setUserRef] = useState("");
  const [screen, setScreen] = useState<Screen>("select");
  const [deck, setDeck] = useState<ArenaDeck | null>(null);
  const [playCount, setPlayCount] = useState(0);

  useEffect(() => {
    setUserRef(readOrCreateUserRef());
  }, []);

  function startDeck(d: ArenaDeck) {
    setDeck(d);
    setPlayCount((n) => n + 1);
    setScreen("gauntlet");
  }

  function backToSelect() {
    setScreen("select");
    setDeck(null);
  }

  return (
    <div className="arena">
      {screen === "select" && <DeckSelect decks={decks} onSelect={startDeck} />}

      {screen === "gauntlet" && deck && (
        <Gauntlet
          key={`${deck.slug}-${playCount}`}
          deck={deck}
          userRef={userRef}
          onDone={() => setScreen("reveal")}
        />
      )}

      {screen === "reveal" && deck && (
        <RevealScreen deck={deck} userRef={userRef} onReplay={backToSelect} />
      )}
    </div>
  );
}
