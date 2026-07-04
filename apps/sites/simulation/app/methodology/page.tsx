import { Marginalia, PageHeader, RuledSection } from "@synthaembed/ui-fleet";
import { getSiteCircuit } from "@synthaembed/fleet";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Methodology — Simulation Lab",
  description:
    "How the Omni-Market Alpha Engine works: RootMem platform rules, SmartSearch retrieval, SkillOpt text-space optimization, and the evaluation gates every run must pass.",
};

export default function MethodologyPage() {
  const surface = getSiteCircuit("simulation");

  return (
    <>
      <PageHeader
        eyebrow={surface?.eyebrow}
        title="Methodology"
        lead="Simulation-first by design. Every number published here passed the same gates; every gate is listed below."
        badge={<span className="bh-badge bh-badge--warn">simulation only</span>}
      />

      <RuledSection label="Pipeline">
        <div className="bh-card">
          <div className="bh-card__title">Four-org loop (Spec 0013)</div>
          <p className="bh-card__body">
            Data ingests news, stats, and filings with semantic dedup. Research maintains
            platform-aware retrieval (SmartSearch over RootMem rules + corpus). Simulation
            stress-tests strategies as paper trades under enforced platform rules. Orchestration
            hill-climbs the weakest platform slice. No stage places live orders.
          </p>
        </div>
      </RuledSection>

      <RuledSection label="Platform rules (RootMem)">
        <div className="bh-card">
          <p className="bh-card__body">
            Each platform's execution mechanics — settlement, position caps, payout structures,
            margin rules — live as structured registry entries with cited evidence
            (<code>config/market-platforms.json</code>). The simulator refuses trades that violate
            them, and every trade log records the rule ids it applied. A metric that can't cite
            its rules doesn't publish.
          </p>
        </div>
      </RuledSection>

      <RuledSection label="Retrieval (SmartSearch)">
        <div className="bh-card">
          <p className="bh-card__body">
            CPU-only, LLM-free recall over platform rules and corpus: weighted term parse
            (proper nouns &gt; nouns &gt; verbs), substring recall, reciprocal-rank fusion, and a
            score-adaptive cutoff. Deterministic by construction — the same query against the same
            corpus always retrieves the same context.
          </p>
        </div>
      </RuledSection>

      <RuledSection label="Strategy optimization (SkillOpt)">
        <div className="bh-card">
          <p className="bh-card__body">
            Strategies are markdown skills, optimized in text space: roll out paper trades,
            reflect on failures, propose bounded add/delete/replace edits, and gate every edit on
            held-out validation Sharpe. Rejected edits enter a buffer so the loop never re-proposes
            a known failure.
          </p>
        </div>
      </RuledSection>

      <RuledSection label="Evaluation gates">
        <div className="bh-card">
          <table className="bh-table">
            <thead>
              <tr>
                <th>Gate</th>
                <th>Rule</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Mode</td>
                <td>
                  Every response must carry <code>mode: &quot;simulation&quot;</code>
                </td>
              </tr>
              <tr>
                <td>Sharpe (fictional)</td>
                <td>Non-regression vs the baseline skill on the same fixture set</td>
              </tr>
              <tr>
                <td>Rule citation</td>
                <td>Every trade log cites applied RootMem rule ids</td>
              </tr>
              <tr>
                <td>Look-ahead</td>
                <td>Fixture timestamps enforced; any future join is a hard fail</td>
              </tr>
            </tbody>
          </table>
        </div>
        <Marginalia>
          The v1 guardrail is locked: no live order execution, no brokerage OAuth, no real
          capital on any platform, no trading advice. Live execution would require a separate
          spec, Operator approval, and compliance review (Phase C).
        </Marginalia>
      </RuledSection>
    </>
  );
}
