import {
  ClosedLoopDiagram,
  fleetNavSites,
  PageHeader,
  siteHref,
  SiteSubnav,
} from "@synthaembed/ui-fleet";
import {
  BRAND,
  getSiteCircuit,
  getSiteNav,
  GLOSSARY,
  RE,
  stageLabel,
  getSite,
  listSites,
} from "@synthaembed/fleet";
import Link from "next/link";

const API = process.env.SYNTH_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const KEY = process.env.SYNTH_API_KEY ?? "";

async function apiGet(path: string) {
  try {
    const res = await fetch(`${API}${path}`, {
      headers: { authorization: `Bearer ${KEY}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function HubPage() {
  const [health, budget, ledgerData, modelsData] = await Promise.all([
    apiGet("/healthz"),
    apiGet("/v1/budget"),
    apiGet("/v1/ledger?limit=10"),
    apiGet("/v1/models"),
  ]);
  const ledger = ledgerData?.entries ?? [];
  const latestStage = ledger.length ? String(ledger[0]?.stage ?? "") : null;
  const deployed = (modelsData?.models ?? []).find((m: { deployed?: boolean }) => m.deployed);
  const local = process.env.NEXT_PUBLIC_FLEET_LOCAL === "1";
  const sites = fleetNavSites("hub");
  const circuit = getSiteCircuit("hub");
  const nav = getSiteNav("hub");

  return (
    <>
      <PageHeader
        eyebrow={circuit?.eyebrow}
        title={BRAND.name}
        lead={
          <>
            {RE.relay} coordinates your organization · {RE.tech} in production. {BRAND.tagline}{" "}
            <Link href="/try">Try live search</Link> or{" "}
            <Link href="/feedback">submit feedback</Link>.
          </>
        }
        badge={
          <span className={`bh-badge ${health ? "bh-badge--ok" : "bh-badge--warn"}`}>
            {health ? "API online" : "API offline"}
          </span>
        }
      />

      <SiteSubnav items={nav} currentPath="/" />

      <div className="fleet-grid" style={{ marginBottom: 28 }}>
        <StatCard label="core-api" value={health ? "Online" : "Offline"} meta={API} />
        <StatCard
          label={GLOSSARY.budget}
          value={budget ? `$${budget.remainingUsd?.toFixed(2) ?? "—"} left` : "—"}
          meta={`ceiling $${budget?.ceilingUsd ?? 50}`}
        />
        <StatCard
          label={GLOSSARY.deployedModel}
          value={deployed?.version ?? "—"}
          meta={`rank ${deployed?.effectiveRank ?? "—"} · nDCG ${deployed?.ndcg10 ?? "—"}`}
        />
        <StatCard
          label={GLOSSARY.fleet}
          value={`${listSites({ status: "active" }).length} active`}
          meta={<a href={siteHref(getSite("control")!, local)}>Open Operations Center →</a>}
        />
      </div>

      <ClosedLoopDiagram activeLedgerStage={latestStage} />

      <h2 className="bh-section-title">Product surfaces</h2>
      <div className="fleet-grid" style={{ marginBottom: 32 }}>
        {sites.map((s) => {
          const stop = getSiteCircuit(s.id);
          return (
            <a
              key={s.id}
              href={siteHref(s, local)}
              className="fleet-card"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div style={{ fontWeight: 600 }}>{stop?.stop ?? s.name}</div>
              <div className="bh-muted" style={{ fontSize: "0.8125rem", marginTop: 4 }}>
                {s.domain}
              </div>
            </a>
          );
        })}
      </div>

      <h2 className="bh-section-title">{GLOSSARY.raceLog}</h2>
      <div className="fleet-card" style={{ padding: 0, overflow: "hidden" }}>
        {ledger.length === 0 ? (
          <div className="bh-muted" style={{ padding: 16, fontSize: "0.8125rem" }}>
            No entries yet. Start core-api and run: <code>synth budget</code>
          </div>
        ) : (
          ledger.map((e: Record<string, unknown>, i: number) => (
            <div
              key={i}
              className="bh-mono"
              style={{
                padding: "10px 16px",
                borderTop: i ? "1px solid var(--bh-border)" : "none",
                fontSize: "0.8125rem",
              }}
            >
              {stageLabel(String(e.stage ?? "—"))} · {String(e.notes ?? e.modelVersion ?? "")}
            </div>
          ))
        )}
      </div>
    </>
  );
}

function StatCard({
  label,
  value,
  meta,
}: {
  label: string;
  value: string;
  meta?: React.ReactNode;
}) {
  return (
    <div className="fleet-card">
      <div className="bh-label" style={{ marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontWeight: 600, fontSize: "1rem" }}>{value}</div>
      {meta && (
        <div className="bh-muted" style={{ fontSize: "0.75rem", marginTop: 6 }}>
          {meta}
        </div>
      )}
    </div>
  );
}
