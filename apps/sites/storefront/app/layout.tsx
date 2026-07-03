import "@synthaembed/ui-fleet/styles.css";
import { CommandPalette, FleetShell, siteHref, type PaletteItem } from "@synthaembed/ui-fleet";
import { listSites } from "@synthaembed/fleet";

export const metadata = {
  metadataBase: new URL("https://bhenre.com"),
  title: {
    default: "Storefront — Blue Hen RE",
    template: "%s — Storefront · Blue Hen RE",
  },
  description: "Governed embedding operations: store, pricing, briefings, and proof surfaces.",
  openGraph: { siteName: "Storefront · Blue Hen RE", type: "website" },
};

function paletteItems(): PaletteItem[] {
  const local = process.env.NEXT_PUBLIC_FLEET_LOCAL === "1";
  const pages: PaletteItem[] = [
    { label: "Home — Operating Loop", href: "/", hint: "storefront" },
    { label: "What we sell — the portfolio", href: "/offers", hint: "storefront" },
    { label: "Try live search", href: "/try", hint: "action" },
    { label: "Research — experiment museum", href: "/research", hint: "storefront" },
    { label: "Pricing", href: "/pricing", hint: "storefront" },
    { label: "Store", href: "/store", hint: "storefront" },
    { label: "Contact — start a briefing", href: "/contact", hint: "action" },
    { label: "Feedback", href: "/feedback", hint: "storefront" },
  ];
  const sites: PaletteItem[] = listSites({ status: "active" })
    .filter((s) => s.id !== "storefront" && s.appPath)
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
        <FleetShell siteId="storefront">{children}</FleetShell>
        <CommandPalette items={paletteItems()} />
      </body>
    </html>
  );
}
