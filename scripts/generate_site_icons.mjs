/**
 * Regenerate app/icon.svg for every fleet site from the shared emblem
 * geometry (packages/ui-fleet/src/mark-geometry.ts).
 *
 * Favicon register: the roundel reduced for 16px — site-accent disc, one
 * cream ring, cream monoline emblem. No lettering (it can't survive 16px).
 *
 *   node scripts/generate_site_icons.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Deep light-theme accents (tokens.css): richer at favicon size, and they
// hold up against both light and dark browser chrome.
const SITE_ACCENTS = {
  storefront: "#3d6b89",
  hq: "#52657f",
  validation: "#4c7052",
  research: "#5c5b85",
  dumbmodel: "#a4522e",
  simulation: "#7d6234",
  observatory: "#35706c",
  refinery: "#8e5527",
};

const CREAM = "#fdf8f1";

// mark-geometry.ts is TypeScript; extract the shape arrays without a TS
// toolchain by evaluating the data portion (it is pure literals).
const src = readFileSync(
  resolve(root, "packages/ui-fleet/src/mark-geometry.ts"),
  "utf-8",
);
const body = src
  .replace(/export type[\s\S]*?;\n/, "")
  .replace(/: EmblemShape\[\]/g, "")
  .replace(/: Record<string, EmblemShape\[\]>/g, "")
  .replace(/export const/g, "const");
const { SITE_EMBLEMS, EMBLEM_STROKE } = new Function(
  `${body}; return { SITE_EMBLEMS, EMBLEM_STROKE };`,
)();

function shapeToSvg(s) {
  if (s.t === "p") return `<path d="${s.d}" fill="none"/>`;
  if (s.t === "pf") return `<path d="${s.d}" fill="${CREAM}" stroke="none"/>`;
  if (s.t === "pe") return `<path d="${s.d}" fill="${CREAM}" fill-rule="evenodd" stroke="none"/>`;
  if (s.t === "c") return `<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}" fill="none"/>`;
  return `<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}" fill="${CREAM}" stroke="none"/>`;
}

function iconSvg(siteId) {
  const shapes = SITE_EMBLEMS[siteId];
  const accent = SITE_ACCENTS[siteId];
  // emblem scaled into the ring field, stroke compensated to keep the
  // monoline weight readable at 16px
  const scale = 0.62;
  const offset = (64 - 64 * scale) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <circle cx="32" cy="32" r="32" fill="${accent}"/>
  <circle cx="32" cy="32" r="27.5" fill="none" stroke="${CREAM}" stroke-width="2.2"/>
  <g transform="translate(${offset} ${offset}) scale(${scale})" stroke="${CREAM}" stroke-width="${(EMBLEM_STROKE + 0.7) / scale}" stroke-linecap="round" stroke-linejoin="round">
    ${shapes.map(shapeToSvg).join("\n    ")}
  </g>
</svg>
`;
}

const SITE_DIRS = {
  storefront: "apps/sites/storefront",
  hq: "apps/hq",
  validation: "apps/sites/validation",
  research: "apps/sites/research",
  dumbmodel: "apps/sites/dumbmodel",
  simulation: "apps/sites/simulation",
  observatory: "apps/sites/observatory",
  refinery: "apps/sites/refinery",
};

for (const [siteId, dir] of Object.entries(SITE_DIRS)) {
  const out = resolve(root, dir, "app", "icon.svg");
  writeFileSync(out, iconSvg(siteId), "utf-8");
  console.log(`wrote ${dir}/app/icon.svg (${siteId})`);
}
