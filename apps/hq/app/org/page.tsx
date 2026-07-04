import fs from "node:fs";
import path from "node:path";
import { PageHeader } from "@synthaembed/ui-fleet";import { getSiteCircuit } from "@synthaembed/fleet";import { Markdown } from "@synthaembed/ui-fleet";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Org",
  description: "The org's living status board + per-division team digests.",
};

/** Resolve a repo-root doc to a string, trying candidate roots (local dev +
 * Vercel). Returns null when the file isn't bundled into this deploy — the
 * page then shows an honest empty state (architecture principle #3). */
function readDoc(rel: string): string | null {
  const candidates = [
    path.resolve(process.cwd(), "..", "..", rel), // cwd = apps/hq  -> repo root
    path.resolve(process.cwd(), rel), // cwd = repo root (run differently)
  ];
  for (const p of candidates) {
    try {
      return fs.readFileSync(p, "utf-8");
    } catch {
      continue;
    }
  }
  return null;
}

/** Strip YAML frontmatter; return {body, title?, updated?}. */
function parseDoc(raw: string): { body: string; title?: string; updated?: string } {
  let body = raw;
  let title: string | undefined;
  let updated: string | undefined;
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n/);
  if (fmMatch) {
    const fm = fmMatch[1];
    body = raw.slice(fmMatch[0].length);
    const t = fm.match(/^title:\s*(.+)$/m);
    if (t) title = t[1].replace(/["']/g, "").trim();
    const ts = fm.match(/^(?:timestamp|updated|lastUpdated):\s*(.+)$/m);
    if (ts) updated = ts[1].replace(/["']/g, "").trim();
  }
  // Fallback: first # heading as title
  if (!title) {
    const h = body.match(/^#\s+(.+)$/m);
    if (h) title = h[1].trim();
  }
  return { body: body.trim(), title, updated };
}

const TEAM_FILES = [
  { rel: "knowledge/teams/operations.md", label: "Operations" },
  { rel: "knowledge/teams/rnd.md", label: "R&D" },
  { rel: "knowledge/teams/data-harvesting.md", label: "Data Harvesting" },
];

export default async function OrgPage() {
  const surface = getSiteCircuit("hq");
  const statusRaw = readDoc("docs/STATUS.md");
  const status = statusRaw ? parseDoc(statusRaw) : null;
  const teams = TEAM_FILES.map((t) => {
    const raw = readDoc(t.rel);
    return { ...t, parsed: raw ? parseDoc(raw) : null };
  });
  const anyMissing = !status || teams.some((t) => !t.parsed);

  return (
    <>
      <PageHeader
        eyebrow={surface?.eyebrow}
        title="Org"
        lead="The org's living status board and per-division team digests. Docs are the data, no separate backend."
      />

      {anyMissing && (
        <div className="bh-alert bh-alert--warn" style={{ marginBottom: "var(--bh-space-5)" }}>
          Some docs were not found in this deploy. They are bundled via{" "}
          <code>outputFileTracingIncludes</code>; if this shows on the hosted cockpit,
          check the hq <code>next.config</code> tracing globs.
        </div>
      )}

      <h2 className="bh-section-title">Status board</h2>
      <div className="bh-card bh-card--flush" style={{ marginBottom: "var(--bh-space-8)" }}>
        {status ? (
          <>
            {status.updated && (
              <div className="bh-meta" style={{ padding: "var(--bh-space-3) var(--bh-space-4) 0" }}>
                Last updated {status.updated}
              </div>
            )}
            <div style={{ padding: "var(--bh-space-4)" }}>
              <Markdown source={status.body} />
            </div>
          </>
        ) : (
          <div className="bh-card__body" style={{ padding: "var(--bh-space-4)" }}>
            <code>docs/STATUS.md</code> not found in this deploy.
          </div>
        )}
      </div>

      <h2 className="bh-section-title">Team digests</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--bh-space-3)" }}>
        {teams.map((t) => (
          <details key={t.rel} className="bh-card bh-card--flush">
            <summary
              style={{
                cursor: "pointer",
                padding: "var(--bh-space-3) var(--bh-space-4)",
                fontWeight: 600,
                display: "flex",
                alignItems: "baseline",
                gap: "var(--bh-space-2)",
              }}
            >
              <span>{t.parsed?.title ?? t.label}</span>
              {t.parsed?.updated && (
                <span className="bh-meta" style={{ fontWeight: 400 }}>
                  {t.parsed.updated}
                </span>
              )}
              {!t.parsed && (
                <span className="bh-badge bh-badge--warn" style={{ fontWeight: 400 }}>
                  not bundled
                </span>
              )}
            </summary>
            {t.parsed ? (
              <div style={{ padding: "var(--bh-space-4)", borderTop: "1px solid var(--bh-border)" }}>
                <Markdown source={t.parsed.body} />
              </div>
            ) : (
              <div className="bh-card__body" style={{ padding: "var(--bh-space-4)" }}>
                <code>{t.rel}</code> not found in this deploy.
              </div>
            )}
          </details>
        ))}
      </div>
    </>
  );
}
