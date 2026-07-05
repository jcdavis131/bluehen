"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ArenaDeck, ArenaItem } from "./decks";
import { ROUNDS, buildPlan, hashSeed, pairForRound } from "./pairing";
import { commentaryLine } from "./commentary";

const ADVANCE_DELAY_MS = 550;

function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 1.05;
  window.speechSynthesis.speak(utter);
}

/** The Gauntlet (Spec 0029 §1.2): 12 rounds of this-or-that. Each pick
 * POSTs to /api/arena/pick (awaited — pacing tolerates the round trip)
 * and triggers a deterministic Commentator line, optionally spoken via
 * browser-native TTS. */
export function Gauntlet({
  deck,
  userRef,
  onDone,
}: {
  deck: ArenaDeck;
  userRef: string;
  onDone: () => void;
}) {
  const [ttsSupported, setTtsSupported] = useState(false);
  const [audioOn, setAudioOn] = useState(false);
  const [round, setRound] = useState(1);
  const [lastWinner, setLastWinner] = useState<ArenaItem | null>(null);
  const [line, setLine] = useState<string | null>(null);
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const seed = useMemo(
    () => hashSeed(`${userRef || "anon"}:${deck.slug}:${Date.now()}`),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deck.slug],
  );
  const plan = useMemo(() => buildPlan(deck.items, seed), [deck.items, seed]);

  useEffect(() => {
    setTtsSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const [left, right] = pairForRound(plan, round, lastWinner);

  async function pick(winner: ArenaItem, loser: ArenaItem) {
    if (submitting) return;
    setSubmitting(true);
    setChosenId(winner.id);
    setError(null);

    try {
      const res = await fetch("/api/arena/pick", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userRef,
          deckSlug: deck.slug,
          itemId: winner.id,
          itemText: winner.text,
          round,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `pick failed (${res.status})`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }

    const nextLine = commentaryLine({
      round,
      winnerId: winner.id,
      winnerText: winner.text,
      loserId: loser.id,
      loserText: loser.text,
    });
    setLine(nextLine);
    if (audioOn) speak(nextLine);

    timerRef.current = setTimeout(() => {
      setLastWinner(winner);
      setChosenId(null);
      setSubmitting(false);
      if (round >= ROUNDS) {
        onDone();
      } else {
        setRound((r) => r + 1);
      }
    }, ADVANCE_DELAY_MS);
  }

  return (
    <div>
      <div className="arena-round-head">
        <span className="arena-round-counter">
          Round {round} / {ROUNDS}
        </span>
        {ttsSupported && (
          <button
            type="button"
            className="arena-tts-toggle"
            aria-pressed={audioOn}
            onClick={() => setAudioOn((v) => !v)}
          >
            {audioOn ? "🔊 Commentator: on" : "🔇 Commentator: off"}
          </button>
        )}
      </div>

      <div className="arena-pair" key={`${round}-${left.id}-${right.id}`}>
        <button
          type="button"
          className={`arena-pick-btn${chosenId === left.id ? " is-chosen" : ""}`}
          disabled={submitting}
          onClick={() => pick(left, right)}
        >
          {left.text}
        </button>
        <div className="arena-vs">or</div>
        <button
          type="button"
          className={`arena-pick-btn${chosenId === right.id ? " is-chosen" : ""}`}
          disabled={submitting}
          onClick={() => pick(right, left)}
        >
          {right.text}
        </button>
      </div>

      {line && <p className="arena-commentary">{line}</p>}
      {error && (
        <div className="bh-alert bh-alert--error" style={{ marginTop: 16 }}>
          {error}
        </div>
      )}
    </div>
  );
}
