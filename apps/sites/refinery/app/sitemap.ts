import type { MetadataRoute } from "next";
import { getSiteNav } from "@synthaembed/fleet";
import { SITE_ORIGIN } from "../lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["/", ...getSiteNav("refinery").map((i) => i.href)];
  return [...new Set(routes)].map((route) => ({
    url: `${SITE_ORIGIN}${route === "/" ? "" : route}`,
    lastModified: new Date(),
    changeFrequency: route === "/" ? "daily" : "weekly",
    priority: route === "/" ? 1 : 0.7,
  }));
}
