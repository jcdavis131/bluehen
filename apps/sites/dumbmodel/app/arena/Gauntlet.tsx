"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ArenaDeck, ArenaItem } from "./decks";
import { LayerStackViz } from "./LayerStackViz";
import { PredictBadge } from "./PredictBadge";
import { ShapleyPanel } from "./ShapleyPanel";
import { ROUNDS, buildPlan, hashSeed, pairForRound } from "./pairing";

const EXPLAIN_MS = 1500;

type PriorPick = { round: number; id: string; text: string };

type LayerStack = {
  personal: number;
  query: number;
  boosts: number;
  lit: string[];
};

type RoundResponse = {
  predictedId: string;
  confidence: number;
  scores: Record<string, number>;
  personalized: boolean;
  layerStack: LayerStack;
  shapley: {
    factors: Record<string, number>;
    picks: { round: number | null; id: string; phi: number }[];
  };
  note: string | null;
  correct?: boolean;
  layerStackAfter?: LayerStack;
};

type Phase = "loading" | "predict" | "pick" | "explain";

/** Shapley Gauntlet (Spec 0032): predict → pick → explain × 8 rounds. */
export function Gauntlet({
  deck,
  userRef,
  onDone,
}: {
  deck: ArenaDeck;
  userRef: string;
  onDone: (priorPicks: PriorPick[]) => void;
}) {
  const [round, setRound] = useState(1);
  const [lastWinner, setLastWinner] = useState<ArenaItem | null>(null);
  const [priorPicks, setPriorPicks] = useState<PriorPick[]>([]);
  const [phase, setPhase] = useState<Phase>("loading");
  const [roundData, setRoundData] = useState<RoundResponse | null>(null);
  const [resolveData, setResolveData] = useState<RoundResponse | null>(null);
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipExplainRef = useRef(false);

  const seed = useMemo(
    () => hashSeed(`${userRef || "anon"}:${deck.slug}:${Date.now()}`),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deck.slug],
  );
  const plan = useMemo(() => buildPlan(deck.items, seed), [deck.items, seed]);
  const [left, right] = pairForRound(plan, round, lastWinner);

  const loadPredict = useCallback(async () => {
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
      setTimeout(() => setPhase("pick"), 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("pick");
    }
  }, [deck.name, deck.slug, left, priorPicks, right, round, userRef]);

  useEffect(() => {
    void loadPredict();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [loadPredict]);

  function advanceAfterExplain(nextPrior: PriorPick[], winner: ArenaItem) {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setLastWinner(winner);
      setChosenId(null);
      setResolveData(null);
      setPriorPicks(nextPrior);
      skipExplainRef.current = false;
      if (round >= ROUNDS) {
        onDone(nextPrior);
      } else {
        setRound((r) => r + 1);
      }
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
      setResolveData(data);
      setPhase("explain");
      advanceAfterExplain(nextPrior, winner);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("pick");
      setChosenId(null);
    }
  }

  function skipExplain() {
    if (!chosenId) return;
    skipExplainRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    const winner = chosenId === left.id ? left : right;
    const nextPrior: PriorPick[] = [
      ...priorPicks,
      { round, id: winner.id, text: winner.text },
    ];
    setLastWinner(winner);
    setChosenId(null);
    setResolveData(null);
    setPriorPicks(nextPrior);
    if (round >= ROUNDS) {
      onDone(nextPrior);
    } else {
      setRound((r) => r + 1);
    }
  }

  const predictedItem =
    roundData?.predictedId === left.id ? left : roundData?.predictedId === right.id ? right : null;

  return (
    <div>
      <div className="arena-round-head">
        <span className="arena-round-counter">
          Round {round} / {ROUNDS}
        </span>
        {phase === "explain" && (
          <button type="button" className="arena-tts-toggle" onClick={skipExplain}>
            Skip →
          </button>
        )}
      </div>

      {phase === "loading" && !roundData && (
        <p className="bh-muted">Model is guessing…</p>
      )}

      {roundData && predictedItem && (phase === "predict" || phase === "pick") && (
        <PredictBadge
          predictedText={predictedItem.text}
          confidence={roundData.confidence}
          note={roundData.note}
        />
      )}

      {roundData && (phase === "predict" || phase === "pick") && (
        <LayerStackViz stack={roundData.layerStack} />
      )}

      {(phase === "pick" || phase === "predict") && (
        <div className="arena-pair" key={`${round}-${left.id}-${right.id}`}>
          <button
            type="button"
            className={`arena-pick-btn${chosenId === left.id ? " is-chosen" : ""}`}
            disabled={phase !== "pick"}
            onClick={() => pick(left)}
          >
            {left.text}
          </button>
          <div className="arena-vs">your pick</div>
          <button
            type="button"
            className={`arena-pick-btn${chosenId === right.id ? " is-chosen" : ""}`}
            disabled={phase !== "pick"}
            onClick={() => pick(right)}
          >
            {right.text}
          </button>
        </div>
      )}

      {phase === "explain" && resolveData && roundData && (
        <div className="arena-explain">
          <p className="arena-explain-verdict">
            {resolveData.correct
              ? "You matched the model."
              : "You surprised the model."}
          </p>
          <ShapleyPanel
            factors={roundData.shapley.factors}
            picks={roundData.shapley.picks}
          />
          {resolveData.layerStackAfter && (
            <LayerStackViz stack={resolveData.layerStackAfter} />
          )}
        </div>
      )}

      {error && (
        <div className="bh-alert bh-alert--error" style={{ marginTop: 16 }}>
          {error}
        </div>
      )}
    </div>
  );
}
