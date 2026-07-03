"use client";

import { useState } from "react";
import { ProgressMeter, Reveal } from "@synthaembed/ui-fleet";
import type { DiagnoseResult } from "@synthaembed/ui-fleet";
import { encodeShareParam, verdictFor } from "../lib/share";

const PLACEHOLDER = `Paste 3–64 representative text samples, one per line, e.g.:

Quarterly revenue grew 12% on strong retrieval-product demand.
Our support docs cover embedding model deployment and rollback.
The pipeline reindexes the corpus after every deploy gate pass.`;

/** Free embedding health check (Spec 0015): measures how much of the
 * embedding space the user's content actually uses. Every number shown
 * comes from the /v1/diagnose response. */
export function HealthCheckPanel() {
  const [raw, setRaw] = useState("");
  const [consent, setConsent] = useState(false);
  const [result, setResult] = useState<DiagnoseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  // Hall of Cone opt-in (Spec 0020, UX-121) — per-result consent, always
  // starting unchecked: a new measurement never inherits an old opt-in.
  const [hallConsent, setHallConsent] = useState(false);
  const [hallName, setHallName] = useState("");
  const [hallState, setHallState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [hallError, setHallError] = useState<string | null>(null);

  const texts = raw
    .split(/\n+/)
    .map((t) => t.trim())
    .filter(Boolean);

  // Stateless permalink (Spec 0020, UX-122): the measured result travels
  // base64url-encoded in the URL itself — no result storage exists.
  // encodeShareParam returns null for a malformed API response; in that
  // case the share affordance simply is not rendered.
  const shareParam = result ? encodeShareParam(result) : null;
  // Absolute form for the clipboard and the visible fallback link — a
  // relative path pasted into chat or email would not resolve to this site.
  // window is safe here: this value is only used inside `result && …` JSX,
  // and results exist only after a client-side interaction, never in SSR.
  const shareUrl =
    shareParam && typeof window !== "undefined"
      ? new URL(`/check/result?d=${shareParam}`, window.location.origin).toString()
      : null;

  async function copyShareLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  async function submitToHall() {
    if (!result || hallState === "sending") return;
    setHallState("sending");
    setHallError(null);
    try {
      const res = await fetch("/api/hall", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          consent: true,
          name: hallName,
          effectiveRank: result.effectiveRank,
          maxPossibleRank: result.maxPossibleRank,
          utilization: result.utilization,
          samples: result.samples,
          dims: result.dims,
          modelVersion: result.modelVersion,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" && data.error !== "rate_limited"
            ? data.error
            : data.error === "rate_limited"
              ? "easy there — try again in a minute"
              : `submission failed (${res.status})`,
        );
      }
      setHallState("done");
    } catch (e) {
      setHallState("error");
      setHallError(e instanceof Error ? e.message : String(e));
    }
  }

  async function run() {
    setLoading(true);
    setError(null);
    setCopyState("idle");
    // A fresh measurement is a fresh decision — clear any prior hall opt-in.
    setHallConsent(false);
    setHallState("idle");
    setHallError(null);
    try {
      const res = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ texts, consent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `check failed (${res.status})`);
      setResult(data as DiagnoseResult);
      // Reset again after the response lands: a copy performed while this
      // request was in flight referenced the previous result's link.
      setCopyState("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bh-card bh-card--organic">
      <label className="bh-label" htmlFor="health-check-input">
        Your text samples ({texts.length} line{texts.length === 1 ? "" : "s"})
      </label>
      <textarea
        id="health-check-input"
        className="bh-textarea"
        rows={8}
        value={raw}
        placeholder={PLACEHOLDER}
        onChange={(e) => setRaw(e.target.value)}
        style={{ marginBottom: 10 }}
      />

      <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: "0.8125rem", marginBottom: 14 }}>
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          style={{ marginTop: 3 }}
        />
        <span className="bh-muted">
          Store my samples to improve public benchmarks. Optional — unchecked
          submissions are analyzed and discarded. Stored samples carry no
          account identity. See the{" "}
          <a href="https://bhenre.com/legal/privacy">privacy note</a>.
        </span>
      </label>

      <button
        type="button"
        className="bh-btn bh-btn--primary"
        onClick={run}
        disabled={loading || texts.length < 3}
      >
        {loading ? "Measuring…" : "Run health check"}
      </button>
      {texts.length > 0 && texts.length < 3 && (
        <span className="bh-muted" style={{ marginLeft: 10, fontSize: "0.75rem" }}>
          need at least 3 lines
        </span>
      )}

      {error && (
        <div className="bh-alert bh-alert--error" style={{ marginTop: 16 }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: 20 }} aria-live="polite" key={`${result.effectiveRank}-${result.samples}`}>
          <Reveal index={0}>
            <div className="bh-meta" style={{ marginBottom: 12 }}>
              {result.samples} samples · {result.dims}d embeddings ·{" "}
              <code>{result.modelVersion}</code>
              {result.consentStored && " · stored with consent"}
            </div>
          </Reveal>
          <div className="bh-stack">
            <Reveal index={1}>
              <ProgressMeter
                label="Effective rank of your sample"
                value={result.effectiveRank}
                max={result.maxPossibleRank}
                digits={1}
                tone={result.utilization < 0.3 ? "danger" : result.utilization < 0.6 ? "clay" : "moss"}
              />
            </Reveal>
            <Reveal index={2}>
              <ProgressMeter
                label="Space utilization"
                value={result.utilization * 100}
                max={100}
                digits={0}
                suffix="%"
                tone={result.utilization < 0.3 ? "danger" : "accent"}
              />
            </Reveal>
            <Reveal index={3}>
              <ProgressMeter
                label="Mean pairwise similarity (lower = more diverse)"
                value={result.meanPairwiseSimilarity}
                max={1}
                direction="lower-better"
                digits={3}
                tone="clay"
              />
            </Reveal>
          </div>
          <Reveal index={4}>
            <p className="bh-card__body" style={{ marginTop: 14 }}>
              {verdictFor(result.utilization)}
            </p>
            <p className="bh-muted" style={{ fontSize: "0.8125rem", margin: "6px 0 0" }}>
              Curious how it shifts? Run it again with a different slice — docs
              vs. marketing copy usually score differently.
            </p>
            <p className="bh-muted" style={{ fontSize: "0.8125rem", margin: "10px 0 0" }}>
              This was the free spot-check on {result.samples} lines. Evaluation
              credits buy the full treatment: your corpus run through the
              complete benchmark suite with a scored, comparable report.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
              <a className="bh-btn bh-btn--primary bh-btn--hero" href="https://bhenre.com/store">
                Run a full evaluation — credits
              </a>
              <a className="bh-btn bh-btn--ghost" href="https://bhenre.com/contact?topic=evaluation-sprint">
                Talk to the team
              </a>
              {shareUrl && (
                <button type="button" className="bh-btn bh-btn--ghost" onClick={copyShareLink}>
                  {copyState === "copied" ? "Link copied ✓" : "Copy share link"}
                </button>
              )}
            </div>
            {shareUrl && (
              <p className="bh-muted" style={{ fontSize: "0.75rem", margin: "8px 0 0", wordBreak: "break-all" }} aria-live="polite">
                {copyState === "failed"
                  ? "Clipboard said no — grab the link by hand: "
                  : "Shareable results page (numbers travel in the link — nothing stored): "}
                <a href={shareUrl}>{shareUrl}</a>
              </p>
            )}

            <div style={{ marginTop: 16 }} aria-live="polite">
              {hallState === "done" ? (
                <p className="bh-meta" role="status" style={{ margin: 0 }}>
                  On the board. See it in the{" "}
                  <a href="/hall">Hall of Cone → community submissions</a>.
                </p>
              ) : (
                <>
                  <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: "0.8125rem" }}>
                    <input
                      type="checkbox"
                      checked={hallConsent}
                      onChange={(e) => setHallConsent(e.target.checked)}
                      style={{ marginTop: 3 }}
                    />
                    <span className="bh-muted">
                      Add this score to the public Hall of Cone — publishes a display
                      name you choose plus the measured numbers above; never your text
                      samples or any account identity. See the{" "}
                      <a href="https://bhenre.com/legal/privacy">privacy note</a>.
                    </span>
                  </label>
                  {hallConsent && (
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
                      <input
                        className="bh-input"
                        type="text"
                        maxLength={48}
                        placeholder='Display name, e.g. "acme support docs"'
                        value={hallName}
                        onChange={(e) => setHallName(e.target.value)}
                        style={{ maxWidth: 320 }}
                        aria-label="Hall of Cone display name"
                      />
                      <button
                        type="button"
                        className="bh-btn bh-btn--ghost"
                        onClick={submitToHall}
                        disabled={hallState === "sending" || !hallName.trim()}
                      >
                        {hallState === "sending" ? "Submitting…" : "Add my score"}
                      </button>
                    </div>
                  )}
                  {hallState === "error" && hallError && (
                    <div className="bh-alert bh-alert--error" style={{ marginTop: 10 }}>
                      {hallError}
                    </div>
                  )}
                </>
              )}
            </div>
          </Reveal>
        </div>
      )}
    </div>
  );
}
