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
    return crypto.randomUUID().slice(0, 12);
  }
}

type Screen = "select" | "gauntlet" | "reveal";
type SessionPick = { round: number; id: string; text: string };

/** Shapley Arena orchestrator (Spec 0032): deck → 8-round gauntlet → reveal. */
export function ArenaClient({ decks }: { decks: ArenaDeck[] }) {
  const [userRef, setUserRef] = useState("");
  const [screen, setScreen] = useState<Screen>("select");
  const [deck, setDeck] = useState<ArenaDeck | null>(null);
  const [playCount, setPlayCount] = useState(0);
  const [sessionPicks, setSessionPicks] = useState<SessionPick[]>([]);

  useEffect(() => {
    setUserRef(readOrCreateUserRef());
  }, []);

  function startDeck(d: ArenaDeck) {
    setDeck(d);
    setPlayCount((n) => n + 1);
    setSessionPicks([]);
    setScreen("gauntlet");
  }

  function backToSelect() {
    setScreen("select");
    setDeck(null);
  }

  return (
    <div className="arena">
      <p className="arena-consent">
        Anonymous picks are stored to improve rankings. No accounts.{" "}
        <a href="/legal/privacy">Privacy</a>.
      </p>

      {screen === "select" && <DeckSelect decks={decks} onSelect={startDeck} />}

      {screen === "gauntlet" && deck && (
        <Gauntlet
          key={`${deck.slug}-${playCount}`}
          deck={deck}
          userRef={userRef}
          onDone={(picks) => {
            setSessionPicks(picks);
            setScreen("reveal");
          }}
        />
      )}

      {screen === "reveal" && deck && (
        <RevealScreen
          deck={deck}
          userRef={userRef}
          sessionPicks={sessionPicks}
          onReplay={backToSelect}
        />
      )}
    </div>
  );
}
