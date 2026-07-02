#!/usr/bin/env node
/** Plan → execute → review loop entrypoint for the fleet sites. */
import { execSync } from "node:child_process";

const sites = [
  "@synthaembed/storefront",
  "@synthaembed/dumbmodel",
  "@synthaembed/hq",
  "@synthaembed/validation",
  "@synthaembed/research",
  "@synthaembed/simulation",
];

const filter = sites.map((s) => `--filter=${s}`).join(" ");

console.log("=== Fleet review: build all sites ===\n");
execSync(`pnpm turbo run build ${filter}`, { stdio: "inherit" });

console.log("\n=== Fleet review: typecheck ===\n");
execSync(`pnpm turbo run typecheck ${filter}`, { stdio: "inherit" });

console.log("\n✓ Fleet review passed");
