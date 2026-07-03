import Link from "next/link";
import { ConeMascot } from "@/components/site";
import { PageHeader } from "@synthaembed/ui-fleet";
export const metadata = {
  title: "Museum of Collapse — Baseline Comparison",
  description:
    "A reference catalog of embedding-collapse failure modes and how each is detected.",
};

type Category = "geometry" | "retrieval" | "ops";

interface Exhibit {
  id: string;
  name: string;
  category: Category;
  /** The measurable symptom — what the diagnostics show when this happens. */
  signature: string;
  /** Why it happens. */
  cause: string;
  /** How the org catches or prevents it. */
  detection: string;
  /** Optional pointer to the gate/spec that hardens against it. */
  hardening?: string;
}

const CATEGORY_LABEL: Record<Category, string> = {
  geometry: "Geometry",
  retrieval: "Retrieval",
  ops: "Operations",
};

const EXHIBITS: Exhibit[] = [
  {
    id: "anisotropy",
    name: "Anisotropy (the cone)",
    category: "geometry",
    signature:
      "effective rank ≪ d; mean pairwise cosine → 1; vectors crowd a narrow cone.",
    cause:
      "Contrastive training on too-similar pairs pushes outputs toward a dominant direction; the embedding space loses angular spread.",
    detection:
      "Effective-rank + mean-pairwise-similarity diagnostics (the free /check health check).",
    hardening: "eval-harness rankAboveBaseline gate",
  },
  {
    id: "dim-starvation",
    name: "Dimension starvation",
    category: "geometry",
    signature:
      "singular-value spectrum falls off a cliff after a few dims; utilization = erank / dmax is low.",
    cause:
      "Only a handful of dimensions carry signal; the rest are near-zero noise, wasting storage and compute.",
    detection:
      "Space-utilization metric on the health check (erank vs max possible rank).",
  },
  {
    id: "mode-collapse",
    name: "Mode collapse",
    category: "retrieval",
    signature:
      "distinct inputs map to near-identical vectors; top-k overlap is near-total across queries.",
    cause:
      "Loss minimized by mapping everything to a single region; the model ‘wins’ retrieval by returning the same chunks regardless of query.",
    detection: "nDCG@10 non-regression gate + collapse score on the panel.",
    hardening: "eval-harness ndcgNonRegression gate",
  },
  {
    id: "mrl-cliff",
    name: "MRL truncation cliff",
    category: "retrieval",
    signature:
      "mrlKnnTruncated ≪ mrlKnnFull; retrieval drops past tolerance when serving a prefix dim.",
    cause:
      "Matryoshka prefix dims weren’t trained jointly, so truncating for low-latency tier serve silently destroys recall.",
    detection:
      "mrlWithinTolerance gate fails closed when truncated KNN drops > 0.05 or below the 0.30 floor.",
    hardening: "eval-harness MRL gate (REV-905)",
  },
  {
    id: "thin-corpus",
    name: "Thin-corpus false pass",
    category: "retrieval",
    signature:
      "< 5 real eval pairs; gate still reads green by falling back to hard-coded demo pairs.",
    cause:
      "A deploy gate measured on toy data passes models that have never been tested on real pairs. ‘deploy gate’ means nothing for thin corpora.",
    detection:
      "sufficientEvalPairs gate fails (not falls back) below a minimum real-pair count.",
    hardening: "eval-harness sufficientEvalPairs (REV-905)",
  },
  {
    id: "per-request-drift",
    name: "Per-request model drift",
    category: "ops",
    signature:
      "same input text yields different embeddings across calls; indexing and serve diverge.",
    cause:
      "Checkpoint + tokenizer reloaded on every request (or per chunk): nondeterministic init, cache misses, and a trivial DoS surface.",
    detection:
      "Checkpoint LRU cache + deterministic serve path; health check reproducibility.",
    hardening: "checkpoint cache (REV-903)",
  },
];

export default function MuseumPage() {

  return (
    <>
      <PageHeader
        eyebrow="Reference catalog"
        title="Museum of Collapse"
        lead="The failure modes we measure against. Every exhibit is a real way embeddings go wrong, with the diagnostic or gate that catches it before a model ships."
        badge={<ConeMascot size={48} />}
      />

      <div className="bh-grid bh-grid--2">
        {EXHIBITS.map((ex) => (
          <article key={ex.id} className="bh-card">
            <header className="bh-card__header">
              <ConeMascot size={28} />
              <div>
                <h2 className="bh-card__title bh-card__title--lg">{ex.name}</h2>
                <div className="bh-card__subtitle">{CATEGORY_LABEL[ex.category]}</div>
              </div>
            </header>

            <dl className="bh-card__body" style={{ display: "grid", gap: "var(--bh-space-3)" }}>
              <div>
                <dt className="bh-muted bh-mono" style={{ fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Signature
                </dt>
                <dd className="bh-mono" style={{ margin: 0, marginTop: 4 }}>
                  {ex.signature}
                </dd>
              </div>
              <div>
                <dt className="bh-muted bh-mono" style={{ fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Cause
                </dt>
                <dd style={{ margin: 0, marginTop: 4 }}>{ex.cause}</dd>
              </div>
              <div>
                <dt className="bh-muted bh-mono" style={{ fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Detection
                </dt>
                <dd style={{ margin: 0, marginTop: 4 }}>{ex.detection}</dd>
              </div>
              {ex.hardening ? (
                <div>
                  <dt className="bh-muted bh-mono" style={{ fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Hardening
                  </dt>
                <dd style={{ margin: 0, marginTop: 4 }}>
                  <span
                    className="bh-mono"
                    style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      border: "1px solid var(--bh-border, #d8d4cc)",
                      borderRadius: 999,
                      fontSize: "0.78rem",
                      background: "var(--bh-surface-2, #f6f3ec)",
                    }}
                  >
                    {ex.hardening}
                  </span>
                </dd>
                </div>
              ) : null}
            </dl>
          </article>
        ))}
      </div>

      <p style={{ marginTop: "var(--bh-space-6)", display: "flex", flexWrap: "wrap", gap: "var(--bh-space-3)" }}>
        <Link href="/check" className="bh-btn bh-btn--primary">
          Run the free health check
        </Link>
        <Link href="/hall" className="bh-btn bh-btn--ghost">
          See the reference panel
        </Link>
      </p>
    </>
  );
}
