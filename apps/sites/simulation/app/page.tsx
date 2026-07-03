import {
  Axis,
  Marginalia,
  RuledSection,
  StatusLine,
  TitleCard,
  TeamStrip,
} from "@synthaembed/ui-fleet";
import { getSiteCircuit } from "@synthaembed/fleet";
import Link from "next/link";
import { WaitlistForm } from "../components/WaitlistForm";

export const metadata = {
  title: "Simulation Lab — paper-trading strategy reports",
  description:
    "Published strategy reports from paper-trading simulations across prediction markets, sports DFS, and retail equities. Simulation only; no live capital, no trading advice.",
};

const PLATFORMS = [
  { id: "kalshi", name: "Kalshi", category: "Prediction market" },
  { id: "polymarket", name: "Polymarket", category: "Prediction market" },
  { id: "prizepicks", name: "PrizePicks", category: "Sports DFS" },
  { id: "robinhood", name: "Robinhood", category: "Retail brokerage" },
];

export default function FinanceLabPage() {
  const surface = getSiteCircuit("simulation");

  return (
    <>
      <StatusLine
        site="signals.bhenre.com"
        section="Simulation Lab"
        status="Phase B · simulation only"
      />

      <Axis wide>
        <TitleCard
          eyebrow={surface?.eyebrow}
          title="Simulation Lab"
          marginalia="Paper trading · no live capital · no advice"
        >
          <p className="bh-title-card__copy">
            Published strategy reports from paper-trading simulations across prediction markets,
            sports DFS, and retail equities. Simulation only; no live capital, no trading advice.
          </p>
        </TitleCard>

      <TeamStrip siteId="simulation" />

        <RuledSection label="Get the strategy reports">
          <div className="bh-card bh-card--organic">
            <div className="bh-card__title">Waitlist</div>
            <p className="bh-card__body">
              When a simulation batch clears review, the write-up goes to the
              waitlist first: strategy, platform rules applied, and measured
              simulation results. Your email is stored for this list only. See the{" "}
              <a href="https://bhenre.com/legal/privacy">privacy note</a>.
            </p>
            <WaitlistForm />
          </div>
        </RuledSection>

        <RuledSection label="Omni-Market Alpha Engine">
          <div className="bh-card">
            <div className="bh-card__title">Omni-Market Alpha Engine (v4.0)</div>
            <p className="bh-card__body">
              Four-org pipeline: Data Miners → Research Architects → Simulation Stress Testers →
              Orchestration. Platform rules live in RootMem registry; strategies optimize in text
              space via SkillOpt. Spec{" "}
              <a href="https://github.com/jcdavis131/henington-homes/blob/main/specs/0013-omni-market-alpha-engine.md">
                0013
              </a>
              .
            </p>
          </div>
        </RuledSection>

        <RuledSection label="Platforms">
          <div
            style={{
              display: "grid",
              gap: "var(--bh-space-3)",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            }}
          >
            {PLATFORMS.map((p) => (
              <div key={p.id} className="bh-card">
                <div className="bh-card__title">{p.name}</div>
                <div className="bh-card__body" style={{ color: "var(--bh-muted)" }}>
                  {p.category}
                </div>
                <Link
                  href={`/simulate/${p.id}`}
                  className="bh-link"
                  style={{ marginTop: "var(--bh-space-2)", display: "inline-block" }}
                >
                  Run paper sim →
                </Link>
              </div>
            ))}
          </div>
        </RuledSection>

        <RuledSection label="Agent workerbees">
          <div className="bh-card">
            <div className="bh-card__title">CLI</div>
            <pre className="bh-card__body" style={{ overflow: "auto", fontSize: 13 }}>
{`uv run python scripts/omni_simulate.py --platform kalshi
uv run python scripts/omni_loop.py --iterations 1
synth omni platforms
synth omni simulate kalshi --strategy baseline-momentum`}
            </pre>
          </div>
          <Marginalia>
            Simulation only. Phase C live trading is deferred under the v1 guardrail.
          </Marginalia>
        </RuledSection>
      </Axis>
    </>
  );
}
