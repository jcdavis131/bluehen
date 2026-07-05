import { listReports } from "./data";

/** Oldest published report is the free preview (Spec 0021 P5). */
export function freeReportSlug(): string | null {
  const reports = listReports();
  if (reports.length === 0) return null;
  return reports[reports.length - 1]!.slug;
}

export function isReportFree(slug: string): boolean {
  const free = freeReportSlug();
  return free === null || free === slug;
}

export function previewBody(body: string, maxChars = 800): string {
  const trimmed = body.trim();
  if (trimmed.length <= maxChars) return trimmed;
  return `${trimmed.slice(0, maxChars).trim()}…`;
}
