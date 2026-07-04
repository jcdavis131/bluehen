import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@synthaembed/ui-fleet";
import { getSiteCircuit } from "@synthaembed/fleet";
import { loadPlatforms, loadResults } from "../../../lib/data";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params) {
  const { id } = await params;
  const platform = loadPlatforms().find((p) => p.id === id);
  if (!platform) return { title: "Platform — Simulation Lab" };
  return {
    title: `${platform.name} — Platform registry`,
    description: `Execution rules and constraints for ${platform.name} paper simulation. Simulation only; no live capital.`,
  };
}

export default async function PlatformDetailPage({ params }: Params) {
  const { id } = await params;
  const surface = getSiteCircuit("simulation");
  const platform = loadPlatforms().find((p) => p.id === id);
  if (!platform) notFound();

  const sim = loadResults()?.platforms?.[platform.id];

  return (
    <>
      <PageHeader
        eyebrow={surface?.eyebrow}
        title={platform.name}
        lead={`${platform.domain} · every simulated trade on this platform cites the rule ids below.`}
        badge={<span className="bh-badge bh-badge--warn">simulation only</span>}
      />

      <div className="bh-card">
        <div className="bh-card__title">Execution rules</div>
        <ul className="bh-card__body" style={{ paddingLeft: "1.2em", margin: 0 }}>
          {platform.rules.map((r) => (
            <li key={r} style={{ marginBottom: "var(--bh-space-1)" }}>
              {r}
            </li>
          ))}
        </ul>
      </div>

      <div className="bh-card" style={{ marginTop: "var(--bh-space-3)" }}>
        <div className="bh-card__title">Execution constraints</div>
        <table className="bh-table">
          <tbody>
            {Object.entries(platform.executionConstraints).map(([k, v]) => (
              <tr key={k}>
                <td style={{ color: "var(--bh-muted)" }}>{k}</td>
                <td>
                  <code>{String(v)}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bh-card" style={{ marginTop: "var(--bh-space-3)" }}>
        <div className="bh-card__title">Root memory units</div>
        {platform.rootMemoryUnits.map((u) => (
          <div key={u.id} style={{ marginBottom: "var(--bh-space-3)" }}>
            <div className="bh-card__subtitle">
              <code>{u.id}</code>
            </div>
            <p className="bh-card__body" style={{ margin: 0 }}>
              {u.rules}
            </p>
            <p className="bh-card__body" style={{ margin: 0, color: "var(--bh-muted)" }}>
              Evidence: {u.evidence}
            </p>
          </div>
        ))}
      </div>

      {sim && (
        <div className="bh-card" style={{ marginTop: "var(--bh-space-3)" }}>
          <div className="bh-card__title">Latest fixture simulation</div>
          <p className="bh-card__body">
            {sim.tradeCount} paper trade{sim.tradeCount === 1 ? "" : "s"} · Sharpe (fictional){" "}
            {sim.sharpe.toFixed(2)} · rules applied:{" "}
            {sim.platformRulesApplied.map((r) => (
              <code key={r} style={{ marginRight: "0.4em" }}>
                {r}
              </code>
            ))}
          </p>
          <Link href={`/simulate/${platform.id}`} className="bh-link">
            Full simulation detail →
          </Link>
        </div>
      )}

      <div style={{ marginTop: "var(--bh-space-5)" }}>
        <Link href="/platforms" className="bh-card__subtitle">
          ← Back to registry
        </Link>
      </div>
    </>
  );
}
