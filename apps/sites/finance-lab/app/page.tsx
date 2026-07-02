import { PageHeader } from "@synthaembed/ui-fleet";
import { getSiteCircuit } from "@synthaembed/fleet";
import Link from "next/link";

const PLATFORMS = [
  { id: "kalshi", name: "Kalshi", category: "Prediction market" },
  { id: "polymarket", name: "Polymarket", category: "Prediction market" },
  { id: "prizepicks", name: "PrizePicks", category: "Sports DFS" },
  { id: "robinhood", name: "Robinhood", category: "Retail brokerage" },
];

export default function FinanceLabPage() {
  const surface = getSiteCircuit("finance-lab");

  return (
    <>
      <PageHeader
        eyebrow={surface?.eyebrow}
        title={surface?.stop ?? "Omni-Market Simulation Lab"}
        lead="Paper-trading validation across prediction markets, sports DFS, and retail equities. Simulation only — no live capital."
        badge={<span className="bh-badge bh-badge--warn">Phase B · simulation</span>}
      />

      <div className="bh-card" style={{ marginBottom: "var(--bh-space-4)" }}>
        <div className="bh-card__title">Omni-Market Alpha Engine (v4.0)</div>
        <p className="bh-card__body">
          Four-org pipeline: Data Miners → Research Architects → Simulation Stress Testers →
          Orchestration. Platform rules live in RootMem registry; strategies optimize in text space
          via SkillOpt. Spec{" "}
          <a href="https://github.com/jcdavis131/henington-homes/blob/main/specs/0013-omni-market-alpha-engine.md">
            0013
          </a>
          .
        </p>
      </div>

      <div style={{ display: "grid", gap: "var(--bh-space-3)", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
        {PLATFORMS.map((p) => (
          <div key={p.id} className="bh-card">
            <div className="bh-card__title">{p.name}</div>
            <div className="bh-card__body" style={{ color: "var(--bh-muted)" }}>
              {p.category}
            </div>
            <Link href={`/simulate/${p.id}`} className="bh-link" style={{ marginTop: "var(--bh-space-2)", display: "inline-block" }}>
              Run paper sim →
            </Link>
          </div>
        ))}
      </div>

      <div className="bh-card" style={{ marginTop: "var(--bh-space-4)" }}>
        <div className="bh-card__title">Agent workerbees</div>
        <pre className="bh-card__body" style={{ overflow: "auto", fontSize: 13 }}>
{`uv run python scripts/omni_simulate.py --platform kalshi
uv run python scripts/omni_loop.py --iterations 1
synth omni platforms
synth omni simulate kalshi --strategy baseline-momentum`}
        </pre>
      </div>
    </>
  );
}
