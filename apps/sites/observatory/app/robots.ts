import type { MetadataRoute } from "next";

// Internal operations tooling — not for search indexes.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
