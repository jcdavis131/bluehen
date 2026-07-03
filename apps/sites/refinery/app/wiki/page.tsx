import Link from "next/link";
import { PageHeader } from "@synthaembed/ui-fleet";
import { getSiteCircuit } from "@synthaembed/fleet";

export const revalidate = 60;
export const metadata = { title: "Wiki" };

const API = process.env.SYNTH_API_BASE_URL ?? "https://api-production-3dea.up.railway.app";

const KIND_LABELS: Record<string, string> = {
  index: "Indexes",
  topic: "Topics",
  dataset: "Dataset pages",
  "link-map": "Link maps",
};

export default async function WikiListPage() {
  const surface = getSiteCircuit("refinery");
  let pages: { slug: string; kind: string; title: string; generatedBy: string; updatedAt: string }[] = [];
  let unreachable = false;
  try {
    const res = await fetch(`${API}/v1/wiki`, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error(String(res.status));
    pages = (await res.json()).pages ?? [];
  } catch {
    unreachable = true;
  }

  const kinds = [...new Set(pages.map((p) => p.kind))];

  return (
    <>
      <PageHeader
        eyebrow={surface?.eyebrow}
        title="The living wiki"
        lead="Structured knowledge auto-built from the catalog after every harvest: an index, topic pages, per-dataset pages with computed cross-links, and the link map. Model-refined sections are labeled; everything else is computed."
      />
      {unreachable && (
        <div className="bh-alert">
          Wiki unreachable — pages render when the production API responds
          (<code>GET /v1/wiki</code>).
        </div>
      )}
      {!unreachable && pages.length === 0 && (
        <div className="bh-alert">
          No wiki pages yet — the first rebuild runs at the next boot or via{" "}
          <code>POST /v1/admin/wiki/rebuild</code>.
        </div>
      )}
      {kinds.map((kind) => (
        <section key={kind} style={{ marginBottom: 24 }}>
          <h2 className="bh-card__title bh-card__title--lg" style={{ marginBottom: 10 }}>
            {KIND_LABELS[kind] ?? kind}
          </h2>
          <div className="bh-stack">
            {pages.filter((p) => p.kind === kind).map((p) => (
              <Link key={p.slug} href={`/wiki/${p.slug}`} className="bh-card" style={{ display: "block" }}>
                <p className="bh-card__title">{p.title}</p>
                <p className="bh-meta">
                  {p.generatedBy === "glm" ? "model-refined" : "deterministic"} ·{" "}
                  updated {new Date(p.updatedAt).toUTCString().slice(0, 22)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
