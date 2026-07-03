import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, SiteSubnav } from "@synthaembed/ui-fleet";
import { getSiteCircuit, getSiteNav } from "@synthaembed/fleet";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

/** Resolve the scorecards directory, trying candidate roots (local dev +
 * Vercel). Returns null when the directory isn't bundled into this deploy. */
function resolveScorecardsDir(): string | null {
  const candidates = [
    path.resolve(process.cwd(), "..", "..", "content/fleet/bd/scorecards"),
    path.resolve(process.cwd(), "content/fleet/bd/scorecards"),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p) && fs.statSync(p).isDirectory()) return p;
    } catch {
      continue;
    }
  }
  return null;
}

type Frontmatter = {
  title?: string;
  tenant?: string;
  verdict?: string;
  date?: string;
  method?: string;
};

/** Parse YAML frontmatter; return {body, fields}. */
function parseDoc(raw: string): { body: string; fm: Frontmatter } {
  let body = raw;
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n/);
  let fm: Frontmatter = {};
  if (fmMatch) {
    const fmText = fmMatch[1];
    body = raw.slice(fmMatch[0].length);
    const get = (key: string): string | undefined => {
      const m = fmText.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
      return m ? m[1].replace(/["']/g, "").trim() : undefined;
    };
    fm = {
      title: get("title"),
      tenant: get("tenant"),
      verdict: get("verdict"),
      date: get("date"),
      method: get("method"),
    };
  }
  // Fallback: first # heading as title
  if (!fm.title) {
    const h = body.match(/^#\s+(.+)$/m);
    if (h) fm.title = h[1].trim();
  }
  return { body: body.trim(), fm };
}

/** Read a scorecard by slug (.md or .json). Returns null if not found. */
function readScorecard(
  dir: string,
  slug: string,
): { raw: string; ext: "md" | "json" } | null {
  for (const ext of ["md", "json"] as const) {
    const full = path.join(dir, `${slug}.${ext}`);
    try {
      const raw = fs.readFileSync(full, "utf-8");
      return { raw, ext };
    } catch {
      continue;
    }
  }
  return null;
}

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const dir = resolveScorecardsDir();
  if (!dir) return { title: "Scorecard — Validation Lab" };
  const file = readScorecard(dir, slug);
  if (!file) return { title: "Scorecard — Validation Lab" };
  const { fm } = parseDoc(file.raw);
  const title = fm.title ? `${fm.title} — Scorecard` : "Scorecard — Validation Lab";
  const description = fm.tenant
    ? `Validation scorecard for ${fm.tenant}${fm.verdict ? ` — ${fm.verdict}` : ""}.`
    : "Validation scorecard.";
  return { title, description };
}

export default async function ScorecardDetailPage({ params }: Params) {
  const { slug } = await params;
  const surface = getSiteCircuit("validation");
  const nav = getSiteNav("validation");
  const dir = resolveScorecardsDir();

  if (!dir) {
    // Directory not bundled — treat as not found so the index empty state is the entry point.
    notFound();
  }

  const file = readScorecard(dir, slug);
  if (!file) notFound();

  const { body, fm } = parseDoc(file.raw);
  const title = fm.title ?? slug;

  return (
    <>
      <PageHeader
        eyebrow={surface?.eyebrow}
        title={title}
        lead={
          fm.tenant || fm.date
            ? `${fm.tenant ? `tenant: ${fm.tenant}` : ""}${
                fm.tenant && fm.date ? " · " : ""
              }${fm.date ? `published ${fm.date}` : ""}`
            : "Published validation scorecard."
        }
        badge={
          fm.verdict ? (
            <span className="bh-badge bh-badge--accent">{fm.verdict}</span>
          ) : undefined
        }
      />
      <SiteSubnav items={nav} currentPath="/scorecards" />

      {(fm.method || fm.tenant || fm.date) && (
        <div className="bh-meta" style={{ marginBottom: "var(--bh-space-4)" }}>
          {fm.method && <span>method: {fm.method} · </span>}
          {fm.tenant && <span>tenant: {fm.tenant} · </span>}
          {fm.date && <span>date: {fm.date}</span>}
        </div>
      )}

      <div className="bh-card bh-card--flush">
        <div className="bh-card__body" style={{ padding: "var(--bh-space-4)" }}>
          <pre
            className="bh-mono"
            style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}
          >
            {body}
          </pre>
        </div>
      </div>

      <div style={{ marginTop: "var(--bh-space-5)" }}>
        <Link href="/scorecards" className="bh-card__subtitle">
          ← Back to scorecards
        </Link>
      </div>
    </>
  );
}
