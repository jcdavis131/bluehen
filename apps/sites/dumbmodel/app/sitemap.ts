import type { MetadataRoute } from "next";
import { getSiteNav } from "@synthaembed/fleet";

const BASE = "https://dumbmodel.com";

/** Lab + game routes not all duplicated in nav (external certify omitted). */
const EXTRA_ROUTES = ["/check", "/compare", "/hall", "/museum"];

export default function sitemap(): MetadataRoute.Sitemap {
  const navRoutes = getSiteNav("dumbmodel")
    .map((item) => item.href)
    .filter((href) => href.startsWith("/"));
  const routes = ["/", ...navRoutes, ...EXTRA_ROUTES];
  const unique = [...new Set(routes)];

  return unique.map((route) => ({
    url: `${BASE}${route === "/" ? "" : route}`,
    lastModified: new Date(),
    changeFrequency: route === "/" || route === "/arena" ? "daily" : "weekly",
    priority: route === "/" ? 1 : route === "/arena" ? 0.95 : 0.7,
  }));
}
