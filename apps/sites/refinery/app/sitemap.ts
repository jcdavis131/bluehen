import type { MetadataRoute } from "next";
import { getSiteNav } from "@synthaembed/fleet";

const BASE = "https://data.bhenre.com";
const API = process.env.SYNTH_API_BASE_URL ?? "http://localhost:8000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes = ["/", ...getSiteNav("refinery").map((i) => i.href)];
  let wikiRoutes: string[] = [];
  try {
    const res = await fetch(`${API}/v1/wiki`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const pages = (await res.json()).pages ?? [];
      wikiRoutes = pages.map((p: { slug: string }) => `/wiki/${p.slug}`);
    }
  } catch {
    /* wiki routes omitted when API unreachable — never fake entries */
  }
  return [...new Set([...routes, ...wikiRoutes])].map((route) => ({
    url: `${BASE}${route === "/" ? "" : route}`,
    lastModified: new Date(),
    changeFrequency: route.startsWith("/wiki") ? "daily" : "weekly",
    priority: route === "/" ? 1 : 0.7,
  }));
}
