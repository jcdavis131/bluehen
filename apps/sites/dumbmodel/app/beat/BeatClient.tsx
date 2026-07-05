"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { commentaryLine, type BeatResult } from "./commentary";

const USER_REF_KEY = "beat-user-ref";
const SCORE_KEY = "beat-score";
const STREAK_KEY = "beat-streak";
const ATTEMPTS_KEY = "beat-attempts";
const COACH_KEY = "beat-coach-seen";
const MAX_QUERY_CHARS = 200;

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
    /* sessionStorage unavailable */
  }
}

function readCoachSeen(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(COACH_KEY) === "1";
  } catch {
    return false;
  }
}

function writeCoachSeen() {
  try {
    window.localStorage.setItem(COACH_KEY, "1");
  } catch {
    /* private mode */
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
    return "POISONED — baseline never found your anchor in the top 5.";
  }
  if (result === "wounded") {
    return `Wounded — anchor landed #${anchorRank}, not dead yet.`;
  }
  return `Resisted — anchor held at #${anchorRank}.`;
}

function resultClass(result: BeatResult): string {
  if (result === "POISONED") return "is-poisoned";
  if (result === "wounded") return "is-wounded";
  return "is-resisted";
}

/** Beat the Baseline — dark-shell parity with Blind Rank (Spec 0031 GAME-001). */
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
  const [shareSupported, setShareSupported] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showCoach, setShowCoach] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setUserRef(readOrCreateUserRef());
    setScore(readSessionInt(SCORE_KEY));
    setStreak(readSessionInt(STREAK_KEY));
    setAttempts(readSessionInt(ATTEMPTS_KEY));
    setShowCoach(!readCoachSeen());
    setShareSupported(typeof navigator !== "undefined" && "share" in navigator);
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
    setCopied(false);
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

  function startGame() {
    writeCoachSeen();
    setShowCoach(false);
    void fetchAnchor();
  }

  async function fire() {
    if (submitting || !anchor) return;
    const trimmed = query.trim();
    if (!trimmed) {
      setError("Type a query first — the baseline can't be poisoned by silence.");
      return;
    }
    if (trimmed.length > MAX_QUERY_CHARS) {
      setError(`Keep it under ${MAX_QUERY_CHARS} characters.`);
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

  async function shareResult() {
    if (!attempt || !anchor) return;
    const text = `Beat the Baseline: ${rankSentence(attempt.anchorRank, attempt.result)} Query: "${query.trim()}". Score ${score + attempt.score}.`;
    const url = typeof window !== "undefined" ? `${window.location.origin}/beat` : "";
    if (shareSupported) {
      try {
        await navigator.share({ title: "Beat the Baseline", text, url });
      } catch {
        /* cancelled */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy — grab the link from the address bar.");
    }
  }

  if (screen === "intro") {
    return (
      <div className="arena-blind-run beat-run">
        <p className="beat-kicker">Adversarial query game</p>
        {showCoach && (
          <ol className="beat-intro-steps">
            <li>You get an anchor — a real chunk from the research index.</li>
            <li>Write a query a human would agree means it — but the baseline shouldn&apos;t find it.</li>
            <li>Fire. The rank is live, honest, and yours to poison.</li>
          </ol>
        )}
        <p className="beat-consent">
          Queries stored anonymously (session id, no account) to improve the platform.
        </p>
        <button type="button" className="beat-primary-btn" onClick={startGame}>
          {anchorLoading ? "Loading anchor…" : "Start"}
        </button>
      </div>
    );
  }

  if (screen === "error-anchor") {
    return (
      <div className="arena-blind-run beat-run">
        <div className="beat-error">{error}</div>
        <button type="button" className="beat-ghost-btn" onClick={() => void fetchAnchor()}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="arena-blind-run beat-run">
      <header className="beat-header">
        <span>Score {score}</span>
        <span>Streak {streak}</span>
        <span>Played {attempts}</span>
      </header>

      {anchorLoading && (
        <div className="arena-blind-skeleton" aria-live="polite">
          <div className="arena-blind-skeleton-card" />
        </div>
      )}

      {anchor && !anchorLoading && (
        <div className="beat-anchor-card">
          <span className="beat-anchor-label">Your anchor</span>
          <h3 className="beat-anchor-title">{anchor.title}</h3>
          <p className="beat-anchor-snippet">{anchor.snippet}</p>
        </div>
      )}

      {!attempt && anchor && (
        <div className="beat-query-form">
          <p className="arena-blind-prompt beat-prompt">Poison it</p>
          <textarea
            ref={inputRef}
            className="beat-query-input"
            placeholder="Same meaning, different words — make the baseline miss…"
            value={query}
            onChange={(e) => setQuery(e.target.value.slice(0, MAX_QUERY_CHARS))}
            disabled={submitting}
            rows={3}
            maxLength={MAX_QUERY_CHARS}
          />
          <div className="beat-query-meta">
            <span className="beat-char-count">
              {query.length}/{MAX_QUERY_CHARS}
            </span>
            <button
              type="button"
              className="beat-primary-btn"
              disabled={submitting || !query.trim()}
              onClick={() => void fire()}
            >
              {submitting ? "Firing…" : "Fire"}
            </button>
          </div>
          {error && <div className="beat-error">{error}</div>}
        </div>
      )}

      {attempt && (
        <div className={`beat-result-card ${resultClass(attempt.result)}`}>
          <p className="beat-result-headline">{rankSentence(attempt.anchorRank, attempt.result)}</p>
          {attempt.topHit && (
            <p className="beat-outranked">
              What outranked it: <strong>{attempt.topHit.title}</strong>
            </p>
          )}
          <p className="beat-score-delta">+{attempt.score} points</p>
          {line && <p className="beat-commentary">{line}</p>}
          <div className="beat-actions">
            <button type="button" className="beat-primary-btn" onClick={() => void fetchAnchor()}>
              Next anchor
            </button>
            {attempt.result === "POISONED" && (
              <button type="button" className="beat-ghost-btn" onClick={() => void shareResult()}>
                {copied ? "Copied!" : shareSupported ? "Share poison" : "Copy score"}
              </button>
            )}
            <Link href="/impact" className="beat-ghost-btn beat-link-btn">
              Your impact
            </Link>
            <Link href="/arena" className="beat-ghost-btn beat-link-btn">
              Blind Rank
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
