"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ArenaDeck, ArenaItem } from "./decks";
import { LayerStackViz } from "./LayerStackViz";
import { PredictBadge } from "./PredictBadge";
import { RoundProgress } from "./RoundProgress";
import { ShapleyPanel } from "./ShapleyPanel";
import { ROUNDS, buildPlan, hashSeed, pairForRound } from "./pairing";
import type { PriorPick, RoundResponse, SessionStats } from "./types";

const EXPLAIN_MS = 1500;
const PREDICT_MS = 850;

type Phase = "loading" | "predict" | "pick" | "explain";

/** Shapley Gauntlet (Spec 0032): predict → pick → explain × 8 rounds. */
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
  const [matchCount, setMatchCount] = useState(0);
  const [phase, setPhase] = useState<Phase>("loading");
  const [roundData, setRoundData] = useState<RoundResponse | null>(null);
  const [resolveData, setResolveData] = useState<RoundResponse | null>(null);
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const predictTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipExplainRef = useRef(false);

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

  function finishRound(nextPrior: PriorPick[], winner: ArenaItem, matched: boolean) {
    setLastWinner(winner);
    setChosenId(null);
    setResolveData(null);
    setPriorPicks(nextPrior);
    setMatchCount((m) => m + (matched ? 1 : 0));
    skipExplainRef.current = false;
    if (round >= ROUNDS) {
      onDone({
        matches: matchCount + (matched ? 1 : 0),
        total: ROUNDS,
        picks: nextPrior,
      });
    } else {
      setRound((r) => r + 1);
    }
  }

  function advanceAfterExplain(nextPrior: PriorPick[], winner: ArenaItem, matched: boolean) {
    clearTimers();
    timerRef.current = setTimeout(() => {
      finishRound(nextPrior, winner, matched);
    }, skipExplainRef.current ? 0 : EXPLAIN_MS);
  }

  async function pick(winner: ArenaItem) {
    if (phase !== "pick" && phase !== "predict") return;
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
      setResolveData(data);
      setPhase("explain");
      advanceAfterExplain(nextPrior, winner, matched);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("pick");
      setChosenId(null);
    }
  }

  function skipExplain() {
    if (!chosenId || !resolveData) return;
    skipExplainRef.current = true;
    clearTimers();
    const winner = chosenId === left.id ? left : right;
    const nextPrior: PriorPick[] = [
      ...priorPicks,
      { round, id: winner.id, text: winner.text },
    ];
    finishRound(nextPrior, winner, Boolean(resolveData.correct));
  }

  const predictedId = roundData?.predictedId;
  const predictedItem =
    predictedId === left.id ? left : predictedId === right.id ? right : null;

  return (
    <div>
      <div className="arena-round-head">
        <div>
          <span className="arena-deck-name">{deck.name}</span>
          <span className="arena-round-counter">
            Round {round} / {ROUNDS}
          </span>
        </div>
        {phase === "explain" && (
          <button type="button" className="arena-tts-toggle" onClick={skipExplain}>
            Skip →
          </button>
        )}
      </div>

      <RoundProgress round={round} />

      {phase === "loading" && !roundData && (
        <p className="bh-muted arena-loading">Model is guessing…</p>
      )}

      {roundData && predictedItem && (phase === "predict" || phase === "pick") && (
        <PredictBadge
          predictedText={predictedItem.text}
          confidence={roundData.confidence}
          note={roundData.note}
        />
      )}

      {roundData && (phase === "predict" || phase === "pick") && (
        <LayerStackViz stack={roundData.layerStack} title="Rank engine weights" />
      )}

      {(phase === "pick" || phase === "predict") && (
        <div className="arena-pair" key={`${round}-${left.id}-${right.id}`}>
          <button
            type="button"
            className={[
              "arena-pick-btn",
              chosenId === left.id ? "is-chosen" : "",
              predictedId === left.id ? "is-predicted" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            disabled={phase !== "pick"}
            onClick={() => pick(left)}
          >
            {left.text}
            {roundData && (
              <span className="arena-pick-score">
                score {roundData.scores[left.id]?.toFixed(2) ?? "—"}
              </span>
            )}
          </button>
          <div className="arena-vs">your pick</div>
          <button
            type="button"
            className={[
              "arena-pick-btn",
              chosenId === right.id ? "is-chosen" : "",
              predictedId === right.id ? "is-predicted" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            disabled={phase !== "pick"}
            onClick={() => pick(right)}
          >
            {right.text}
            {roundData && (
              <span className="arena-pick-score">
                score {roundData.scores[right.id]?.toFixed(2) ?? "—"}
              </span>
            )}
          </button>
        </div>
      )}

      {phase === "explain" && resolveData && roundData && (
        <div className="arena-explain">
          <p
            className={`arena-explain-verdict${resolveData.correct ? " is-match" : " is-surprise"}`}
          >
            {resolveData.correct
              ? "You matched the model."
              : "You surprised the model."}
          </p>
          <ShapleyPanel
            factors={roundData.shapley.factors}
            picks={roundData.shapley.picks}
          />
          {resolveData.layerStackBefore && (
            <LayerStackViz stack={resolveData.layerStackBefore} title="Before your pick" />
          )}
          {resolveData.layerStackAfter && (
            <LayerStackViz stack={resolveData.layerStackAfter} title="After your pick" />
          )}
        </div>
      )}

      {error && (
        <div className="arena-error-row">
          <div className="bh-alert bh-alert--error">{error}</div>
          <button type="button" className="bh-btn bh-btn--ghost" onClick={() => void loadPredict()}>
            Retry round
          </button>
        </div>
      )}
    </div>
  );
}
