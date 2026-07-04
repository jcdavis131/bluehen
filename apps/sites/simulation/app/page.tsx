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
import { listReports, loadPlatforms, loadResults } from "../lib/data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Simulation Lab — paper-trading strategy reports",
  description:
    "Published strategy reports from paper-trading simulations across prediction markets, sports DFS, and retail equities. Simulation only; no live capital, no trading advice.",
};

const CATEGORY_LABEL: Record<string, string> = {
  "prediction-market": "Prediction market",
  "sports-dfs": "Sports DFS",
  "retail-brokerage": "Retail brokerage",
};

export default function FinanceLabPage() {
  const surface = getSiteCircuit("simulation");
  const platforms = loadPlatforms();
  const results = loadResults();
  const latestReport = listReports()[0];

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

        {latestReport && (
          <RuledSection label="Latest report">
            <div className="bh-card bh-card--organic">
              <div className="bh-card__title">
                <Link href={`/reports/${latestReport.slug}`} className="bh-link">
                  {latestReport.title}
                </Link>
              </div>
              <div className="bh-card__body" style={{ color: "var(--bh-muted)" }}>
                {latestReport.date}
                {latestReport.status && <> · {latestReport.status}</>}
              </div>
              {latestReport.summary && (
                <p className="bh-card__body">{latestReport.summary}</p>
              )}
              <Link href="/reports" className="bh-link">
                All reports →
              </Link>
            </div>
          </RuledSection>
        )}

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
              Orchestration. Platform rules live in the RootMem registry; strategies optimize in
              text space via SkillOpt. <Link href="/methodology">Methodology</Link> · Spec{" "}
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
            {platforms.map((p) => {
              const sim = results?.platforms?.[p.id];
              return (
                <div key={p.id} className="bh-card">
                  <div className="bh-card__title">{p.name}</div>
                  <div className="bh-card__body" style={{ color: "var(--bh-muted)" }}>
                    {CATEGORY_LABEL[p.category] ?? p.category}
                    {sim && (
                      <>
                        {" "}
                        · {sim.tradeCount} paper trade{sim.tradeCount === 1 ? "" : "s"} logged
                      </>
                    )}
                  </div>
                  <div style={{ marginTop: "var(--bh-space-2)", display: "flex", gap: "var(--bh-space-3)" }}>
                    <Link href={`/platforms/${p.id}`} className="bh-link">
                      Rules →
                    </Link>
                    <Link href={`/simulate/${p.id}`} className="bh-link">
                      Paper sim →
                    </Link>
                  </div>
                </div>
              );
            })}
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
