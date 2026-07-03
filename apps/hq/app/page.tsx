import { listSites, devCommand, getSiteCircuit, BRAND, RE, GLOSSARY } from "@synthaembed/fleet";
import {
  Axis,
  InteractiveCircuit,
  Marginalia,
  MilestoneStrip,
  RaceFeed,
  RuledSection,
  StatusLine,
  TitleCard,
  siteHref,
  type LedgerEntry,
} from "@synthaembed/ui-fleet";
import Link from "next/link";

const API = process.env.SYNTH_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const ADMIN = process.env.API_SECRET_KEY ?? process.env.SYNTH_ADMIN_KEY ?? "";
const KEY = process.env.SYNTH_API_KEY ?? "";

async function getLoopData(): Promise<{ ledger: LedgerEntry[]; models: { version?: string; deployed?: boolean }[] }> {
  const get = async (path: string) => {
    try {
      const res = await fetch(`${API}${path}`, {
        headers: { authorization: `Bearer ${KEY}` },
        cache: "no-store",
      });
      return res.ok ? res.json() : null;
    } catch {
      return null;
    }
  };
  const [ledgerData, modelsData] = await Promise.all([get("/v1/ledger?limit=30"), get("/v1/models")]);
  return { ledger: ledgerData?.entries ?? [], models: modelsData?.models ?? [] };
}

async function getHealth() {
  try {
    const res = await fetch(`${API}/healthz`, { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

async function getFleetStatus() {
  if (!ADMIN) return null;
  try {
    const res = await fetch(`${API}/v1/admin/fleet`, {
      headers: { authorization: `Bearer ${ADMIN}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export const metadata = {
  title: "Headquarters — Blue Hen RE",
  description: "The org hub — fleet directory, live operating loop, lifecycle controls · jcamd.com",
};

export default async function HqPage() {
  const surface = getSiteCircuit("hq");
  const sites = listSites().filter((s) => s.role !== "fleet-agent");
  const [online, fleet, loop] = await Promise.all([getHealth(), getFleetStatus(), getLoopData()]);
  const local = process.env.NEXT_PUBLIC_FLEET_LOCAL === "1";
  const orgBySite = new Map((fleet?.orgs ?? []).map((o: Record<string, unknown>) => [o.siteId, o]));

  return (
    <>
      <StatusLine
        site="jcamd.com"
        section="Headquarters"
        status={online ? "API online" : "API offline"}
      />

      <Axis wide>
        <TitleCard
          eyebrow={surface?.eyebrow}
          title={surface?.stop ?? "Headquarters"}
          marginalia={`${BRAND.operatingLoop} · fleet control`}
        >
          <p className="bh-title-card__copy">
            The org hub — every venture, one {BRAND.operatingLoop}.{" "}
            <Link href="/actions">Lifecycle controls →</Link>
          </p>
        </TitleCard>

        <RuledSection label="Operating state">
          <div className="bh-grid" style={{ marginBottom: "var(--bh-space-8)" }}>
            <div className="bh-card">
              <div className="bh-label">core-api</div>
              <div className={`bh-stat ${online ? "bh-stat--ok" : "bh-stat--danger"}`}>
                {online ? "Online" : "Offline — run uvicorn"}
              </div>
            </div>
            <div className="bh-card">
              <div className="bh-label">Active tenants</div>
              <div className="bh-stat">
                {fleet ? `${fleet.count} workspaces` : ADMIN ? "—" : "Set API_SECRET_KEY"}
              </div>
            </div>
            <div className="bh-card">
              <div className="bh-label">Pair-program</div>
              <code style={{ fontSize: "0.68rem" }}>synth fleet context</code>
            </div>
          </div>
          <MilestoneStrip ledger={loop.ledger} models={loop.models} />
        </RuledSection>

        <RuledSection label="Live circuit">
          <div style={{ margin: "20px 0" }}>
            <InteractiveCircuit initialLedger={loop.ledger} />
          </div>
        </RuledSection>

        <RuledSection label={GLOSSARY.raceLog}>
          <div className="bh-card bh-card--flush" style={{ marginBottom: "var(--bh-space-8)", padding: 0, overflow: "hidden" }}>
            <RaceFeed initial={loop.ledger} />
          </div>
        </RuledSection>

        {fleet && (
          <RuledSection label="Fleet status">
            <div className="bh-card bh-card--flush" style={{ marginBottom: "var(--bh-space-8)" }}>
              {(fleet.orgs as Record<string, unknown>[]).map((org) => {
                const job = org.latestJob as Record<string, unknown> | undefined;
                const model = org.latestModel as Record<string, unknown> | undefined;
                return (
                  <div key={String(org.siteId)} className="bh-row-list">
                    <div className="bh-card__title">{String(org.name)}</div>
                    <div className="bh-card__body" style={{ marginTop: "var(--bh-space-1)" }}>
                      job: {String(job?.status ?? "—")} · model: {String(model?.version ?? "—")} · deployed:{" "}
                      {String(org.deployedModel ?? "—")} · chunks: {String(org.indexedChunks ?? 0)}
                    </div>
                    <div className="bh-meta" style={{ marginTop: "var(--bh-space-1)" }}>
                      rank {String(model?.effectiveRank ?? "—")} · nDCG {String(model?.ndcg10 ?? "—")} · budget $
                      {Number(org.budgetRemaining ?? 0).toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
          </RuledSection>
        )}

        <RuledSection label="Product surfaces">
          <div className="bh-grid">
            {sites.map((site) => {
              const live = orgBySite.get(site.id) as Record<string, unknown> | undefined;
              const deployed = live?.deployedModel as string | undefined;
              const stop = getSiteCircuit(site.id);
              return (
                <article key={site.id} className="bh-card bh-card--column">
                  <div className="bh-card__row">
                    <h3 className="bh-card__title bh-card__title--lg">{stop?.stop ?? site.name}</h3>
                    <span className={`bh-badge ${site.status === "active" ? "bh-badge--ok" : "bh-badge--warn"}`}>
                      {site.status}
                    </span>
                  </div>
                  <p className="bh-card__body">{site.description}</p>
                  {deployed && (
                    <div className="bh-card__subtitle">
                      {GLOSSARY.deployedModel}: {deployed}
                    </div>
                  )}
                  <div className="bh-meta">{site.appPath}</div>
                  {site.domain && (
                    <Link href={siteHref(site, local)} className="bh-card__subtitle">
                      Open {site.domain} →
                    </Link>
                  )}
                  {devCommand(site) && <code className="bh-meta">{devCommand(site)}</code>}
                </article>
              );
            })}
          </div>
          <Marginalia>
            One organization, one {BRAND.operatingLoop.toLowerCase()} — every surface feeds the same lifecycle.
          </Marginalia>
        </RuledSection>
      </Axis>
    </>
  );
}
