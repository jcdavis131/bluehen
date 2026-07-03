import Link from "next/link";
import { PageHeader } from "@synthaembed/ui-fleet";
import { getSiteCircuit } from "@synthaembed/fleet";
import { listDatasets } from "../../lib/catalog";

export const revalidate = 60;
export const metadata = { title: "Catalog" };

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string; tag?: string; q?: string }>;
}) {
  const { cursor, tag, q } = await searchParams;
  const surface = getSiteCircuit("refinery");
  const page = await listDatasets(cursor, tag, q);

  return (
    <>
      <PageHeader
        eyebrow={surface?.eyebrow}
        title="Dataset catalog"
        lead="Every entry carries provenance and an OKF card. Search by name."
      />

      <form method="get" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        <input
          className="bh-input"
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search datasets"
          aria-label="Search datasets"
        />
        <button type="submit" className="bh-btn bh-btn--primary">Search</button>
        {(q || tag) && (
          <Link href="/catalog" className="bh-btn bh-btn--ghost">Clear</Link>
        )}
      </form>

      {!page && (
        <div className="bh-alert">
          Catalog unreachable — retry shortly (<code>GET /v1/catalog/datasets</code>).
        </div>
      )}
      {page && page.items.length === 0 && (
        <div className="bh-alert">
          No datasets match. The catalog grows on every harvest —{" "}
          <Link href="/requests">request one</Link>.
        </div>
      )}

      <div className="bh-stack">
        {page?.items.map((d) => (
          <Link key={d.id} href={`/datasets/${d.slug}`} className="bh-card" style={{ display: "block" }}>
            <p className="bh-card__title">{d.name}</p>
            <p className="bh-meta">
              {d.docCount} docs · {d.chunkCount} chunks ·{" "}
              {new Date(d.createdAt).toUTCString().slice(0, 16)}
              {d.tags.length > 0 && <> · {d.tags.join(" · ")}</>}
            </p>
          </Link>
        ))}
      </div>

      {page?.nextCursor && (
        <div style={{ marginTop: 20 }}>
          <Link
            className="bh-btn bh-btn--ghost"
            href={`/catalog?cursor=${encodeURIComponent(page.nextCursor)}${tag ? `&tag=${tag}` : ""}${q ? `&q=${q}` : ""}`}
          >
            Older datasets →
          </Link>
        </div>
      )}
    </>
  );
}
