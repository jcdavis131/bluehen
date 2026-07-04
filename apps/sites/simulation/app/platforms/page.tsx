import Link from "next/link";
import { PageHeader } from "@synthaembed/ui-fleet";
import { getSiteCircuit } from "@synthaembed/fleet";
import { loadPlatforms, loadResults } from "../../lib/data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Platform registry — Simulation Lab",
  description:
    "RootMem platform registry: execution rules, constraints, and root memory units for every simulated market platform. Simulation only.",
};

const CATEGORY_LABEL: Record<string, string> = {
  "prediction-market": "Prediction market",
  "sports-dfs": "Sports DFS",
  "retail-brokerage": "Retail brokerage",
};

export default function PlatformsPage() {
  const surface = getSiteCircuit("simulation");
  const platforms = loadPlatforms();
  const results = loadResults();

  return (
    <>
      <PageHeader
        eyebrow={surface?.eyebrow}
        title="Platform registry"
        lead="RootMem-style execution rules per platform: settlement mechanics, position caps, payout structures. Every simulated trade cites the rule ids it applied."
        badge={<span className="bh-badge bh-badge--warn">simulation only</span>}
      />

      {platforms.length === 0 ? (
        <div className="bh-card">
          <div className="bh-card__body">
            Platform registry not bundled in this deploy. Source:{" "}
            <code>config/market-platforms.json</code>.
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: "var(--bh-space-3)",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          }}
        >
          {platforms.map((p) => {
            const sim = results?.platforms?.[p.id];
            return (
              <div key={p.id} className="bh-card">
                <div className="bh-card__title">{p.name}</div>
                <div className="bh-card__body" style={{ color: "var(--bh-muted)" }}>
                  {CATEGORY_LABEL[p.category] ?? p.category} · {p.domain}
                </div>
                <div className="bh-card__body" style={{ marginTop: "var(--bh-space-2)" }}>
                  {p.rules.length} rules · {p.rootMemoryUnits.length} memory units
                  {sim && (
                    <>
                      {" "}
                      · last sim: {sim.tradeCount} trade{sim.tradeCount === 1 ? "" : "s"}
                    </>
                  )}
                </div>
                <Link
                  href={`/platforms/${p.id}`}
                  className="bh-link"
                  style={{ marginTop: "var(--bh-space-2)", display: "inline-block" }}
                >
                  Rules &amp; constraints →
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
