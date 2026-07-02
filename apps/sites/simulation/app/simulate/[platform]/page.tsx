import { PageHeader } from "@synthaembed/ui-fleet";
import { notFound } from "next/navigation";

const VALID = new Set(["kalshi", "polymarket", "prizepicks", "robinhood"]);

const PLATFORM_NAMES: Record<string, string> = {
  kalshi: "Kalshi",
  polymarket: "Polymarket",
  prizepicks: "PrizePicks",
  robinhood: "Robinhood",
};

export async function generateMetadata({ params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  const name = PLATFORM_NAMES[platform] ?? "Platform";
  return {
    title: `${name} paper trade — Simulation Lab`,
    description: `Fixture-driven backtest for ${name} with platform rule enforcement. Simulation only — not live trading.`,
  };
}

export default async function SimulatePage({ params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  if (!VALID.has(platform)) notFound();

  return (
    <>
      <PageHeader
        eyebrow="Simulation"
        title={`${PLATFORM_NAMES[platform]} paper trade`}
        lead="Fixture-driven backtest with platform rule enforcement. Not live trading."
        badge={<span className="bh-badge bh-badge--warn">simulation only</span>}
      />
      <div className="bh-card">
        <div className="bh-card__title">Run locally</div>
        <pre className="bh-card__body" style={{ overflow: "auto", fontSize: 13 }}>
{`uv run python scripts/omni_simulate.py --platform ${platform}
# or via unified CLI (API must be running):
synth omni simulate ${platform} --strategy baseline-momentum`}
        </pre>
        <p className="bh-card__body" style={{ marginTop: "var(--bh-space-2)" }}>
          Response includes <code>mode: &quot;simulation&quot;</code>, Sharpe, turnover, trades, and{" "}
          <code>platformRulesApplied</code> from RootMem registry.
        </p>
      </div>
    </>
  );
}
