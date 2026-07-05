"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ArenaDeck, ArenaItem } from "./decks";
import { commentaryLine } from "./commentary";
import {
  readHostVoiceEnabled,
  speakHostLine,
  writeHostVoiceEnabled,
} from "./hostVoice";
import { PredictBadge } from "./PredictBadge";
import { RoundProgress } from "./RoundProgress";
import { ROUNDS, buildPlan, hashSeed, pairForRound } from "./pairing";
import type { PriorPick, RoundInsight, RoundResponse, SessionStats } from "./types";

const EXPLAIN_MS = 480;
const PREDICT_MS = 700;

type Phase = "loading" | "predict" | "pick" | "flash";

/** Blind-rank gauntlet: rapid this-or-that, host guess, tier list at the end. */
export function Gauntlet({
  deck,
  userRef,
  onDone,
}: {
  deck: ArenaDeck;
  userRef: string;
  onDone: (stats: SessionStats) => void;
}) {
  const [round, setRound] = useState(1);
  const [lastWinner, setLastWinner] = useState<ArenaItem | null>(null);
  const [priorPicks, setPriorPicks] = useState<PriorPick[]>([]);
  const [roundInsights, setRoundInsights] = useState<RoundInsight[]>([]);
  const [matchCount, setMatchCount] = useState(0);
  const [phase, setPhase] = useState<Phase>("loading");
  const [roundData, setRoundData] = useState<RoundResponse | null>(null);
  const [resolveData, setResolveData] = useState<RoundResponse | null>(null);
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [flashCopy, setFlashCopy] = useState<string | null>(null);
  const [commentary, setCommentary] = useState<string | null>(null);
  const [hostVoice, setHostVoice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const predictTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setHostVoice(readHostVoiceEnabled());
  }, []);

  const seed = useMemo(
    () => hashSeed(`${userRef || "anon"}:${deck.slug}:${Date.now()}`),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deck.slug],
  );
  const plan = useMemo(() => buildPlan(deck.items, seed), [deck.items, seed]);
  const [left, right] = pairForRound(plan, round, lastWinner);

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (predictTimerRef.current) clearTimeout(predictTimerRef.current);
  }, []);

  const loadPredict = useCallback(async () => {
    clearTimers();
    setPhase("loading");
    setRoundData(null);
    setResolveData(null);
    setFlashCopy(null);
    setCommentary(null);
    setError(null);
    try {
      const res = await fetch("/api/arena/round", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode: "predict",
          userRef,
          pair: [
            { id: left.id, text: left.text },
            { id: right.id, text: right.text },
          ],
          query: deck.name,
          priorPicks,
          deckSlug: deck.slug,
          round,
        }),
      });
      const data = (await res.json()) as RoundResponse & { error?: string };
      if (!res.ok) throw new Error(data.error ?? `predict failed (${res.status})`);
      setRoundData(data);
      setPhase("predict");
      predictTimerRef.current = setTimeout(() => setPhase("pick"), PREDICT_MS);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("pick");
    }
  }, [clearTimers, deck.name, deck.slug, left, priorPicks, right, round, userRef]);

  useEffect(() => {
    void loadPredict();
    return clearTimers;
  }, [loadPredict, clearTimers]);

  function finishRound(
    nextPrior: PriorPick[],
    nextInsights: RoundInsight[],
    winner: ArenaItem,
    matched: boolean,
  ) {
    setLastWinner(winner);
    setChosenId(null);
    setResolveData(null);
    setFlashCopy(null);
    setCommentary(null);
    setPriorPicks(nextPrior);
    setRoundInsights(nextInsights);
    setMatchCount((m) => m + (matched ? 1 : 0));
    if (round >= ROUNDS) {
      onDone({
        matches: matchCount + (matched ? 1 : 0),
        total: ROUNDS,
        picks: nextPrior,
        rounds: nextInsights,
      });
    } else {
      setRound((r) => r + 1);
    }
  }

  function advanceAfterFlash(
    nextPrior: PriorPick[],
    nextInsights: RoundInsight[],
    winner: ArenaItem,
    matched: boolean,
  ) {
    clearTimers();
    timerRef.current = setTimeout(() => {
      finishRound(nextPrior, nextInsights, winner, matched);
    }, EXPLAIN_MS);
  }

  async function pick(winner: ArenaItem) {
    if (phase !== "pick" && phase !== "predict") return;
    const loser = winner.id === left.id ? right : left;
    setChosenId(winner.id);
    setPhase("loading");
    setError(null);

    try {
      const res = await fetch("/api/arena/round", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode: "resolve",
          userRef,
          pair: [
            { id: left.id, text: left.text },
            { id: right.id, text: right.text },
          ],
          query: deck.name,
          priorPicks,
          chosenId: winner.id,
          deckSlug: deck.slug,
          round,
        }),
      });
      const data = (await res.json()) as RoundResponse & { error?: string };
      if (!res.ok) throw new Error(data.error ?? `resolve failed (${res.status})`);

      const nextPrior: PriorPick[] = [
        ...priorPicks,
        { round, id: winner.id, text: winner.text },
      ];
      const matched = Boolean(data.correct);
      const line = commentaryLine({
        round,
        winnerId: winner.id,
        winnerText: winner.text,
        loserId: loser.id,
        loserText: loser.text,
      });
      const insight: RoundInsight = {
        round,
        winnerText: winner.text,
        correct: matched,
        commentary: line,
        shapley: roundData?.shapley ?? data.shapley,
        layerStackBefore: data.layerStackBefore,
        layerStackAfter: data.layerStackAfter,
      };
      const nextInsights = [...roundInsights, insight];

      setResolveData(data);
      setFlashCopy(matched ? "Called it." : "Plot twist.");
      setCommentary(line);
      speakHostLine(line);
      setPhase("flash");
      advanceAfterFlash(nextPrior, nextInsights, winner, matched);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("pick");
      setChosenId(null);
    }
  }

  function toggleHostVoice() {
    const next = !hostVoice;
    setHostVoice(next);
    writeHostVoiceEnabled(next);
    if (!next && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  const predictedId = roundData?.predictedId;
  const predictedItem =
    predictedId === left.id ? left : predictedId === right.id ? right : null;

  const showPair = phase === "pick" || phase === "predict";

  return (
    <div className="arena-blind-run">
      <header className="arena-blind-head">
        <div className="arena-blind-head-row">
          <span className="arena-blind-category">{deck.name}</span>
          <button
            type="button"
            className={`arena-host-voice-toggle${hostVoice ? " is-on" : ""}`}
            onClick={toggleHostVoice}
            aria-pressed={hostVoice}
          >
            {hostVoice ? "Host voice on" : "Host voice off"}
          </button>
        </div>
        <RoundProgress round={round} />
      </header>

      {phase === "loading" && !roundData && (
        <div className="arena-blind-skeleton" aria-live="polite">
          <div className="arena-blind-skeleton-card" />
          <div className="arena-blind-skeleton-card" />
        </div>
      )}

      {roundData && predictedItem && (phase === "predict" || phase === "pick") && (
        <PredictBadge
          predictedText={predictedItem.text}
          confidence={roundData.confidence}
          note={roundData.note}
          showMeter={phase === "pick"}
        />
      )}

      {showPair && (
        <>
          <p className="arena-blind-prompt" aria-live="polite">
            Pick one
          </p>
          <div className="arena-blind-pair" key={`${round}-${left.id}-${right.id}`}>
            <button
              type="button"
              className={[
                "arena-blind-card",
                chosenId === left.id ? "is-chosen" : "",
                predictedId === left.id ? "is-guessed" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              disabled={phase !== "pick"}
              onClick={() => pick(left)}
            >
              <span className="arena-blind-slot">A</span>
              <span className="arena-blind-card-text">{left.text}</span>
            </button>

            <div className="arena-blind-or" aria-hidden>
              or
            </div>

            <button
              type="button"
              className={[
                "arena-blind-card",
                chosenId === right.id ? "is-chosen" : "",
                predictedId === right.id ? "is-guessed" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              disabled={phase !== "pick"}
              onClick={() => pick(right)}
            >
              <span className="arena-blind-slot">B</span>
              <span className="arena-blind-card-text">{right.text}</span>
            </button>
          </div>
        </>
      )}

      {phase === "flash" && flashCopy && (
        <div className="arena-blind-flash-wrap">
          <p
            className={`arena-blind-flash${resolveData?.correct ? " is-match" : " is-twist"}`}
            aria-live="assertive"
          >
            {flashCopy}
          </p>
          {commentary && <p className="arena-commentary">{commentary}</p>}
        </div>
      )}

      {error && (
        <div className="arena-error-row">
          <div className="bh-alert bh-alert--error">{error}</div>
          <button type="button" className="bh-btn bh-btn--ghost" onClick={() => void loadPredict()}>
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
