import Link from "next/link";
import { BENCHMARK_EXAMS, RAG_TIERS, hallOfCone } from "@synthaembed/eval-public";
import {
  Axis,
  AssetStrip,
  Marginalia,
  ProgressMeter,
  RuledSection,
  StatusLine,
  TitleCard,
  TeamStrip,
} from "@synthaembed/ui-fleet";
import { siteModels } from "@synthaembed/ui-fleet/site-api";
import { getSiteCircuit, GLOSSARY, RE } from "@synthaembed/fleet";

export const metadata = {
  title: "The Proving Grounds — slasso.com",
  description:
    "Walk the lab: the Overworld, the Verdict, and certified RAG benchmarks · Silver Lasso lineage",
};

const PROVING_GROUNDS = [
  {
    href: "/overworld",
    tag: "The world",
    title: "The Overworld",
    body: "Walk six real districts — a tile world built from the same engine the fleet runs on. Nothing staged.",
  },
  {
    href: "/verdict",
    tag: "The judge",
    title: "The Verdict",
    body: "Judge a query against two retrieved passages, rapid-fire. The engine's live ranking is revealed after your call.",
  },
  {
    href: "/certify",
    tag: "The bench",
    title: "Get Certified",
    body: "The serious bench underneath the games: a paid, reproducible benchmark run with a published, linkable scorecard.",
  },
];

type LiveModel = {
  version: string;
  effectiveRank: number | null;
  ndcg10: number | null;
  deployed: boolean;
  truncateDims?: number | null;
  quant?: string | null;
};

async function liveLeaderboard(): Promise<{ models: LiveModel[]; live: boolean }> {
  try {
    const data = (await siteModels()) as { models?: LiveModel[] };
    const models = (data.models ?? []).filter(
      (m) => m.effectiveRank != null || m.ndcg10 != null,
    );
    return { models, live: models.length > 0 };
  } catch {
    return { models: [], live: false };
  }
}

