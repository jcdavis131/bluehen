"use client";

import { useState } from "react";
import { ProgressMeter, Reveal } from "@synthaembed/ui-fleet";
import type { DiagnoseResult } from "@synthaembed/ui-fleet";

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

  const texts = raw
    .split(/\n+/)
    .map((t) => t.trim())
    .filter(Boolean);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ texts, consent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `check failed (${res.status})`);
      setResult(data as DiagnoseResult);
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
          Store my samples to improve public benchmarks. Optional; unchecked
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
              {result.utilization < 0.3
                ? "Your samples cluster tightly. Retrieval over content like this will struggle to distinguish documents. A domain-tuned model typically recovers usable rank."
                : result.utilization < 0.6
                  ? "Moderate spread. There is measurable headroom; domain tuning usually widens separation on content like this."
                  : "Healthy spread. Your content occupies a large share of the embedding space under the serving model."}
            </p>
            <p className="bh-muted" style={{ fontSize: "0.8125rem", margin: "6px 0 0" }}>
              Curious how it shifts? Run it again with a different slice; docs
              vs. marketing copy usually score differently.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
              <a className="bh-btn bh-btn--primary bh-btn--hero" href="https://bhenre.com/store">
                Run a full evaluation with credits
              </a>
              <a className="bh-btn bh-btn--ghost" href="https://bhenre.com/contact?topic=evaluation-sprint">
                Talk to the team
              </a>
              <a
                className="bh-btn bh-btn--ghost"
                target="_blank"
                rel="noopener noreferrer"
                href={`/api/og?erank=${result.effectiveRank}&util=${result.utilization}&model=${encodeURIComponent(result.modelVersion)}&score=${Math.round((1 - result.utilization) * 100)}&samples=${result.samples}`}
              >
                Share card ↗
              </a>
            </div>
          </Reveal>
        </div>
      )}
    </div>
  );
}
