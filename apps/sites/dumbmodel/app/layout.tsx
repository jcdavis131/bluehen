import "./globals.css";
import "@synthaembed/ui-fleet/styles.css";
import { CommandPalette, FleetShell, siteHref, type PaletteItem } from "@synthaembed/ui-fleet";
import { listSites } from "@synthaembed/fleet";

export const metadata = {
  metadataBase: new URL("https://dumbmodel.com"),
  title: {
    default: "Baseline Comparison — Blue Hen RE",
    template: "%s — Baseline Comparison · Blue Hen RE",
  },
  description: "Free embedder health check and collapse diagnostics — every score is measured.",
  openGraph: { siteName: "Baseline Comparison · Blue Hen RE", type: "website" },
};

// ⌘K palette (Spec 0020, UX-120): this site's pages plus the rest of the
// fleet, straight from the registry — no hand-maintained cross-site list.
function paletteItems(): PaletteItem[] {
  const local = process.env.NEXT_PUBLIC_FLEET_LOCAL === "1";
  const pages: PaletteItem[] = [
    { label: "Home — how dumb is your model?", href: "/", hint: "dumbmodel" },
    { label: "Run the free health check", href: "/check", hint: "action" },
    { label: "Compare models side by side", href: "/compare", hint: "action" },
    { label: "Hall of Cone — leaderboard", href: "/hall", hint: "dumbmodel" },
    { label: "Museum of Collapse", href: "/museum", hint: "dumbmodel" },
  ];
  const sites: PaletteItem[] = listSites({ status: "active" })
    .filter((s) => s.id !== "dumbmodel" && s.appPath)
    .map((s) => ({
      label: s.name,
      href: siteHref(s, local),
      hint: s.domain ?? s.id,
    }));
  return [...pages, ...sites];
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <FleetShell siteId="dumbmodel">{children}</FleetShell>
        <CommandPalette items={paletteItems()} />
      </body>
    </html>
  );
}
