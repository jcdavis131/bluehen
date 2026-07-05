"use client";

import { useEffect, useRef, useState } from "react";
import { commentaryLine, type BeatResult } from "./commentary";

const USER_REF_KEY = "beat-user-ref";
const SCORE_KEY = "beat-score";
const STREAK_KEY = "beat-streak";
const ATTEMPTS_KEY = "beat-attempts";

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
    // without the score/streak surviving a refresh this tab session.
    return crypto.randomUUID().slice(0, 12);
  }
}

function readSessionInt(key: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.sessionStorage.getItem(key);
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function writeSessionInt(key: string, value: number) {
  try {
    window.sessionStorage.setItem(key, String(value));
  } catch {
    // sessionStorage unavailable — score just won't survive a refresh
  }
}

type Anchor = { anchorId: string; title: string; snippet: string };

type AttemptResponse = {
  result: BeatResult;
  anchorRank: number | null;
  topHit: { title: string; id: string } | null;
  score: number;
};

type Screen = "intro" | "round" | "error-anchor";

function rankSentence(anchorRank: number | null, result: BeatResult): string {
  if (anchorRank === null) {
    return "the baseline never found your anchor in its top 5 — POISONED.";
  }
  if (result === "wounded") {
    return `the baseline ranked your anchor #${anchorRank} — wounded, not dead.`;
  }
  return `the baseline ranked your anchor #${anchorRank} — it held. resisted.`;
}

/** Beat the Baseline orchestrator (Spec 0031 §2 GAME-001): intro -> round
 * (fetch a real anchor, fire a poison query) -> honest reveal -> next
 * anchor. Session score/streak persist in sessionStorage, same
 * anonymous-userRef convention as the Arena (Spec 0029). */
export function BeatClient() {
  const [userRef, setUserRef] = useState("");
  const [screen, setScreen] = useState<Screen>("intro");
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [query, setQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [anchorLoading, setAnchorLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<AttemptResponse | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [line, setLine] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setUserRef(readOrCreateUserRef());
    setScore(readSessionInt(SCORE_KEY));
    setStreak(readSessionInt(STREAK_KEY));
    setAttempts(readSessionInt(ATTEMPTS_KEY));
  }, []);

  useEffect(() => {
    if (screen === "round" && !attempt) inputRef.current?.focus();
  }, [screen, attempt]);

  async function fetchAnchor() {
    setAnchorLoading(true);
    setError(null);
    setAttempt(null);
    setLine(null);
    setQuery("");
    try {
      const res = await fetch("/api/beat/anchor");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `anchor fetch failed (${res.status})`);
      setAnchor(data as Anchor);
      setScreen("round");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setScreen("error-anchor");
    } finally {
      setAnchorLoading(false);
    }
  }

  async function fire() {
    if (submitting || !anchor) return;
    const trimmed = query.trim();
    if (!trimmed) {
      setError("type a query first — the baseline can't be poisoned by silence");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/beat/attempt", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userRef,
          anchorId: anchor.anchorId,
          anchorTitle: anchor.title,
          query: trimmed,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `attempt failed (${res.status})`);
      const a = data as AttemptResponse;
      setAttempt(a);

      const nextScore = score + a.score;
      const nextStreak = a.result === "POISONED" ? streak + 1 : 0;
      const nextAttempts = attempts + 1;
      setScore(nextScore);
      setStreak(nextStreak);
      setAttempts(nextAttempts);
      writeSessionInt(SCORE_KEY, nextScore);
      writeSessionInt(STREAK_KEY, nextStreak);
      writeSessionInt(ATTEMPTS_KEY, nextAttempts);

      setLine(
        commentaryLine({
          result: a.result,
          query: trimmed,
          anchorId: anchor.anchorId,
          topHitTitle: a.topHit?.title ?? null,
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (screen === "intro") {
    return (
      <div className="beat">
        <ol className="beat-intro-steps">
          <li>You get an anchor: a real chunk from the research index.</li>
          <li>Write a query a human would agree means it — but the baseline shouldn&rsquo;t find it.</li>
          <li>Fire. The rank is live, honest, and yours to poison.</li>
        </ol>
        <p className="beat-consent">
          Your queries are stored anonymously (a random session id, no account)
          to improve the platform. Skip the game if that&rsquo;s not cool.
        </p>
        <button type="button" className="bh-btn bh-btn--primary" onClick={() => void fetchAnchor()}>
          {anchorLoading ? "Loading anchor…" : "Start"}
        </button>
      </div>
    );
  }

  if (screen === "error-anchor") {
    return (
      <div className="beat">
        <div className="bh-alert bh-alert--error">{error}</div>
        <button
          type="button"
          className="bh-btn bh-btn--ghost"
          style={{ marginTop: 16 }}
          onClick={() => void fetchAnchor()}
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="beat">
      <div className="beat-header">
        <span>Score {score}</span>
        <span>Streak {streak}</span>
        <span>Played {attempts}</span>
      </div>

      {anchor && (
        <div className="beat-anchor-card">
          <h3 className="beat-anchor-title">{anchor.title}</h3>
          <p className="beat-anchor-snippet">{anchor.snippet}</p>
        </div>
      )}

      {!attempt && (
        <div className="beat-query-form">
          <textarea
            ref={inputRef}
            className="beat-query-input"
            placeholder="Write a poison query — same meaning, different words…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={submitting}
            rows={3}
          />
          <button
            type="button"
            className="bh-btn bh-btn--primary beat-fire-btn"
            disabled={submitting}
            onClick={() => void fire()}
          >
            {submitting ? "Firing…" : "Fire"}
          </button>
          {error && <div className="bh-alert bh-alert--error">{error}</div>}
        </div>
      )}

      {attempt && (
        <div className="beat-result-card">
          <p className="beat-result-headline">{rankSentence(attempt.anchorRank, attempt.result)}</p>
          {attempt.topHit && (
            <p className="beat-outranked">
              What outranked it: <strong>{attempt.topHit.title}</strong>
            </p>
          )}
          <p className="beat-score-delta">+{attempt.score} points</p>
          {line && <p className="beat-commentary">{line}</p>}
          <button type="button" className="bh-btn bh-btn--primary" onClick={() => void fetchAnchor()}>
            Next anchor
          </button>
        </div>
      )}
    </div>
  );
}
