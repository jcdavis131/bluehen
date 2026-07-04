import fs from "node:fs";
import path from "node:path";

/** Resolve a repo-relative path, trying candidate roots (local dev + Vercel).
 * Returns null when the file/dir isn't bundled into this deploy. */
export function resolveRepoPath(rel: string): string | null {
  const candidates = [
    path.resolve(process.cwd(), "..", "..", "..", rel), // cwd = apps/sites/simulation -> repo root
    path.resolve(process.cwd(), "..", "..", rel), // cwd two levels deep (Vercel variants)
    path.resolve(process.cwd(), rel), // cwd = repo root
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      continue;
    }
  }
  return null;
}

export type RootMemoryUnit = {
  id: string;
  rules: string;
  evidence: string;
};

export type Platform = {
  id: string;
  name: string;
  category: string;
  domain: string;
  simulationOnly: boolean;
  rules: string[];
  executionConstraints: Record<string, string | number | boolean>;
  rootMemoryUnits: RootMemoryUnit[];
};

export function loadPlatforms(): Platform[] {
  const p = resolveRepoPath("config/market-platforms.json");
  if (!p) return [];
  try {
    const doc = JSON.parse(fs.readFileSync(p, "utf-8"));
    return (doc.platforms ?? []) as Platform[];
  } catch {
    return [];
  }
}

export type Trade = {
  fixtureId: string;
  edge: number;
  weight: number;
  pnl: number;
  rulesApplied: string[];
};

export type SimResult = {
  mode: string;
  platformId: string;
  strategyId: string;
  corpusId: string;
  sharpe: number;
  penalizedSharpe: number;
  turnover: number;
  trades: Trade[];
  tradeCount: number;
  platformRulesApplied: string[];
  bankrollStart: number;
  bankrollEnd: number;
};

export type ResultsBundle = {
  generatedAt: string;
  spec: string;
  mode: string;
  note: string;
  platforms: Record<string, SimResult>;
};

export function loadResults(): ResultsBundle | null {
  const p = resolveRepoPath("content/simulation/results.json");
  if (!p) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8")) as ResultsBundle;
  } catch {
    return null;
  }
}

export type ReportMeta = {
  slug: string;
  title: string;
  date: string;
  strategy?: string;
  platforms?: string;
  status?: string;
  summary?: string;
};

function parseFrontmatter(raw: string): { body: string; fm: Record<string, string> } {
  const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!fmMatch) return { body: raw.trim(), fm: {} };
  const fm: Record<string, string> = {};
  for (const line of fmMatch[1].split(/\r?\n/)) {
    const m = line.match(/^(\w+):\s*(.+)$/);
    if (m) fm[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
  return { body: raw.slice(fmMatch[0].length).trim(), fm };
}

export function listReports(): ReportMeta[] {
  const dir = resolveRepoPath("content/simulation/reports");
  if (!dir) return [];
  let files: string[] = [];
  try {
    files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  } catch {
    return [];
  }
  const reports: ReportMeta[] = [];
  for (const f of files) {
    try {
      const raw = fs.readFileSync(path.join(dir, f), "utf-8");
      const { body, fm } = parseFrontmatter(raw);
      const h = body.match(/^#\s+(.+)$/m);
      reports.push({
        slug: f.replace(/\.md$/, ""),
        title: fm.title ?? h?.[1]?.trim() ?? f,
        date: fm.date ?? "",
        strategy: fm.strategy,
        platforms: fm.platforms,
        status: fm.status,
        summary: fm.summary,
      });
    } catch {
      continue;
    }
  }
  return reports.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function readReport(slug: string): { body: string; meta: ReportMeta } | null {
  const dir = resolveRepoPath("content/simulation/reports");
  if (!dir || !/^[\w.-]+$/.test(slug)) return null;
  try {
    const raw = fs.readFileSync(path.join(dir, `${slug}.md`), "utf-8");
    const { body, fm } = parseFrontmatter(raw);
    const h = body.match(/^#\s+(.+)$/m);
    return {
      body,
      meta: {
        slug,
        title: fm.title ?? h?.[1]?.trim() ?? slug,
        date: fm.date ?? "",
        strategy: fm.strategy,
        platforms: fm.platforms,
        status: fm.status,
        summary: fm.summary,
      },
    };
  } catch {
    return null;
  }
}
