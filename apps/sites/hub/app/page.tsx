import {
  CountUpStat,
  ExplorationTracker,
  fleetNavSites,
  InteractiveCircuit,
  MascotBeacon,
  MilestoneStrip,
  PageHeader,
  ProgressMeter,
  RaceFeed,
  ReturnGreeting,
  Reveal,
  siteHref,
  SiteSubnav,
  type ExplorationSurface,
  type LedgerEntry,
} from "@synthaembed/ui-fleet";
import {
  BRAND,
  getSiteCircuit,
  getSiteNav,
  GLOSSARY,
  RE,
  ledgerStageToDivision,
  getSite,
  listSites,
  LOOP_ORDER,
} from "@synthaembed/fleet";
import Link from "next/link";

const API = process.env.SYNTH_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const KEY = process.env.SYNTH_API_KEY ?? "";

// Deploy gates — Spec 0008, packages/eval-harness/eval_harness/gates.py
const GATE_BASELINE_RANK = 8.0;
const GATE_MIN_NDCG10 = 0.35;

// Exploration tracker scope: bhenre.com surfaces only (localStorage is
// per-origin — claiming cross-site visits would be dishonest).
const HUB_SURFACES: ExplorationSurface[] = [
  { id: "home", label: "Operating Loop", href: "/" },
  { id: "try", label: "Live Search", href: "/try" },
  { id: "research", label: "Experiment Museum", href: "/research" },
  { id: "pricing", label: "Pricing", href: "/pricing" },
  { id: "store", label: "Store", href: "/store" },
];

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
    apiGet("/v1/ledger?limit=30"),
    apiGet("/v1/models"),
  ]);
  const ledger: LedgerEntry[] = ledgerData?.entries ?? [];
  const latestStage = ledger.length ? String(ledger[0]?.stage ?? "") : null;
  const models = modelsData?.models ?? [];
  const deployed = models.find((m: { deployed?: boolean }) => m.deployed);
  const local = process.env.NEXT_PUBLIC_FLEET_LOCAL === "1";
  const sites = fleetNavSites("hub");
  const circuit = getSiteCircuit("hub");
  const nav = getSiteNav("hub");

  // Mascot looks toward the active division's position in the loop.
  const activeDivision = latestStage ? ledgerStageToDivision(latestStage) : null;
  const activeIdx = activeDivision ? LOOP_ORDER.indexOf(activeDivision) : -1;
  const gaze = activeIdx >= 0 ? (activeIdx / (LOOP_ORDER.length - 1)) * 2 - 1 : 0;

  const remaining = typeof budget?.remainingUsd === "number" ? budget.remainingUsd : null;
  const ceiling = typeof budget?.ceilingUsd === "number" ? budget.ceilingUsd : null;
  const spent = remaining !== null && ceiling !== null ? ceiling - remaining : null;
  const rank = typeof deployed?.effectiveRank === "number" ? deployed.effectiveRank : null;
  const ndcg = typeof deployed?.ndcg10 === "number" ? deployed.ndcg10 : null;

  return (
    <>
      <PageHeader
        eyebrow={circuit?.eyebrow}
        title={BRAND.name}
        lead={
          <>
            {RE.relay} coordinates your organization · {RE.tech} in production. {BRAND.tagline}{" "}
            <Link href="/try">Try live search</Link>,{" "}
            <Link href="/pricing">see pricing</Link>, or{" "}
            <Link href="/contact">start a briefing</Link>.
          </>
        }
        badge={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            <MascotBeacon size={36} restingGaze={gaze} />
            <span className={`bh-badge ${health ? "bh-badge--ok" : "bh-badge--warn"}`}>
              {health ? "API online" : "API offline"}
            </span>
          </span>
        }
      />

      <SiteSubnav items={nav} currentPath="/" />

      <ReturnGreeting ledger={ledger} />

      <div
        style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 24 }}
      >
        <Link href="/try" className="bh-btn bh-btn--primary bh-btn--hero">
          Try live search
        </Link>
        <Link href="/pricing" className="bh-btn bh-btn--ghost">
          Pricing
        </Link>
        <Link href="/contact" className="bh-btn bh-btn--ghost">
          Start a briefing
        </Link>
        <span className="bh-live" style={{ marginLeft: "auto" }}>
          <span className="bh-kbd">⌘K</span> jump anywhere
        </span>
      </div>

      <ExplorationTracker surfaces={HUB_SURFACES} currentId="home" />

      <div className="fleet-grid" style={{ margin: "20px 0" }}>
        <Reveal index={0}>
          <StatCard label="core-api" value={health ? "Online" : "Offline"} meta={API} />
        </Reveal>
        <Reveal index={1}>
        <StatCard
          label={GLOSSARY.budget}
          value={
            remaining !== null ? (
              <>
                <CountUpStat value={remaining} digits={2} prefix="$" /> left
              </>
            ) : (
              "—"
            )
          }
          meta={
            spent !== null && ceiling !== null ? (
              <ProgressMeter
                label="burn-down"
                value={spent}
                max={ceiling}
                target={ceiling}
                targetLabel="ceiling"
                direction="lower-better"
                tone="clay"
                digits={2}
                prefix="$"
              />
            ) : (
              `ceiling $${ceiling ?? "—"}`
            )
          }
        />
        </Reveal>
        <Reveal index={2}>
        <StatCard
          label={GLOSSARY.deployedModel}
          value={deployed?.version ?? "—"}
          meta={
            rank !== null || ndcg !== null ? (
              <span className="bh-stack" style={{ gap: 8 }}>
                {rank !== null && (
                  <ProgressMeter
                    label="effective rank"
                    value={rank}
                    max={Math.max(rank, GATE_BASELINE_RANK) * 1.5}
                    target={GATE_BASELINE_RANK}
                    targetLabel="gate"
                    tone="accent"
                    digits={1}
                  />
                )}
                {ndcg !== null && (
                  <ProgressMeter
                    label="nDCG@10"
                    value={ndcg}
                    max={1}
                    target={GATE_MIN_NDCG10}
                    targetLabel="gate"
                    tone="moss"
                    digits={3}
                  />
                )}
              </span>
            ) : (
              "no deployed model yet"
            )
          }
        />
        </Reveal>
        <Reveal index={3}>
        <StatCard
          label={GLOSSARY.fleet}
          value={
            <>
              <CountUpStat value={listSites({ status: "active" }).length} /> active
            </>
          }
          meta={<a href={siteHref(getSite("control")!, local)}>Open Operations Center →</a>}
        />
        </Reveal>
      </div>

      <MilestoneStrip ledger={ledger} models={models} />

      <div style={{ marginTop: 20 }}>
        <InteractiveCircuit initialLedger={ledger} />
      </div>

      <h2 className="bh-section-title">Product surfaces</h2>
      <div className="fleet-grid" style={{ marginBottom: 32 }}>
        {sites.map((s, i) => {
          const stop = getSiteCircuit(s.id);
          return (
            <Reveal key={s.id} index={i}>
              <a
                href={siteHref(s, local)}
                className="fleet-card"
                style={{ textDecoration: "none", color: "inherit", display: "block" }}
              >
                <div style={{ fontWeight: 600 }}>{stop?.stop ?? s.name}</div>
                <div className="bh-muted" style={{ fontSize: "0.8125rem", marginTop: 4 }}>
                  {s.domain}
                </div>
              </a>
            </Reveal>
          );
        })}
      </div>

      <h2 className="bh-section-title" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {GLOSSARY.raceLog}
        <span className="bh-live">
          <span className="bh-live__dot" aria-hidden /> live
        </span>
      </h2>
      <div className="fleet-card" style={{ padding: 0, overflow: "hidden" }}>
        <RaceFeed initial={ledger} />
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
  value: React.ReactNode;
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
