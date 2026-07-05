"use client";

import { useEffect, useRef, useState } from "react";
import { ProgressMeter, Reveal } from "@synthaembed/ui-fleet";
import type { CertifyStatusResult } from "@synthaembed/ui-fleet";

const POLL_MS = 3000;
const POLL_MAX = 40;

type Phase = "idle" | "submitting" | "polling" | "done" | "err";

/** Self-service certification submission (Spec 0021 P4, MON-006 cursor lane). */
export function CertifyForm() {
  const [endpointUrl, setEndpointUrl] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [status, setStatus] = useState<CertifyStatusResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollCount = useRef(0);

  useEffect(() => {
    if (phase !== "polling" || !submissionId) return;

    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/certify/${submissionId}`);
        const data = (await res.json()) as CertifyStatusResult & { error?: string };
        if (!res.ok) throw new Error(data.error ?? `status check failed (${res.status})`);
        if (cancelled) return;
        setStatus(data);
        if (data.status === "completed" || data.status === "failed") {
          setPhase("done");
          return;
        }
        pollCount.current += 1;
        if (pollCount.current >= POLL_MAX) {
          setPhase("done");
          setError("Benchmark is still running. Save your submission ID and check back shortly.");
        }
      } catch (e) {
        if (!cancelled) {
          setPhase("err");
          setError(e instanceof Error ? e.message : String(e));
        }
      }
    };

    void tick();
    const id = window.setInterval(() => void tick(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [phase, submissionId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const url = endpointUrl.trim();
    if (!url) return;
    setPhase("submitting");
    setError(null);
    setStatus(null);
    pollCount.current = 0;
    try {
      const res = await fetch("/api/certify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endpointUrl: url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `submit failed (${res.status})`);
      setSubmissionId(data.submissionId as string);
      setPhase("polling");
    } catch (e) {
      setPhase("err");
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const scorecard = status?.scorecard as Record<string, unknown> | null | undefined;
  const passed = scorecard?.passed === true;
  const ndcg = typeof scorecard?.ndcg10 === "number" ? scorecard.ndcg10 : null;
  const effRank = typeof scorecard?.effectiveRank === "number" ? scorecard.effectiveRank : null;

  return (
    <form onSubmit={submit} className="bh-card bh-card--organic" style={{ marginBottom: "var(--bh-space-6)" }}>
      <div className="bh-card__title">Submit your embedding endpoint</div>
      <p className="bh-card__body" style={{ marginTop: "var(--bh-space-2)" }}>
        Your endpoint must accept{" "}
        <code className="bh-mono">POST {"{"} &quot;texts&quot;: [&quot;...&quot;] {"}"}</code> and
        return{" "}
        <code className="bh-mono">{"{"} &quot;vectors&quot;: [[...], ...] {"}"}</code> over HTTPS.
        We grade it on the same harness that gates our own deploys.
      </p>

      <label className="bh-label" htmlFor="certify-endpoint">
        HTTPS embedding endpoint
      </label>
      <input
        id="certify-endpoint"
        className="bh-input"
        type="url"
        inputMode="url"
        placeholder="https://your-service.com/embed"
        value={endpointUrl}
        onChange={(e) => setEndpointUrl(e.target.value)}
        required
        disabled={phase === "submitting" || phase === "polling"}
        style={{ marginBottom: "var(--bh-space-2)", width: "100%" }}
      />

      <p className="bh-meta" style={{ marginBottom: "var(--bh-space-3)" }}>
        Standard tier · from <strong>$1,500</strong> per run (Operator pricing gate) · results typically in
        minutes once the worker picks up your submission
      </p>

      <button
        type="submit"
        className="bh-btn bh-btn--primary bh-btn--hero"
        disabled={phase === "submitting" || phase === "polling" || !endpointUrl.trim()}
      >
        {phase === "submitting"
          ? "Queuing…"
          : phase === "polling"
            ? "Running benchmark…"
            : "Run certification"}
      </button>

      {phase === "polling" && (
        <div style={{ marginTop: "var(--bh-space-4)" }} aria-live="polite">
          <ProgressMeter value={Math.min(95, pollCount.current * 8)} max={100} label="Harness run in progress" />
          {submissionId && (
            <p className="bh-meta" style={{ marginTop: 8 }}>
              Submission <code className="bh-mono">{submissionId}</code>
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="bh-alert bh-alert--error" style={{ marginTop: "var(--bh-space-4)" }}>
          {error}
        </div>
      )}

      {phase === "done" && status && (
        <div style={{ marginTop: "var(--bh-space-5)" }} aria-live="polite">
          <Reveal index={0}>
            <div className="bh-card">
              <div className="bh-card__row">
                <div className="bh-card__title">Certification result</div>
                <span
                  className={`bh-badge ${
                    status.status === "failed"
                      ? "bh-badge--danger"
                      : passed
                        ? "bh-badge--ok"
                        : "bh-badge--warn"
                  }`}
                >
                  {status.status === "failed"
                    ? "failed"
                    : passed
                      ? "passed gates"
                      : "completed — below gate"}
                </span>
              </div>
              {status.error && (
                <p className="bh-card__body" style={{ marginTop: 8, color: "var(--bh-danger)" }}>
                  {status.error}
                </p>
              )}
              {scorecard && (
                <dl className="bh-card__body" style={{ marginTop: 12, display: "grid", gap: 6 }}>
                  {ndcg != null && (
                    <>
                      <dt className="bh-meta">nDCG@10</dt>
                      <dd className="bh-mono">{ndcg.toFixed(4)}</dd>
                    </>
                  )}
                  {effRank != null && (
                    <>
                      <dt className="bh-meta">Effective rank</dt>
                      <dd className="bh-mono">{effRank.toFixed(2)}</dd>
                    </>
                  )}
                  {typeof scorecard.pairsEvaluated === "number" && (
                    <>
                      <dt className="bh-meta">Pairs evaluated</dt>
                      <dd className="bh-mono">{String(scorecard.pairsEvaluated)}</dd>
                    </>
                  )}
                </dl>
              )}
              {status.paymentStatus === "pending-gate" && (
                <p className="bh-meta" style={{ marginTop: 12 }}>
                  Billing attaches after checkout wiring (Operator gate). The scorecard above is measured
                  independently of payment state.
                </p>
              )}
              <p className="bh-meta" style={{ marginTop: 8 }}>
                Published scorecards also appear on{" "}
                <a href="/scorecards">the scorecard index</a> when the harness publishes to Validation BD
                records.
              </p>
            </div>
          </Reveal>
        </div>
      )}
    </form>
  );
}
