"use client";

import { useCallback, useEffect, useState } from "react";
import "./leylines.css";

const USER_REF_KEY = "leylines-user-ref";
const MAX_HOPS = 6;

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

type PaperNode = { id: string; title: string };
type Candidate = { id: string; title: string; reason: string };
type HopResult = { a: string; b: string; score: number; matched: boolean };
type FinishResult = { pathScore: number; final: number; perHop: HopResult[] };

type Screen = "intro" | "playing" | "result";
type PathState = "open" | "reached" | "frayed";

async function postJson(url: string, body: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : `request failed (${res.status})`);
  return data;
}

/**
 * Leylines client orchestrator (Spec 0031 §2/§7, GAME-003): fetch a
 * far-apart start/goal pair, hop through semantic neighbors, score the
 * built path against the live model on arrival or on fray. The `player`
 * value sent with every /pick and /finish call is the literal string
 * "human" here (the hidden field below) — the research BFF also accepts
 * "agent" for Eve/synthorg calling these same routes directly, without a
 * browser, so provenance is never mixed silently downstream.
 */
export function LeylinesClient() {
  const [userRef, setUserRef] = useState("");
  const [screen, setScreen] = useState<Screen>("intro");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [start, setStart] = useState<PaperNode | null>(null);
  const [goal, setGoal] = useState<PaperNode | null>(null);
  const [path, setPath] = useState<PaperNode[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [pathState, setPathState] = useState<PathState>("open");
  const [result, setResult] = useState<FinishResult | null>(null);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    setUserRef(readOrCreateUserRef());
  }, []);

  const loadCandidates = useCallback(async (currentId: string, usedIds: string[]) => {
    setLoading(true);
    setError(null);
    try {
      const data = await postJson("/api/leylines/hops", { currentId, usedIds });
      setCandidates(Array.isArray(data.candidates) ? (data.candidates as Candidate[]) : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const startGame = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setPathState("open");
    try {
      const res = await fetch("/api/leylines/start", { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "couldn't start a run");
      const s = data.start as PaperNode;
      const g = data.goal as PaperNode;
      setStart(s);
      setGoal(g);
      setPath([s]);
      setScreen("playing");
      await loadCandidates(s.id, [s.id]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [loadCandidates]);

  const finishGame = useCallback(
    async (finalPath: PaperNode[]) => {
      setLoading(true);
      setError(null);
      try {
        const data = await postJson("/api/leylines/finish", {
          path: finalPath.map((n) => n.id),
          userRef,
          player: "human",
        });
        setResult(data as unknown as FinishResult);
        setScreen("result");
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    [userRef],
  );

  const pick = useCallback(
    async (candidate: Candidate) => {
      if (!goal || picking) return;
      const current = path[path.length - 1];
      setPicking(true);
      setError(null);
      try {
        await postJson("/api/leylines/pick", {
          userRef,
          player: "human",
          a: current.id,
          b: candidate.id,
          chosenOver: candidates.filter((c) => c.id !== candidate.id).map((c) => c.id),
          round: path.length,
        });
      } catch {
        // The hop still counts for the player even if telemetry hiccups.
      }

      const nextPath = [...path, { id: candidate.id, title: candidate.title }];
      setPath(nextPath);
      setCandidates([]);
      setPicking(false);

      const hopsTaken = nextPath.length - 1;
      if (candidate.id === goal.id) {
        setPathState("reached");
        await finishGame(nextPath);
        return;
      }
      if (hopsTaken >= MAX_HOPS) {
        setPathState("frayed");
        await finishGame(nextPath);
        return;
      }
      await loadCandidates(candidate.id, nextPath.map((n) => n.id));
    },
    [candidates, finishGame, goal, loadCandidates, path, picking, userRef],
  );

  const replay = useCallback(() => {
    setStart(null);
    setGoal(null);
    setPath([]);
    setCandidates([]);
    setResult(null);
    setPathState("open");
    setScreen("intro");
  }, []);

  return (
    <div className="leylines">
      {/* Hidden field: the browser always plays as "human". Agent players
          (Eve/synthorg, Spec 0031 §7) call these BFF routes directly with
          player: "agent" in the request body — there's no UI path to it,
          by design, since this markup is the human contract. */}
      <input type="hidden" name="player" value="human" readOnly />

      <p className="leylines-consent">
        Anonymous hops are stored to improve the citation graph. No accounts.{" "}
        <a href="https://bhenre.com/legal/privacy">Privacy</a>.
      </p>

      {screen === "intro" && (
        <div className="leylines-intro fleet-card">
          <p className="leylines-intro-lede">
            Two papers, plucked from opposite corners of the literature. Somewhere between them
            runs a thread of borrowed ideas — a method, a dataset, a lineage of citations. Find it
            in six hops or fewer.
          </p>
          <button
            type="button"
            className="bh-btn bh-btn--primary"
            onClick={startGame}
            disabled={loading}
          >
            {loading ? "Casting the line…" : "Find the path"}
          </button>
          {error && <p className="bh-alert bh-alert--error">{error}</p>}
        </div>
      )}

      {screen === "playing" && start && goal && (
        <div className="leylines-play">
          <Chain path={path} goal={goal} pathState={pathState} />

          {error && <p className="bh-alert bh-alert--error">{error}</p>}

          <div className="leylines-round-head">
            <span className="leylines-round-counter">
              Hop {path.length} of {MAX_HOPS + 1}
            </span>
          </div>

          {loading && !picking && <p className="leylines-loading">Reading the neighborhood…</p>}

          {!loading && candidates.length > 0 && (
            <div className="leylines-candidates">
              {candidates.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="leylines-candidate"
                  onClick={() => pick(c)}
                  disabled={picking}
                >
                  <span className="leylines-candidate-title">{c.title}</span>
                  <span className="leylines-candidate-reason">{c.reason}</span>
                </button>
              ))}
            </div>
          )}

          {!loading && candidates.length === 0 && !error && (
            <p className="leylines-loading">The trail runs quiet here — no new neighbors to try.</p>
          )}
        </div>
      )}

      {screen === "result" && start && goal && (
        <div className="leylines-result fleet-card">
          {pathState === "reached" ? (
            <h2 className="leylines-result-headline">The line held.</h2>
          ) : (
            <h2 className="leylines-result-headline">The path faded — try another route.</h2>
          )}
          <Chain path={path} goal={goal} pathState={pathState} />

          {result && (
            <>
              <div className="leylines-scores">
                <div className="bh-metric">
                  <span className="bh-metric__label">Path score · </span>
                  <span className="bh-metric__value">{result.pathScore.toFixed(3)}</span>
                </div>
                <div className="bh-metric">
                  <span className="bh-metric__label">Final (hop bonus) · </span>
                  <span className="bh-metric__value">{result.final.toFixed(3)}</span>
                </div>
              </div>

              <ol className="leylines-perhop">
                {result.perHop.map((h, i) => (
                  <li key={`${h.a}-${h.b}-${i}`}>
                    <span className="leylines-perhop-idx">Hop {i + 1}</span>
                    <span className="leylines-perhop-score">{h.score.toFixed(3)}</span>
                    {!h.matched && <span className="leylines-perhop-floor">floor</span>}
                  </li>
                ))}
              </ol>
            </>
          )}

          {error && <p className="bh-alert bh-alert--error">{error}</p>}

          <button type="button" className="bh-btn bh-btn--primary" onClick={replay}>
            Play again
          </button>
        </div>
      )}
    </div>
  );
}

function Chain({
  path,
  goal,
  pathState,
}: {
  path: PaperNode[];
  goal: PaperNode;
  pathState: PathState;
}) {
  // Once the last hop lands on the goal id, the goal IS the final path node
  // — render it in place rather than duplicating a second goal chip.
  const goalInPath = path.length > 0 && path[path.length - 1].id === goal.id;

  return (
    <div className={`leylines-chain${pathState === "frayed" ? " is-frayed" : ""}`}>
      {path.map((node, i) => {
        const isLast = i === path.length - 1;
        const isGoalNode = isLast && goalInPath;
        return (
          <span className="leylines-chain-item" key={node.id}>
            <span
              className={`leylines-node${i === 0 ? " is-start" : ""}${isGoalNode ? " is-goal is-reached" : ""}`}
              title={node.title}
            >
              {node.title}
            </span>
            {!isLast && <span className="leylines-connector" aria-hidden="true" />}
          </span>
        );
      })}
      {!goalInPath && (
        <>
          <span className="leylines-connector leylines-connector--open" aria-hidden="true" />
          <span className="leylines-node is-goal" title={goal.title}>
            {goal.title}
          </span>
        </>
      )}
    </div>
  );
}
