"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { pickLabVoiceLine } from "./lines";

const USER_REF_KEY = "verdict-user-ref";
const JUDGED_KEY = "verdict-cases-judged";
const STREAK_KEY = "verdict-streak";
const REVEAL_MS = 2200;

// The web UI always sends player: "human" (Spec 0031 §7). Scripted/agent
// callers hitting this same public BFF (/api/verdict) self-declare
// player: "agent" in their own request body — never mixed silently, so
// downstream MTNN training can weight human data above agent data.
const PLAYER = "human" as const;

function readOrCreate(key: string, make: () => string): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.sessionStorage.getItem(key);
    if (existing) return existing;
    const fresh = make();
    window.sessionStorage.setItem(key, fresh);
    return fresh;
  } catch {
    return make();
  }
}

function readCount(key: string): number {
  if (typeof window === "undefined") return 0;
  try {
    return Number(window.sessionStorage.getItem(key) ?? "0") || 0;
  } catch {
    return 0;
  }
}

function writeCount(key: string, value: number) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, String(value));
  } catch {
    // sessionStorage unavailable (private mode etc.) — counters just
    // won't persist across reloads; the round itself still works.
  }
}

type Exhibit = { id: string; text: string };
type VerdictCase = { caseId: string; query: string; a: Exhibit; b: Exhibit };
type Phase = "loading" | "judging" | "revealing" | "error";

export function VerdictClient() {
  const [userRef, setUserRef] = useState("");
  const [phase, setPhase] = useState<Phase>("loading");
  const [current, setCurrent] = useState<VerdictCase | null>(null);
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [engineAgreed, setEngineAgreed] = useState<boolean | null>(null);
  const [casesJudged, setCasesJudged] = useState(0);
  const [streak, setStreak] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setUserRef(readOrCreate(USER_REF_KEY, () => crypto.randomUUID().slice(0, 12)));
    setCasesJudged(readCount(JUDGED_KEY));
    setStreak(readCount(STREAK_KEY));
  }, []);

  const loadCase = useCallback(async () => {
    setPhase("loading");
    setError(null);
    setChosenId(null);
    setEngineAgreed(null);
    try {
      const res = await fetch("/api/verdict/case");
      const data = (await res.json()) as VerdictCase & { error?: string };
      if (!res.ok) throw new Error(data.error ?? `case failed (${res.status})`);
      setCurrent(data);
      setPhase("judging");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("error");
    }
  }, []);

  useEffect(() => {
    void loadCase();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [loadCase]);

  async function judge(winner: Exhibit, loser: Exhibit) {
    if (phase !== "judging" || !current) return;
    setChosenId(winner.id);
    setPhase("revealing");
    setError(null);

    try {
      const res = await fetch("/api/verdict", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userRef,
          player: PLAYER,
          caseId: current.caseId,
          query: current.query,
          winnerId: winner.id,
          loserId: loser.id,
        }),
      });
      const data = (await res.json()) as { recorded: boolean; engineAgreed: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? `verdict failed (${res.status})`);

      const nextJudged = casesJudged + 1;
      const nextStreak = data.engineAgreed ? streak + 1 : 0;
      setCasesJudged(nextJudged);
      setStreak(nextStreak);
      writeCount(JUDGED_KEY, nextJudged);
      writeCount(STREAK_KEY, nextStreak);
      setEngineAgreed(data.engineAgreed);

      timerRef.current = setTimeout(() => {
        void loadCase();
      }, REVEAL_MS);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("judging");
      setChosenId(null);
    }
  }

  function nextNow() {
    if (timerRef.current) clearTimeout(timerRef.current);
    void loadCase();
  }

  return (
    <div className="verdict">
      <p className="verdict-consent">
        Anonymous verdicts are stored to improve retrieval ranking. No accounts.{" "}
        <a href="/legal/privacy">Privacy</a>.
      </p>

      <div className="verdict-stats">
        <div className="verdict-stat">
          <span className="verdict-stat-value">{casesJudged}</span>
          <span className="verdict-stat-label">Cases judged</span>
        </div>
        <div className="verdict-stat">
          <span className="verdict-stat-value">{streak}</span>
          <span className="verdict-stat-label">Agreement streak</span>
        </div>
      </div>

      {phase === "loading" && !current && <p className="bh-muted">Docketing the next case…</p>}

      {phase === "error" && (
        <div className="bh-alert bh-alert--error">
          {error}
          <div className="verdict-next-row">
            <button type="button" className="bh-btn bh-btn--ghost" onClick={nextNow}>
              Try again
            </button>
          </div>
        </div>
      )}

      {current && (phase === "judging" || phase === "revealing") && (
        <div className="verdict-docket" key={current.caseId}>
          <span className="verdict-docket-label">Order in the lab. Exhibit A or Exhibit B?</span>
          <p className="verdict-query">{current.query}</p>
        </div>
      )}

      {current && (phase === "judging" || phase === "revealing") && (
        <div className="verdict-pair">
          <button
            type="button"
            className={`verdict-exhibit${chosenId === current.a.id ? " is-chosen" : ""}`}
            disabled={phase !== "judging"}
            onClick={() => judge(current.a, current.b)}
          >
            <span className="verdict-exhibit-label">Exhibit A</span>
            <span className="verdict-exhibit-text">{current.a.text}</span>
          </button>
          <button
            type="button"
            className={`verdict-exhibit${chosenId === current.b.id ? " is-chosen" : ""}`}
            disabled={phase !== "judging"}
            onClick={() => judge(current.b, current.a)}
          >
            <span className="verdict-exhibit-label">Exhibit B</span>
            <span className="verdict-exhibit-text">{current.b.text}</span>
          </button>
        </div>
      )}

      {phase === "revealing" && engineAgreed !== null && (
        <div className="verdict-reveal">
          <p className="verdict-reveal-headline">
            {engineAgreed
              ? "The engine agreed with you."
              : "You overruled the engine — noted for the record."}
          </p>
          <p className="verdict-reveal-line">{pickLabVoiceLine(engineAgreed, casesJudged)}</p>
          {!engineAgreed && (
            <p className="verdict-reveal-caption">
              Disagreements like this are the most valuable signal in the docket — they show
              exactly where the current ranking should move.
            </p>
          )}
          <div className="verdict-next-row">
            <button type="button" className="bh-btn bh-btn--ghost" onClick={nextNow}>
              Next case →
            </button>
          </div>
        </div>
      )}

      {error && phase === "judging" && current && (
        <div className="bh-alert bh-alert--error" style={{ marginTop: "var(--bh-space-3)" }}>
          {error}
        </div>
      )}
    </div>
  );
}
