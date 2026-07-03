import { siteModels } from "@synthaembed/ui-fleet/site-api";

/** Production case study (goal: close the prod retrieval loop).
 *
 * Every number here is read live from the production API or cited from a
 * dated EVIDENCE.md row. Absent numbers render an honest empty state with
 * the command that produces them — never a placeholder value. */

type ModelRow = {
  version: string;
  effectiveRank: number | null;
  ndcg10: number | null;
  deployed: boolean;
  truncateDims: number | null;
  quant: string | null;
};

// Measured locally on the same 200-pair prod collection with the same
// metric code as the prod eval (scripts/baseline_retrieval_eval.py).
const BASELINES = [
  { model: "BAAI/bge-small-en-v1.5", ndcg10: 0.9193, effectiveRank: 22.83 },
  { model: "all-MiniLM-L6-v2 (raw)", ndcg10: 0.8847, effectiveRank: 25.97 },
];

export async function ProductionCaseStudy() {
  let models: ModelRow[] = [];
  let apiError = false;
  try {
    const out = (await siteModels()) as { models?: ModelRow[] };
    models = out.models ?? [];
  } catch {
    apiError = true;
  }
  const deployed = models.find((m) => m.deployed);

  return (
    <section className="bh-card bh-card--organic" style={{ marginTop: 24 }}>
      <h2 className="bh-card__title bh-card__title--lg">
        Case study: production training inside a 1 GB container
      </h2>
      <p className="bh-card__body">
        This site&apos;s serving model is trained <em>in production</em> on the
        platform&apos;s own lifecycle: corpus → pair synthesis → head-only
        training (frozen backbone, features extracted once) → evaluation gates
        on the served representation → charter → deploy. The trained artifact
        is a ~3&nbsp;MB projection head stored in Postgres; the backbone loads
        from the baked HuggingFace cache at serve time, with no GPU, no shared
        filesystem, and no plan upgrade.
      </p>

      {deployed ? (
        <div className="bh-table-wrap" style={{ marginTop: 14 }}>
          <table className="bh-table">
            <tbody>
              <tr>
                <th>Model</th>
                <th>nDCG@10</th>
                <th>Effective rank</th>
                <th>Provenance</th>
              </tr>
              <tr>
                <td>
                  <code>{deployed.version}</code> (deployed)
                </td>
                <td>{deployed.ndcg10 ?? "—"}</td>
                <td>{deployed.effectiveRank?.toFixed(2) ?? "—"}</td>
                <td>prod eval, gate slice</td>
              </tr>
              {BASELINES.map((b) => (
                <tr key={b.model}>
                  <td>{b.model}</td>
                  <td>{b.ndcg10}</td>
                  <td>{b.effectiveRank}</td>
                  <td>local, same pairs + metric code</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bh-alert" style={{ marginTop: 14 }}>
          {apiError ? (
            <>Production API unreachable from this build. Metrics render when{" "}
            <code>SYNTH_API_KEY</code> is configured.</>
          ) : (
            <>No deployed model yet for this tenant. The lifecycle produces one
            end-to-end: <code>POST /v1/admin/hill-climb {"{"}&quot;siteId&quot;:
            &quot;research&quot;{"}"}</code>. Metrics appear here the moment the
            worker&apos;s eval gates pass and the charter deploys it.</>
          )}
        </div>
      )}

      <p className="bh-muted" style={{ fontSize: "0.8125rem", marginTop: 12 }}>
        Method notes: no ASN weight surgery on this path (rejected 0/4 in fleet
        evidence); gates grade the representation that actually serves; baseline
        numbers were measured on the identical pair set and metric code
        (provenance differs by host and is labeled). Full row: EVIDENCE.md §
        production head-only split.
      </p>
    </section>
  );
}
