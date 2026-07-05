"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ArenaDeck } from "./decks";
import { getDeck } from "./decks";
import { DeckSelect } from "./DeckSelect";
import { Gauntlet } from "./Gauntlet";
import { RevealScreen } from "./RevealScreen";
import type { SessionStats } from "./types";

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
    return crypto.randomUUID().slice(0, 12);
  }
}

type Screen = "select" | "gauntlet" | "reveal";

/** Blind Rank orchestrator: deck → 8 picks → tier list reveal. */
export function ArenaClient({ decks }: { decks: ArenaDeck[] }) {
  const searchParams = useSearchParams();
  const deckParam = searchParams.get("deck");

  const [userRef, setUserRef] = useState("");
  const [screen, setScreen] = useState<Screen>("select");
  const [deck, setDeck] = useState<ArenaDeck | null>(null);
  const [playCount, setPlayCount] = useState(0);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [autoStarted, setAutoStarted] = useState(false);

  useEffect(() => {
    setUserRef(readOrCreateUserRef());
  }, []);

  useEffect(() => {
    if (autoStarted || !deckParam) return;
    const picked = getDeck(deckParam);
    if (picked) {
      setDeck(picked);
      setPlayCount((n) => n + 1);
      setSessionStats(null);
      setScreen("gauntlet");
      setAutoStarted(true);
    }
  }, [autoStarted, deckParam]);

  function startDeck(d: ArenaDeck) {
    setDeck(d);
    setPlayCount((n) => n + 1);
    setSessionStats(null);
    setScreen("gauntlet");
  }

  function backToSelect() {
    setScreen("select");
    setDeck(null);
    setSessionStats(null);
  }

  return (
    <div className="arena">
      <p className="arena-consent">
        Picks are anonymous and stored to sharpen rankings. No accounts.{" "}
        <a href="/legal/privacy">Privacy</a>.
      </p>

      {screen === "select" && <DeckSelect decks={decks} onSelect={startDeck} />}

      {screen === "gauntlet" && deck && (
        <Gauntlet
          key={`${deck.slug}-${playCount}`}
          deck={deck}
          userRef={userRef}
          onDone={(stats) => {
            setSessionStats(stats);
            setScreen("reveal");
          }}
        />
      )}

      {screen === "reveal" && deck && sessionStats && (
        <RevealScreen
          deck={deck}
          userRef={userRef}
          sessionStats={sessionStats}
          onReplay={backToSelect}
        />
      )}
    </div>
  );
}
