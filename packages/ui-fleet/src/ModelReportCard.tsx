/**
 * Spec 0027 §3 — Report Card: gates table w/ thresholds, metrics vs
 * baselines, lineage, honest empty states. Server-safe presentational
 * component (no fetching) — used by Launchpad step 3 verdict and the
 * arxiviq research-lab (UXR-004).
 */

export type ModelGate = {
  name: string;
  passed: boolean;
  value?: number;
  threshold?: number;
};

export type ModelBaseline = {
  name: string;
  metrics: Record<string, number>;
};

export type ModelReport = {
  version: string;
  deployed?: boolean;
  createdAt?: string;
  corpus?: string;
  recipeSummary?: string;
  metrics?: Record<string, number>;
  gates?: ModelGate[];
  baselines?: ModelBaseline[];
};

function fmtNum(n: number | undefined | null): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

function fmtDate(iso: string | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toUTCString().slice(0, 22);
}

export function ModelReportCard({ model }: { model: ModelReport }) {
  const gates = model.gates ?? [];
  const baselines = model.baselines ?? [];
  const metrics = model.metrics ?? {};

  const metricNames: string[] = [];
  for (const name of Object.keys(metrics)) metricNames.push(name);
  for (const b of baselines) {
    for (const name of Object.keys(b.metrics)) {
      if (!metricNames.includes(name)) metricNames.push(name);
    }
  }

  const hasFailedGate = gates.some((g) => !g.passed);
  const lineageParts: string[] = [];
  if (model.corpus) lineageParts.push(`Corpus ${model.corpus}`);
  if (model.recipeSummary) lineageParts.push(`Recipe ${model.recipeSummary}`);
  const trainedAt = fmtDate(model.createdAt);
  if (trainedAt) lineageParts.push(`Trained ${trainedAt}`);

  return (
    <section className="bh-card bh-card--flush">
      <div
        style={{
          padding: "16px 20px 12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <h2 className="bh-card__title bh-card__title--lg" style={{ margin: 0 }}>
          {model.version}
        </h2>
        {model.deployed && <span className="bh-badge bh-badge--ok">deployed</span>}
      </div>

      <p className="bh-card__body bh-meta" style={{ padding: "0 20px 16px" }}>
        {lineageParts.length > 0 ? lineageParts.join(" · ") : "No lineage recorded for this model."}
      </p>

      {/* Gates */}
      <h3
        className="bh-card__title"
        style={{ padding: "0 20px 8px", borderTop: "2px solid var(--bh-border)", paddingTop: 16 }}
      >
        Gates
      </h3>
      {gates.length === 0 ? (
        <p className="bh-card__body" style={{ padding: "0 20px 20px" }}>
          No gates recorded for this model.
        </p>
      ) : (
        <>
          <div className="bh-table-wrap" style={{ border: 0, borderRadius: 0 }}>
            <table className="bh-table">
              <tbody>
                <tr>
                  <th>Gate</th>
                  <th>Value</th>
                  <th>Threshold</th>
                  <th>Result</th>
                </tr>
                {gates.map((g) => (
                  <tr key={g.name}>
                    <td>{g.name}</td>
                    <td>{fmtNum(g.value)}</td>
                    <td>{fmtNum(g.threshold)}</td>
                    <td>
                      <span className={`bh-badge${g.passed ? " bh-badge--ok" : ""}`}>
                        {g.passed ? "PASS" : "FAIL"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hasFailedGate && (
            <p className="bh-card__body bh-meta" style={{ padding: "8px 20px 20px", fontStyle: "italic" }}>
              A failed gate means the platform refused to ship — working as designed.
            </p>
          )}
        </>
      )}

      {/* Metrics vs. baselines */}
      <h3
        className="bh-card__title"
        style={{ padding: "0 20px 8px", borderTop: "2px solid var(--bh-border)", paddingTop: 16 }}
      >
        Metrics vs. baselines
      </h3>
      {metricNames.length === 0 ? (
        <p className="bh-card__body" style={{ padding: "0 20px 20px" }}>
          No metrics recorded for this model.
        </p>
      ) : (
        <div className="bh-table-wrap" style={{ border: 0, borderRadius: 0 }}>
          <table className="bh-table">
            <tbody>
              <tr>
                <th>Metric</th>
                <th>{model.version}</th>
                {baselines.map((b) => (
                  <th key={b.name}>{b.name}</th>
                ))}
              </tr>
              {metricNames.map((name) => (
                <tr key={name}>
                  <td>{name}</td>
                  <td style={{ background: "var(--bh-accent-muted)", fontWeight: 600 }}>
                    {fmtNum(metrics[name])}
                  </td>
                  {baselines.map((b) => (
                    <td key={b.name}>{fmtNum(b.metrics[name])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
