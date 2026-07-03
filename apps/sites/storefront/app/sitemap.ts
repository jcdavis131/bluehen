import type { MetadataRoute } from "next";
import { getSiteNav } from "@synthaembed/fleet";

const BASE = "https://bhenre.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["/", ...getSiteNav("storefront").map((i) => i.href)];
  return [...new Set(routes)].map((route) => ({
    url: `${BASE}${route === "/" ? "" : route}`,
    lastModified: new Date(),
    changeFrequency: route === "/" ? "daily" : "weekly",
    priority: route === "/" ? 1 : 0.7,
  }));
}
