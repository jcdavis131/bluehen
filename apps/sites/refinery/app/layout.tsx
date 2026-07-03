import "@synthaembed/ui-fleet/styles.css";
import {
  CommandPalette,
  FleetShell,
  siteHref,
  type PaletteItem,
} from "@synthaembed/ui-fleet";
import { listSites } from "@synthaembed/fleet";
import { SITE_ORIGIN } from "../lib/site";

export const metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: {
    default: "Data Refinery — Blue Hen RE",
    template: "%s — Data Refinery · Blue Hen RE",
  },
  description:
    "Provenance-carrying datasets, custom harvests, and dataset preparation — the Data Operations division of Blue Hen RE.",
  openGraph: { siteName: "Data Refinery · Blue Hen RE", type: "website" },
};

// UX-120 (Spec 0020): ⌘K palette — refinery pages first, then the rest of
// the fleet from the registry (same pattern as the storefront layout).
function paletteItems(): PaletteItem[] {
  const local = process.env.NEXT_PUBLIC_FLEET_LOCAL === "1";
  const pages: PaletteItem[] = [
    { label: "Home — datasets with receipts", href: "/", hint: "refinery" },
    { label: "Dataset catalog", href: "/catalog", hint: "refinery" },
    { label: "Contribute data", href: "/contribute", hint: "action" },
    { label: "Request a custom harvest", href: "/requests", hint: "action" },
  ];
  const sites: PaletteItem[] = listSites({ status: "active" })
    .filter((s) => s.id !== "refinery" && s.appPath)
    .map((s) => ({
      label: s.name,
      href: siteHref(s, local),
      hint: s.domain ?? s.id,
    }));
  return [...pages, ...sites];
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <FleetShell siteId="refinery">{children}</FleetShell>
        <CommandPalette items={paletteItems()} />
      </body>
    </html>
  );
}
