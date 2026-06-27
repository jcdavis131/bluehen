/**
 * Mini-org dashboard — surfaces the model lifecycle and the unified trace/ledger.
 *
 * Server component: reads through the same core-api the agents and `synth` CLI use, so what
 * you see here is exactly what the synthetic organization is doing. Bind a workspace by
 * setting SYNTH_API_BASE_URL + SYNTH_API_KEY in the deployment's env.
 */
const API = process.env.SYNTH_API_BASE_URL ?? "http://localhost:8000";
const KEY = process.env.SYNTH_API_KEY ?? "";

const STAGES = [
  { id: "collect", title: "1 · Collect", agent: "Data Harvester", desc: "Ingest → LMAR chunk → synthesize pairs" },
  { id: "train", title: "2 · Train / Validate", agent: "Training Orchestrator", desc: "ASN contrastive fine-tuning on Modal" },
  { id: "applied", title: "3 · Applied Test", agent: "QA Benchmark", desc: "Rotating-slice eval → gates → promote" },
  { id: "deploy", title: "4 · Real-World Use", agent: "Field Operator", desc: "Matryoshka + quant → serve → drift watch" },
];

async function getLedger() {
  try {
    const res = await fetch(`${API}/v1/ledger?limit=10`, {
      headers: { authorization: `Bearer ${KEY}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    return (await res.json())?.entries ?? [];
  } catch {
    return [];
  }
}

export default async function Page() {
  const ledger = await getLedger();
  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "40px 24px" }}>
      <h1 style={{ fontSize: 28, marginBottom: 4 }}>SynthaEmbed · Mini-Org</h1>
      <p style={{ opacity: 0.7, marginTop: 0 }}>
        Autonomous embedding organization — ASN engine, fully traced lifecycle.
      </p>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12, marginTop: 28 }}>
        {STAGES.map((s) => (
          <div key={s.id} style={{ border: "1px solid #232733", borderRadius: 12, padding: 16, background: "#11141b" }}>
            <div style={{ fontWeight: 600 }}>{s.title}</div>
            <div style={{ fontSize: 12, opacity: 0.6, margin: "4px 0 8px" }}>{s.agent}</div>
            <div style={{ fontSize: 13, opacity: 0.85 }}>{s.desc}</div>
          </div>
        ))}
      </section>

      <h2 style={{ fontSize: 18, marginTop: 36 }}>Experiment ledger</h2>
      <div style={{ border: "1px solid #232733", borderRadius: 12, overflow: "hidden" }}>
        {ledger.length === 0 ? (
          <div style={{ padding: 16, opacity: 0.6, fontSize: 13 }}>
            No entries yet (core-api not running, or no runs recorded). Start one:
            <code style={{ display: "block", marginTop: 8 }}>synth train launch recipe.json</code>
          </div>
        ) : (
          ledger.map((e: any, i: number) => (
            <div key={i} style={{ padding: "10px 16px", borderTop: i ? "1px solid #1b1f29" : "none", fontSize: 13, fontFamily: "ui-monospace" }}>
              <span style={{ opacity: 0.6 }}>{e.stage}</span> · {e.modelVersion ?? "—"} ·{" "}
              {e.metricDelta ? JSON.stringify(e.metricDelta) : ""} {e.traceId ? `· trace ${e.traceId}` : ""}
            </div>
          ))
        )}
      </div>

      <p style={{ fontSize: 12, opacity: 0.5, marginTop: 24 }}>
        Every tile, agent action, and ledger row resolves through the same core-api chokepoint
        and shares one trace id — use <code>synth trace view &lt;id&gt;</code> to replay an objective.
      </p>
    </main>
  );
}