export default async function BenchmarkHome() {
  const fixtureBoard = hallOfCone().slice(0, 5);
  const { models: liveModels, live } = await liveLeaderboard();
  const surface = getSiteCircuit("validation");

  return (
    <>
      <StatusLine
        site="slasso.com"
        section="Validation Lab"
        status={live ? "Live leaderboard" : "Reference fixtures"}
      />

      <Axis wide>
        <TitleCard
          eyebrow={surface?.eyebrow}
          title="The Proving Grounds"
          marginalia={`Certification · ${RE.tech} harness`}
        >
          <p className="bh-title-card__copy">
            A lab you can walk through: the Overworld is the world, the Verdict is the judge, and
            certification is the serious bench underneath both. Evidence-backed, same harness that
            gates our own deploys. <Link href="/certify">How certification works →</Link>
          </p>
        </TitleCard>

      <TeamStrip siteId="validation" />

        <RuledSection label="Walk the lab">
          <div className="bh-grid" style={{ marginBottom: "var(--bh-space-6)" }}>
            {PROVING_GROUNDS.map((g) => (
              <Link
                key={g.href}
                href={g.href}
                className="bh-card"
                style={{ display: "block", textDecoration: "none", color: "inherit" }}
              >
                <div className="bh-meta">{g.tag}</div>
                <div className="bh-card__title" style={{ marginTop: "var(--bh-space-1)" }}>
                  {g.title}
                </div>
                <p className="bh-card__body" style={{ marginTop: "var(--bh-space-2)" }}>
                  {g.body}
                </p>
              </Link>
            ))}
          </div>
        </RuledSection>

        <RuledSection label="Evaluation tiers">
          <div className="bh-grid" style={{ marginBottom: "var(--bh-space-8)" }}>
            {RAG_TIERS.map((t) => (
              <div key={t.id} className="bh-card">
                <div className="bh-card__title">{t.label}</div>
                <p className="bh-card__body" style={{ marginTop: "var(--bh-space-2)" }}>
                  {t.desc}
                </p>
              </div>
            ))}
          </div>
        </RuledSection>

        <RuledSection label="Benchmark suite">
          <div className="bh-table-wrap" style={{ marginBottom: "var(--bh-space-8)" }}>
            <table className="bh-table">
              <thead>
                <tr>
                  <th>Exam</th>
                  <th>Tier</th>
                  <th>nDCG@10</th>
                </tr>
              </thead>
              <tbody>
                {BENCHMARK_EXAMS.map((e) => (
                  <tr key={e.id}>
                    <td>{e.title}</td>
                    <td>{e.tier}</td>
                    <td className="bh-mono">{e.lastRunNdcg?.toFixed(2) ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </RuledSection>

        <RuledSection
          label={
            live
              ? "Reference leaderboard · live"
              : "Reference leaderboard · fixtures"
          }
        >
          <p className="bh-meta" style={{ marginBottom: "var(--bh-space-4)" }}>
            {live
              ? "Measured model versions from this workspace via /v1/models. The same rows the worker records during training."
              : "Reference fixtures from the eval-public panel. Live per-workspace metrics appear here once a model is trained and the API is reachable (SYNTH_API_KEY set)."}
          </p>
          <div className="bh-grid" style={{ marginBottom: "var(--bh-space-6)" }}>
            {live
              ? liveModels
                  .slice()
                  .sort((a, b) => (b.effectiveRank ?? 0) - (a.effectiveRank ?? 0))
                  .slice(0, 5)
                  .map((m, i) => (
                    <div key={m.version} className="bh-card">
                      <div className="bh-card__title">
                        {i === 0 ? "Top · " : ""}
                        <code>{m.version}</code>
                        {m.deployed && (
                          <span className="bh-badge bh-badge--ok" style={{ marginLeft: 8 }}>
                            deployed
                          </span>
                        )}
                      </div>
                      <div className="bh-meta" style={{ marginTop: "var(--bh-space-1)" }}>
                        erank {(m.effectiveRank ?? 0).toFixed(1)}
                        {m.truncateDims ? ` · trunc ${m.truncateDims}` : ""}
                        {m.quant ? ` · ${m.quant}` : ""}
                      </div>
                      {m.ndcg10 != null && (
                        <div style={{ marginTop: "var(--bh-space-2)" }}>
                          <ProgressMeter
                            label="nDCG@10 (live)"
                            value={m.ndcg10}
                            max={1}
                            target={0.35}
                            targetLabel="deploy gate"
                            tone="moss"
                            digits={2}
                          />
                        </div>
                      )}
                    </div>
                  ))
              : fixtureBoard.map((m, i) => (
                  <div key={m.id} className="bh-card">
                    <div className="bh-card__title">
                      {i === 0 ? "Top · " : ""}
                      {m.name}
                    </div>
                    <div className="bh-meta" style={{ marginTop: "var(--bh-space-1)" }}>
                      erank {m.effectiveRank.toFixed(1)}
                    </div>
                    <div style={{ marginTop: "var(--bh-space-2)" }}>
                      <ProgressMeter
                        label="nDCG@10 (reference data)"
                        value={m.ndcg10}
                        max={1}
                        target={0.35}
                        targetLabel="deploy gate"
                        tone="clay"
                        digits={2}
                      />
                    </div>
                  </div>
                ))}
          </div>
          <Marginalia>
            {GLOSSARY.deployedModel} rows are the same evidence the worker records. Measured gates, not marketing claims.
          </Marginalia>
          <Marginalia>
            Every game feeds the engine that trains the models —{" "}
            <Link href="https://bhenre.com">bhenre.com</Link> runs the business side.
          </Marginalia>
          <Link href="https://dumbmodel.com">Baseline comparison on dumbmodel.com →</Link>
        </RuledSection>

        <AssetStrip />
      </Axis>
    </>
  );
}
