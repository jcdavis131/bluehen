import "@synthaembed/ui-fleet/styles.css";
import { CommandPalette, FleetShell, type PaletteItem } from "@synthaembed/ui-fleet";
import marketPlatforms from "../../../../config/market-platforms.json";

export const metadata = {
  metadataBase: new URL("https://signals.bhenre.com"),
  title: {
    default: "Simulation Lab — Blue Hen RE",
    template: "%s — Simulation Lab · Blue Hen RE",
  },
  description: "Paper-trading strategy reports across prediction markets, DFS, and equities — simulation only, no live capital.",
  openGraph: { siteName: "Simulation Lab · Blue Hen RE", type: "website" },
};

/** ⌘K palette (UX-120, Spec 0020): this site's real routes only — the home
 * page plus the four platform explainers, named from the same registry the
 * simulator enforces. */
const PALETTE_ITEMS: PaletteItem[] = [
  { label: "Home — Simulation Lab", href: "/", hint: "simulation" },
  ...(marketPlatforms.platforms as { id: string; name: string }[]).map((p) => ({
    label: `${p.name} — paper simulation`,
    href: `/simulate/${p.id}`,
    hint: "simulation",
  })),
];

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <FleetShell siteId="simulation">{children}</FleetShell>
        <CommandPalette items={PALETTE_ITEMS} />
      </body>
    </html>
  );
}
