import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown, PageHeader } from "@synthaembed/ui-fleet";
import { getSiteCircuit } from "@synthaembed/fleet";

export const revalidate = 60;

const API = process.env.SYNTH_API_BASE_URL ?? "http://localhost:8000";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  try {
    const res = await fetch(`${API}/v1/wiki/${encodeURIComponent(slug)}`, {
      next: { revalidate: 300 },
    });
    if (res.ok) {
      const page = await res.json();
      return {
        title: page.title,
        description:
          page.description ??
          "Auto-built page in the Blue Hen RE Data Refinery wiki.",
      };
    }
  } catch {
    /* metadata falls back below */
  }
  return { title: "Wiki" };
}

export default async function WikiPage(
{
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const surface = getSiteCircuit("refinery");
  let page: { title: string; bodyMd: string; generatedBy: string; updatedAt: string } | null = null;
  try {
    const res = await fetch(`${API}/v1/wiki/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 },
    });
    if (res.ok) page = await res.json();
  } catch {
    page = null;
  }
  if (!page) notFound();

  return (
    <>
      <PageHeader
        eyebrow={surface?.eyebrow}
        title={page.title}
        lead={`${page.generatedBy === "glm" ? "Model-refined (labeled sections)" : "Deterministic build"} · updated ${new Date(page.updatedAt).toUTCString()}`}
      />
      <article className="bh-card bh-card--organic">
        <Markdown source={page.bodyMd} />
      </article>
      <p style={{ marginTop: 16 }}>
        <Link href="/wiki" className="bh-btn bh-btn--ghost">← All wiki pages</Link>
      </p>
    </>
  );
}
