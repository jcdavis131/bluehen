import { NextResponse } from "next/server";
import { apiFetch } from "@synthaembed/ui-fleet/site-api";

export const dynamic = "force-dynamic";

type GhCommit = { commit?: { message?: string; author?: { date?: string } } };
type CatalogStats = { datasets?: number; chunks?: number };

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "recently";
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (minutes < 1) return "moments ago";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/**
 * Happenings board BFF (Spec 0033 V0): honest, real-event news lines for
 * the plaza's bulletin board. Every line traces to a real API response —
 * a commit feed, catalog stats — never a scripted or fake event. If
 * neither surface is reachable, the world stays quiet: `{ events: [] }`.
 */
export async function GET() {
  const lines: { text: string }[] = [];

  try {
    const res = await fetch("https://api.github.com/repos/jcdavis131/bluehen/commits?per_page=5", {
      headers: { accept: "application/vnd.github+json" },
      cache: "no-store",
    });
    if (res.ok) {
      const commits = (await res.json()) as GhCommit[];
      const top = Array.isArray(commits) ? commits[0] : null;
      const subject = (top?.commit?.message ?? "").split("\n")[0].trim().slice(0, 80);
      const when = top?.commit?.author?.date ? timeAgo(top.commit.author.date) : "recently";
      if (subject) lines.push({ text: `The engine moved ${when}: ${subject}` });
    }
  } catch {
    // GitHub unreachable — the board just says less, never something false.
  }

  try {
    const stats = (await apiFetch("/v1/catalog/stats")) as CatalogStats;
    if (typeof stats.datasets === "number") {
      const chunks = typeof stats.chunks === "number" ? stats.chunks : 0;
      lines.push({
        text: `Refinery holds ${stats.datasets} dataset${stats.datasets === 1 ? "" : "s"} / ${chunks} chunks`,
      });
    }
  } catch {
    // core-api unreachable or unkeyed locally — same honest omission.
  }

  return NextResponse.json({ events: lines });
}
