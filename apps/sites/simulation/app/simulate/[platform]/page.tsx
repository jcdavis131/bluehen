import {
  Axis,
  Marginalia,
  RuledSection,
  StatusLine,
  TitleCard,
} from "@synthaembed/ui-fleet";
import { getSiteCircuit } from "@synthaembed/fleet";
import Link from "next/link";
import { notFound } from "next/navigation";
import marketPlatforms from "../../../../../../config/market-platforms.json" with { type: "json" };
import { WaitlistForm } from "../../../components/WaitlistForm";

/** Public explainer for one simulated platform (UX-103, Spec 0020).
 *
 * Registry-driven: platform rules come from config/market-platforms.json —
 * the same RootMem-style rulebook the simulator enforces (Spec 0013), so
 * the page cannot drift from what actually runs. No results are shown until
 * a report clears review; the empty state below is the honest one. */

type RegistryPlatform = {
  id: string;
  name: string;
  category: string;
  domain: string;
  simulationOnly: boolean;
  rules: string[];
  rootMemoryUnits: { id: string; rules?: string; evidence?: string }[];
};

const REGISTRY: RegistryPlatform[] = marketPlatforms.platforms as RegistryPlatform[];

const CATEGORY_LABELS: Record<string, string> = {
  "prediction-market": "Prediction market",
  "sports-dfs": "Sports DFS",
  "retail-brokerage": "Retail brokerage",
};

/** Maps registry category → WaitlistForm interest option. */
const CATEGORY_INTEREST: Record<string, string> = {
  "prediction-market": "prediction-markets",
  "sports-dfs": "sports-dfs",
  "retail-brokerage": "equities",
};

function getRegistryPlatform(id: string): RegistryPlatform | undefined {
  return REGISTRY.find((p) => p.id === id);
}

export function generateStaticParams() {
  return REGISTRY.map((p) => ({ platform: p.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  const entry = getRegistryPlatform(platform);
  const name = entry?.name ?? "Platform";
  return {
    title: `${name} paper simulation — Simulation Lab`,
    description: `What our ${name} paper-trading simulation covers and what a published strategy report contains. Simulation only — no live capital, no trading advice.`,
  };
}

export default async function SimulatePage({ params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  const entry = getRegistryPlatform(platform);
  if (!entry) notFound();

  const surface = getSiteCircuit("simulation");
  const categoryLabel = CATEGORY_LABELS[entry.category] ?? entry.category;

  return (
    <>
      <StatusLine
        site="signals.bhenre.com"
        section={`Simulation Lab · ${entry.name}`}
        status="Phase B · simulation only"
      />

      <Axis>
        <TitleCard
          eyebrow={surface?.eyebrow}
          title={`${entry.name} paper simulation`}
          marginalia={`${categoryLabel} · paper trading · no live capital · no advice`}
        >
          <p className="bh-title-card__copy">
            How our paper-trading simulation treats {entry.name}, and what a published
            strategy report will contain. Simulation only — no live capital, no order
            execution, no trading advice.
          </p>
        </TitleCard>

        <RuledSection label="What the simulation covers">
          <div className="bh-card">
            <div className="bh-card__title">
              {categoryLabel} · {entry.domain}
            </div>
            <p className="bh-card__body">
              Strategies are replayed against historical fixture data — never a live
              order book — with {entry.name}&apos;s platform rulebook enforced from our
              registry on every simulated trade:
            </p>
            <ul className="bh-card__body" style={{ paddingLeft: "1.25em", marginTop: "var(--bh-space-2)" }}>
              {entry.rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </div>
        </RuledSection>

        <RuledSection label="What a published report contains">
          <div className="bh-card">
            <ul className="bh-card__body" style={{ paddingLeft: "1.25em" }}>
              <li>The strategy under test and the fixture corpus it ran against.</li>
              <li>
                The platform rules applied during the run
                {entry.rootMemoryUnits.length > 0 && (
                  <>
                    {" "}
                    (registry ids:{" "}
                    {entry.rootMemoryUnits.map((u, i) => (
                      <span key={u.id}>
                        {i > 0 && ", "}
                        <code>{u.id}</code>
                      </span>
                    ))}
                    )
                  </>
                )}
                .
              </li>
              <li>Measured simulation results: Sharpe ratio, turnover, and trade count.</li>
              <li>
                An explicit <code>mode: &quot;simulation&quot;</code> marker — every report is
                paper trading, never live capital.
              </li>
            </ul>
          </div>
        </RuledSection>

        <RuledSection label="Published reports">
          <div className="bh-card">
            <div className="bh-card__title">No published report for {entry.name} yet</div>
            <p className="bh-card__body">
              Reports publish only after a simulation batch clears review. When the first{" "}
              {entry.name} write-up clears, it goes to the waitlist — strategy, platform
              rules applied, and measured simulation results.
            </p>
          </div>
          <div className="bh-card bh-card--organic" style={{ marginTop: "var(--bh-space-3)" }}>
            <div className="bh-card__title">Get the {entry.name} report first</div>
            <p className="bh-card__body">
              Your email is stored for this list only — see the{" "}
              <a href="https://bhenre.com/legal/privacy">privacy note</a>.
            </p>
            <WaitlistForm defaultInterest={CATEGORY_INTEREST[entry.category]} />
          </div>
        </RuledSection>

        <RuledSection label="For engineers">
          <details className="bh-card">
            <summary style={{ cursor: "pointer", fontWeight: 600 }}>
              Reproduce this simulation locally
            </summary>
            <pre className="bh-card__body" style={{ overflow: "auto", fontSize: 13, marginTop: "var(--bh-space-2)" }}>
{`uv run python scripts/omni_simulate.py --platform ${entry.id}
# or via unified CLI (API must be running):
synth omni simulate ${entry.id} --strategy baseline-momentum`}
            </pre>
            <p className="bh-card__body" style={{ marginTop: "var(--bh-space-2)" }}>
              Response includes <code>mode: &quot;simulation&quot;</code>, Sharpe, turnover,
              trades, and <code>platformRulesApplied</code> from the RootMem registry.
            </p>
          </details>
          <Marginalia>
            Simulation only. Live-capital execution is blocked at the API (Spec 0013) —
            Phase C live trading is deferred under the v1 guardrail.
          </Marginalia>
        </RuledSection>

        <p style={{ margin: "var(--bh-space-6) 0" }}>
          <Link href="/" className="bh-link">
            ← Back to Simulation Lab
          </Link>
        </p>
      </Axis>
    </>
  );
}
