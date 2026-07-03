import type { Metadata } from "next";
import { PageHeader, ProgressMeter, Reveal } from "@synthaembed/ui-fleet";
import { getSiteCircuit } from "@synthaembed/fleet";
import { collapseScore, decodeShareParam, ogQueryFor, verdictFor } from "../../../lib/share";

/**
 * Stateless share permalink for a health-check result (Spec 0020, UX-122).
 * The whole measured snapshot travels in the `d` query param — no result
 * storage exists behind this page. Malformed or missing params get an honest
 * error state; we never render an invented score as real.
 */

// Next delivers string | string[] | undefined; decodeShareParam rejects
// anything that is not a single well-formed string.
type SearchParams = Promise<{ d?: string | string[] }>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { d } = await searchParams;
  const share = decodeShareParam(d);
  if (!share) {
    return {
      title: "Share link not recognized",
      description:
        "This health-check share link is malformed. Run your own free embedding health check instead.",
      robots: { index: false },
    };
  }
  const utilPct = Math.round(share.utilization * 100);
  const title = `Embedding health check: ${utilPct}% space utilization`;
  const description = `${share.modelVersion} on ${share.samples} samples — effective rank ${share.effectiveRank.toFixed(1)}/${share.maxPossibleRank.toFixed(1)}, collapse score ${collapseScore(share.utilization)}/100. Run your own free check at dumbmodel.com.`;
  const ogImage = `/api/og?${ogQueryFor(share)}`;
  return {
    title,
    description,
    robots: { index: false },
    // A leaf openGraph object replaces the layout's wholesale in Next's
    // metadata merge, so restate siteName/type or the share page — the one
    // page built for social embeds — loses them.
    openGraph: {
      siteName: "Baseline Comparison · Blue Hen RE",
      type: "website",
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function CheckResultPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { d } = await searchParams;
  const surface = getSiteCircuit("dumbmodel");
  const share = decodeShareParam(d);

  if (!share) {
    return (
      <>
        <PageHeader
          eyebrow={surface?.eyebrow}
          title="That link came in scrambled"
          lead="This share link is malformed or incomplete, and we only render numbers we actually measured — so there is nothing honest to show here."
        />
        <div className="bh-card bh-card--organic">
          <div className="bh-alert bh-alert--error">
            The result data in this link could not be decoded. Could be
            truncation, could be tampering. Either way, no score gets invented
            on this site.
          </div>
          <p className="bh-card__body" style={{ marginTop: 14 }}>
            The good news: the health check is free, takes seconds, and needs
            no signup. Paste 3–64 lines of your own text and get a measured
            result instead.
          </p>
          <a className="bh-btn bh-btn--primary bh-btn--hero" href="/check" style={{ marginTop: 6 }}>
            Run a fresh check
          </a>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={surface?.eyebrow}
        title="Shared embedding health check"
        lead="Someone ran the free health check on their content and shipped you the numbers. Everything below is decoded straight from the link — this site stores no results, so the link is the whole receipt."
      />
      <div className="bh-card bh-card--organic">
        <Reveal index={0}>
          <div className="bh-meta" style={{ marginBottom: 12 }}>
            {share.samples} samples · {share.dims}d embeddings ·{" "}
            <code>{share.modelVersion}</code> · collapse score{" "}
            {collapseScore(share.utilization)}/100
          </div>
        </Reveal>
        <div className="bh-stack">
          <Reveal index={1}>
            <ProgressMeter
              label="Effective rank of the sample"
              value={share.effectiveRank}
              max={share.maxPossibleRank}
              digits={1}
              tone={share.utilization < 0.3 ? "danger" : share.utilization < 0.6 ? "clay" : "moss"}
            />
          </Reveal>
          <Reveal index={2}>
            <ProgressMeter
              label="Space utilization"
              value={share.utilization * 100}
              max={100}
              digits={0}
              suffix="%"
              tone={share.utilization < 0.3 ? "danger" : "accent"}
            />
          </Reveal>
          <Reveal index={3}>
            <ProgressMeter
              label="Mean pairwise similarity (lower = more diverse)"
              value={share.meanPairwiseSimilarity}
              max={1}
              direction="lower-better"
              digits={3}
              tone="clay"
            />
          </Reveal>
        </div>
        <Reveal index={4}>
          <p className="bh-card__body" style={{ marginTop: 14 }}>
            {verdictFor(share.utilization)}
          </p>
          <p className="bh-muted" style={{ fontSize: "0.8125rem", margin: "6px 0 0" }}>
            This is a snapshot of one measured run — the diagnose API stores
            nothing, so the numbers live in the link itself. Your content will
            score differently. Only one way to find out how.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
            <a className="bh-btn bh-btn--primary bh-btn--hero" href="/check">
              Run your own check
            </a>
            <a className="bh-btn bh-btn--ghost" href="https://bhenre.com/store">
              Run a full evaluation — credits
            </a>
            <a className="bh-btn bh-btn--ghost" href="https://bhenre.com/contact?topic=evaluation-sprint">
              Talk to the team
            </a>
          </div>
        </Reveal>
      </div>
      <p className="bh-meta" style={{ marginTop: 16 }}>
        Method: variance-based Shannon-entropy effective rank over the
        sample&apos;s embedding matrix — the same telemetry the training loop
        monitors for collapse. Diagnostics are measured, never simulated.
      </p>
    </>
  );
}
