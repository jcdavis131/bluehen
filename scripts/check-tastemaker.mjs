#!/usr/bin/env node
/**
 * check-tastemaker.mjs — Spec 0017 a11y + voice gate.
 *
 * Verifies:
 *  (a) No pure black (#000 / #000000) in CSS values across the fleet.
 *  (b) Every per-site accent passes WCAG AA 4.5:1 against --bh-canvas text usage.
 *  (c) No @media (max-width ...) in files touched by Spec 0017 (mobile-first rule).
 *
 * Tap-target >=44px and overflow-x audits are visual/runtime checks handled by
 * the fleet-review screenshot pass (Spec 0017 test plan); this script covers
 * the static, CI-gateable subset.
 *
 * Run:  node scripts/check-tastemaker.mjs
 * Exit: 0 = all green, 1 = violations found.
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url)).replace(/\/$/, "");

// --- Accent contrast --------------------------------------------------------
// The 7 per-site accents, read from tokens.css. Kept in sync with the
// desaturated family from Spec 0017 SITE-017. If tokens.css drifts, this
// table is the contract — update both together.
const CANVAS = "#0b0d0a";
const ACCENTS = {
  storefront: { name: "hen-blue", hex: "#5384a1" },
  hq: { name: "slate-blue", hex: "#6d7f98" },
  dumbmodel: { name: "cone-rust", hex: "#b27450" },
  validation: { name: "moss", hex: "#6d8d72" },
  research: { name: "heather", hex: "#8786b5" },
  simulation: { name: "clay", hex: "#c0a478" },
  observatory: { name: "instrument", hex: "#66a09d" },
};

function relLum(hex) {
  const h = hex.replace("#", "");
  const ch = (c) => {
    const v = parseInt(c, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * ch(h.slice(0, 2)) +
    0.7152 * ch(h.slice(2, 4)) +
    0.0722 * ch(h.slice(4, 6))
  );
}

function contrast(fg, bg) {
  const l1 = relLum(fg);
  const l2 = relLum(bg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

// --- File walk --------------------------------------------------------------
async function walk(dir, acc) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".next" || e.name === ".git" || e.name === "dist" || e.name === ".turbo") continue;
      await walk(full, acc);
    } else if (e.isFile()) {
      acc.push(full);
    }
  }
  return acc;
}

// Spec 0017-touched directories: ui-fleet tokens/components + all site CSS/TSX.
const SPEC_DIRS = [
  join(ROOT, "packages", "ui-fleet", "src"),
  join(ROOT, "apps", "sites"),
  join(ROOT, "apps", "hq", "app"),
];

async function specFiles() {
  const out = new Set();
  for (const d of SPEC_DIRS) {
    const files = await walk(d, []);
    for (const f of files) {
      if (f.endsWith(".css") || f.endsWith(".tsx") || f.endsWith(".ts")) {
        out.add(f);
      }
    }
  }
  return [...out];
}

// --- Checks -----------------------------------------------------------------
function checkPureBlack(contents, file) {
  // Match #000 or #000000 as a CSS color value (not inside a comment line
  // that documents the prohibition). Allow rgba(0,0,0,...) since shadows use it.
  const lines = contents.split("\n");
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // skip comment lines
    if (line.trim().startsWith("//") || line.trim().startsWith("/*") || line.trim().startsWith("*")) continue;
    // #000 or #000000 as a value (word-boundary, not inside a longer hex)
    const m = line.match(/:\s*#000000\b|:\s*#000\b/i);
    if (m) hits.push({ file, line: i + 1, text: line.trim() });
  }
  return hits;
}

function checkMaxWidth(contents, file) {
  // Spec 0017 acceptance #5: no @media (max-width ...) in spec-touched files.
  const lines = contents.split("\n");
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/@media\s*\(\s*max-width/i.test(line)) {
      hits.push({ file, line: i + 1, text: line.trim() });
    }
  }
  return hits;
}

async function checkTokensAccentsMatch() {
  // Verify tokens.css actually contains the accent hex values we test above.
  // This catches drift between the ACCENTS table and tokens.css.
  const tokensPath = join(ROOT, "packages", "ui-fleet", "src", "tokens.css");
  const tokens = await readFile(tokensPath, "utf-8");
  const drift = [];
  for (const [siteId, { name, hex }] of Object.entries(ACCENTS)) {
    const decl = `--bh-${name}: ${hex};`;
    // heather/cone-rust have special dim var names; just check the base.
    const baseDecl = `--bh-${name}: ${hex};`;
    if (!tokens.includes(baseDecl)) {
      drift.push({ siteId, expected: baseDecl });
    }
  }
  return drift;
}

// --- Main -------------------------------------------------------------------
async function main() {
  const files = await specFiles();
  const blackHits = [];
  const maxWidthHits = [];

  for (const f of files) {
    let contents;
    try {
      contents = await readFile(f, "utf-8");
    } catch {
      continue;
    }
    blackHits.push(...checkPureBlack(contents, f));
    maxWidthHits.push(...checkMaxWidth(contents, f));
  }

  const accentFailures = [];
  for (const [siteId, { name, hex }] of Object.entries(ACCENTS)) {
    const ratio = contrast(hex, CANVAS);
    if (ratio < 4.5) {
      accentFailures.push({ siteId, name, hex, ratio: ratio.toFixed(2) });
    }
  }

  const drift = await checkTokensAccentsMatch();

  let failures = 0;

  if (blackHits.length) {
    failures++;
    console.error(`FAIL — pure black found in ${blackHits.length} location(s):`);
    for (const h of blackHits) {
      console.error(`  ${relative(ROOT, h.file)}:${h.line}  ${h.text}`);
    }
  }

  if (maxWidthHits.length) {
    failures++;
    console.error(`FAIL — @media (max-width) forbidden in spec-touched files (${maxWidthHits.length} location(s)):`);
    for (const h of maxWidthHits) {
      console.error(`  ${relative(ROOT, h.file)}:${h.line}  ${h.text}`);
    }
  }

  if (accentFailures.length) {
    failures++;
    console.error(`FAIL — accent contrast below AA 4.5:1 on ${CANVAS}:`);
    for (const a of accentFailures) {
      console.error(`  ${a.siteId} (${a.name} ${a.hex})  ${a.ratio}:1`);
    }
  }

  if (drift.length) {
    failures++;
    console.error(`FAIL — tokens.css drifted from check-tastemaker.mjs ACCENTS table:`);
    for (const d of drift) {
      console.error(`  ${d.siteId}: expected "${d.expected}"`);
    }
  }

  if (failures === 0) {
    console.log("check-tastemaker: all green");
    console.log(`  pure-black: 0 hits across ${files.length} spec-touched files`);
    console.log(`  @media (max-width): 0 hits`);
    console.log(`  accent contrast: all 7 accents >= 4.5:1 on ${CANVAS}`);
    console.log(`  tokens drift: none`);
    return 0;
  }
  return 1;
}

main().then((code) => process.exit(code));
