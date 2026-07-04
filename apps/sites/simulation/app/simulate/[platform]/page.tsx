import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@synthaembed/ui-fleet";
import { loadPlatforms, loadResults } from "../../../lib/data";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ platform: string }> };

export async function generateMetadata({ params }: Params) {
  const { platform } = await params;
  const p = loadPlatforms().find((x) => x.id === platform);
  const name = p?.name ?? "Platform";
  return {
    title: `${name} paper trade — Simulation Lab`,
    description: `Fixture-driven backtest for ${name} with platform rule enforcement. Simulation only; not live trading.`,
  };
}

export default async function SimulatePage({ params }: Params) {
  const { platform } = await params;
  const p = loadPlatforms().find((x) => x.id === platform);
  if (!p) notFound();

  const results = loadResults();
  const sim = results?.platforms?.[p.id];

  return (
    <>
      <PageHeader
        eyebrow="Simulation"
        title={`${p.name} paper trade`}
        lead="Fixture-driven backtest with platform rule enforcement. Not live trading."
        badge={<span className="bh-badge bh-badge--warn">simulation only</span>}
      />

      {sim ? (
        <div className="bh-card">
          <div className="bh-card__title">
            Latest run · {results?.generatedAt?.slice(0, 10)} · mode:{" "}
            <code>{sim.mode}</code>
          </div>
          <table className="bh-table">
            <tbody>
              <tr>
                <td style={{ color: "var(--bh-muted)" }}>Strategy</td>
                <td>
                  <code>{sim.strategyId}</code> · corpus <code>{sim.corpusId}</code>
                </td>
              </tr>
              <tr>
                <td style={{ color: "var(--bh-muted)" }}>Sharpe (fictional)</td>
                <td>
                  {sim.sharpe.toFixed(2)} (penalized {sim.penalizedSharpe.toFixed(2)}) — on{" "}
                  {sim.tradeCount} fixture trade{sim.tradeCount === 1 ? "" : "s"}; not a
                  performance claim
                </td>
              </tr>
              <tr>
                <td style={{ color: "var(--bh-muted)" }}>Paper bankroll</td>
                <td>
                  {sim.bankrollStart.toLocaleString()} → {sim.bankrollEnd.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="bh-card__subtitle" style={{ marginTop: "var(--bh-space-3)" }}>
            Trade log
          </div>
          <table className="bh-table">
            <thead>
              <tr>
                <th>Fixture</th>
                <th>Edge</th>
                <th>Weight</th>
                <th>PnL</th>
                <th>Rules applied</th>
              </tr>
            </thead>
            <tbody>
              {sim.trades.map((t) => (
                <tr key={t.fixtureId}>
                  <td>
                    <code>{t.fixtureId}</code>
                  </td>
                  <td>{t.edge}</td>
                  <td>{t.weight}</td>
                  <td>{t.pnl}</td>
                  <td>
                    {t.rulesApplied.map((r) => (
                      <code key={r} style={{ marginRight: "0.4em" }}>
                        {r}
                      </code>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bh-card">
          <div className="bh-card__body">
            No published run for this platform yet — results render from{" "}
            <code>content/simulation/results.json</code>.
          </div>
        </div>
      )}

      <div className="bh-card" style={{ marginTop: "var(--bh-space-3)" }}>
        <div className="bh-card__title">Reproduce locally</div>
        <pre className="bh-card__body" style={{ overflow: "auto", fontSize: 13 }}>
{`uv run python scripts/omni_simulate.py --platform ${p.id}
# or via unified CLI (API must be running):
synth omni simulate ${p.id} --strategy baseline-momentum`}
        </pre>
        <p className="bh-card__body" style={{ marginTop: "var(--bh-space-2)" }}>
          Response includes <code>mode: &quot;simulation&quot;</code>, Sharpe, turnover, trades,
          and <code>platformRulesApplied</code> from the RootMem registry.
        </p>
      </div>

      <div style={{ marginTop: "var(--bh-space-5)" }}>
        <Link href={`/platforms/${p.id}`} className="bh-card__subtitle">
          ← {p.name} rules &amp; constraints
        </Link>
      </div>
    </>
  );
}
