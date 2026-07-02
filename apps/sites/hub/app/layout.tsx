import "@synthaembed/ui-fleet/styles.css";
import { CommandPalette, FleetShell, siteHref, type PaletteItem } from "@synthaembed/ui-fleet";
import { listSites } from "@synthaembed/fleet";

export const metadata = {
  title: "Blue Hen RE — Hub",
  description: "Platform hub · ASN lifecycle dashboard",
};

function paletteItems(): PaletteItem[] {
  const local = process.env.NEXT_PUBLIC_FLEET_LOCAL === "1";
  const pages: PaletteItem[] = [
    { label: "Home — Operating Loop", href: "/", hint: "hub" },
    { label: "Try live search", href: "/try", hint: "action" },
    { label: "Research — experiment museum", href: "/research", hint: "hub" },
    { label: "Pricing", href: "/pricing", hint: "hub" },
    { label: "Store", href: "/store", hint: "hub" },
    { label: "Contact — start a briefing", href: "/contact", hint: "action" },
    { label: "Feedback", href: "/feedback", hint: "hub" },
  ];
  const sites: PaletteItem[] = listSites({ status: "active" })
    .filter((s) => s.id !== "hub" && s.appPath)
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
        <FleetShell siteId="hub">{children}</FleetShell>
        <CommandPalette items={paletteItems()} />
      </body>
    </html>
  );
}
