import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { PageHeader, SiteSubnav } from "@synthaembed/ui-fleet";
import { getSiteCircuit, getSiteNav } from "@synthaembed/fleet";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Scorecards — Validation Lab",
  description:
    "Published validation scorecards — first-class OKF documents rendered from content/fleet/bd/scorecards/.",
};

type ScorecardMeta = {
  slug: string;
  title: string;
  tenant: string;
  verdict: string;
  date: string;
  method?: string;
};

const VERDICT_BADGE: Record<string, string> = {
  "pilot-passed": "bh-badge--ok",
  "pilot-failed": "bh-badge--danger",
  "awaiting-pilot": "bh-badge--warn",
};

/** Resolve the scorecards directory, trying candidate roots (local dev +
 * Vercel). Returns null when the directory isn't bundled into this deploy. */
function resolveScorecardsDir(): string | null {
  const candidates = [
    path.resolve(process.cwd(), "..", "..", "content/fleet/bd/scorecards"), // cwd = apps/sites/validation -> repo root
    path.resolve(process.cwd(), "content/fleet/bd/scorecards"), // cwd = repo root
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

/** Parse YAML frontmatter for the index listing fields. */
function parseFrontmatter(
  raw: string,
): { title?: string; tenant?: string; verdict?: string; date?: string; method?: string } {
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n/);
  if (!fmMatch) return {};
  const fm = fmMatch[1];
  const get = (key: string): string | undefined => {
    const m = fm.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
    return m ? m[1].replace(/["']/g, "").trim() : undefined;
  };
  return {
    title: get("title"),
    tenant: get("tenant"),
    verdict: get("verdict"),
    date: get("date"),
    method: get("method"),
  };
}

/** List every scorecard file (.md or .json) with parsed frontmatter. */
function listScorecards(dir: string): ScorecardMeta[] {
  const entries = fs.readdirSync(dir);
  const cards: ScorecardMeta[] = [];
  for (const entry of entries) {
    if (entry.startsWith(".")) continue;
    const full = path.join(dir, entry);
    try {
      if (!fs.statSync(full).isFile()) continue;
    } catch {
      continue;
    }
    if (!entry.endsWith(".md") && !entry.endsWith(".json")) continue;
    const slug = entry.replace(/\.(md|json)$/, "");
    const raw = fs.readFileSync(full, "utf-8");
    const fm = parseFrontmatter(raw);
    cards.push({
      slug,
      title: fm.title ?? slug,
      tenant: fm.tenant ?? "—",
      verdict: fm.verdict ?? "unknown",
      date: fm.date ?? "—",
      method: fm.method,
    });
  }
  // Newest first; fall back to slug alpha when no date.
  cards.sort((a, b) => (b.date < a.date ? -1 : b.date > a.date ? 1 : a.slug.localeCompare(b.slug)));
  return cards;
}

export default async function ScorecardsIndexPage() {
  const surface = getSiteCircuit("validation");
  const nav = getSiteNav("validation");
  const dir = resolveScorecardsDir();
  const cards = dir ? listScorecards(dir) : [];

  return (
    <>
      <PageHeader
        eyebrow={surface?.eyebrow}
        title="Scorecards"
        lead="Published validation rulings as first-class OKF documents. Docs are the data — no separate backend."
        badge={<span className="bh-badge bh-badge--accent">Docs as data</span>}
      />
      <SiteSubnav items={nav} currentPath="/scorecards" />

      {cards.length === 0 ? (
        <div className="bh-card bh-note">
          <div className="bh-card__title">No scorecards published yet</div>
          <p className="bh-card__body" style={{ marginTop: "var(--bh-space-2)" }}>
            Scorecards appear here once Validation publishes a pilot ruling. Each scorecard is a
            markdown file in <code>content/fleet/bd/scorecards/</code> with YAML frontmatter (
            <code>title</code>, <code>tenant</code>, <code>verdict</code>, <code>date</code>).
          </p>
          <p className="bh-mono" style={{ marginTop: "var(--bh-space-3)" }}>
            content/fleet/bd/scorecards/&lt;slug&gt;.md
          </p>
          {!dir && (
            <p className="bh-meta" style={{ marginTop: "var(--bh-space-3)" }}>
              The scorecards directory was not found in this deploy — it is bundled via{" "}
              <code>outputFileTracingIncludes</code>. If this shows on the hosted site, check the
              validation <code>next.config</code> tracing globs.
            </p>
          )}
        </div>
      ) : (
        <div className="bh-list-stack">
          {cards.map((c) => (
            <article key={c.slug} className="bh-card bh-card--column">
              <div className="bh-card__row">
                <h3 className="bh-card__title bh-card__title--lg">{c.title}</h3>
                <span className={`bh-badge ${VERDICT_BADGE[c.verdict] ?? ""}`}>{c.verdict}</span>
              </div>
              {c.method && (
                <div className="bh-card__subtitle">method: {c.method}</div>
              )}
              <div className="bh-meta">
                tenant: {c.tenant} · published {c.date}
              </div>
              <Link
                href={`/scorecards/${c.slug}`}
                className="bh-card__subtitle"
                style={{ marginTop: "var(--bh-space-2)" }}
              >
                View scorecard →
              </Link>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
