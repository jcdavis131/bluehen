import {
  Axis,
  CrossSellStrip,
  ExplorationTracker,
  Marginalia,
  ReturnGreeting,
  RuledSection,
  StatusLine,
  TitleCard,
  TeamStrip,
  type LedgerEntry,
} from "@synthaembed/ui-fleet";
import { getSiteCircuit } from "@synthaembed/fleet";
import Link from "next/link";
import marketPlatforms from "../../../../config/market-platforms.json";
import { WaitlistForm } from "../components/WaitlistForm";
import { SIM_SURFACES } from "../components/surfaces";

export const metadata = {
  title: "Simulation Lab — paper-trading strategy reports",
  description:
    "Published strategy reports from paper-trading simulations across prediction markets, sports DFS, and retail equities. Simulation only — no live capital, no trading advice.",
};

/** Same registry the simulator enforces and /simulate/[platform] renders —
 * one source, so the homepage grid cannot drift from the rulebook ids. */
const CATEGORY_LABELS: Record<string, string> = {
  "prediction-market": "Prediction market",
  "sports-dfs": "Sports DFS",
  "retail-brokerage": "Retail brokerage",
};

const PLATFORMS = (
  marketPlatforms.platforms as { id: string; name: string; category: string }[]
).map((p) => ({
  id: p.id,
  name: p.name,
  category: CATEGORY_LABELS[p.category] ?? p.category,
}));

const LEDGER_WINDOW = 200;

type LiveProof = {
  live: boolean;
  /** Platform rulebooks in the RootMem registry, via /v1/omni/platforms. */
  platformCount: number;
  /** omni_sim entries in the last LEDGER_WINDOW Operations Ledger rows. */
  simRuns: number;
  /** The fetched ledger rows themselves — reused by ReturnGreeting (UX-120)
   * so the "since your last visit" line is computed from the same real data,
   * not a second fetch. Empty when the API is unreachable. */
  ledger: LedgerEntry[];
};

/** Live proof metric (Spec 0019 §2.4, UX-124): measured from the core API or
 * the honest empty state — never an invented number. Published-report count
 * is stated statically because it is repo truth: no report has cleared
 * review yet (update the copy when the first one ships). */
/** Like ui-fleet's apiFetch but ISR-cached (revalidate 60s) instead of
 * no-store, so the landing page stays statically servable and core-api sees
 * at most one refetch per minute — not two calls per visitor. */
async function cachedApi<T>(path: string): Promise<T> {
  const baseUrl =
    process.env.SYNTH_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
  const apiKey = process.env.SYNTH_API_KEY ?? "";
  if (!apiKey) throw new Error("SYNTH_API_KEY not set");
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
  return res.json() as Promise<T>;
}

async function liveProof(): Promise<LiveProof> {
  try {
    const [registry, ledger] = await Promise.all([
      cachedApi<{ platforms?: unknown[] }>("/v1/omni/platforms"),
      cachedApi<{ entries?: LedgerEntry[] }>(`/v1/ledger?limit=${LEDGER_WINDOW}`),
    ]);
    const platformCount = (registry.platforms ?? []).length;
    const entries = ledger.entries ?? [];
    return {
      // An empty registry is not a live proof — fall back to the honest
      // empty state rather than rendering "0 rulebooks enforced".
      live: platformCount > 0,
      platformCount,
      simRuns: entries.filter((e) => e.stage === "omni_sim").length,
      ledger: entries,
    };
  } catch (err) {
    console.warn("simulation liveProof unavailable:", err instanceof Error ? err.message : err);
    return { live: false, platformCount: 0, simRuns: 0, ledger: [] };
  }
}

export default async function FinanceLabPage() {
  const surface = getSiteCircuit("simulation");
  const proof = await liveProof();

  return (
    <>
      <StatusLine
        site="signals.bhenre.com"
        section="Simulation Lab"
        status={proof.live ? "Live metrics · simulation only" : "Phase B · simulation only"}
      />

      <Axis wide>
        <TitleCard
          eyebrow={surface?.eyebrow}
          title="Simulation Lab"
          marginalia="Paper trading · no live capital · no advice"
        >
          <p className="bh-title-card__copy">
            Published strategy reports from paper-trading simulations across prediction markets,
            sports DFS, and retail equities. Simulation only — no live capital, no trading advice.
          </p>
        </TitleCard>

        <ReturnGreeting ledger={proof.ledger} />

      <TeamStrip siteId="simulation" />

        <RuledSection label="Measured, not promised">
          {proof.live ? (
            <div className="bh-grid">
              <div className="bh-card">
                <div className="bh-card__title bh-mono">{proof.platformCount}</div>
                <p className="bh-card__body">
                  Platform rulebooks enforced on every simulated trade — measured live from{" "}
                  <code>/v1/omni/platforms</code> (RootMem registry).
                </p>
              </div>
              <div className="bh-card">
                <div className="bh-card__title bh-mono">{proof.simRuns}</div>
                <p className="bh-card__body">
                  Paper-simulation runs recorded in the last {LEDGER_WINDOW} Operations Ledger
                  entries for this workspace.
                </p>
              </div>
              <div className="bh-card">
                <div className="bh-card__title bh-mono">0</div>
                <p className="bh-card__body">
                  Published strategy reports — none have cleared review yet. The first
                  write-ups go to the waitlist.
                </p>
              </div>
            </div>
          ) : (
            <div className="bh-card">
              <div className="bh-card__title">No published reports yet</div>
              <p className="bh-card__body">
                No simulation batch has cleared review, and the metrics API is not reachable
                from this deploy — so there is no live number to show here. Measured run
                counts appear when the API is online; report write-ups go to the waitlist
                first.
              </p>
            </div>
          )}
          <Marginalia>
            Every figure on this page is measured or absent — no projections, no
            hypothetical returns.
          </Marginalia>
        </RuledSection>

        <RuledSection label="Get the strategy reports">
          <div className="bh-card bh-card--organic">
            <div className="bh-card__title">Waitlist</div>
            <p className="bh-card__body">
              When a simulation batch clears review, the write-up goes to the
              waitlist first: strategy, platform rules applied, and measured
              simulation results. Your email is stored for this list only — see the{" "}
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
                  What the simulation covers →
                </Link>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "var(--bh-space-3)" }}>
            <ExplorationTracker surfaces={SIM_SURFACES} currentId="home" />
          </div>
        </RuledSection>

        <CrossSellStrip siteId="simulation" />

        <RuledSection label="Internal operations">
          <details className="bh-card">
            <summary style={{ cursor: "pointer", fontWeight: 600 }}>
              Agent CLI (for the team, not required to use this site)
            </summary>
            <pre className="bh-card__body" style={{ overflow: "auto", fontSize: 13, marginTop: "var(--bh-space-2)" }}>
{`uv run python scripts/omni_simulate.py --platform kalshi
uv run python scripts/omni_loop.py --iterations 1
synth omni platforms
synth omni simulate kalshi --strategy baseline-momentum`}
            </pre>
          </details>
          <Marginalia>
            Simulation only. Phase C live trading is deferred under the v1 guardrail.
          </Marginalia>
        </RuledSection>
      </Axis>
    </>
  );
}
