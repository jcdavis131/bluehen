import "@synthaembed/ui-fleet/styles.css";
import { CommandPalette, FleetShell, siteHref, type PaletteItem } from "@synthaembed/ui-fleet";
import { listSites } from "@synthaembed/fleet";

export const metadata = {
  metadataBase: new URL("https://slasso.com"),
  title: {
    default: "Validation Lab — Blue Hen RE",
    template: "%s — Validation Lab · Blue Hen RE",
  },
  description: "Paid RAG certification, published scorecards, and the promotion queue.",
  openGraph: { siteName: "Validation Lab · Blue Hen RE", type: "website" },
};

function paletteItems(): PaletteItem[] {
  const local = process.env.NEXT_PUBLIC_FLEET_LOCAL === "1";
  const pages: PaletteItem[] = [
    { label: "Home — benchmark overview", href: "/", hint: "validation" },
    { label: "Get certified — how it works", href: "/certify", hint: "action" },
    { label: "Run a benchmark", href: "/try", hint: "action" },
    { label: "Scorecards — published results", href: "/scorecards", hint: "validation" },
    { label: "Feedback", href: "/feedback", hint: "validation" },
    // De-navved (UX-104) but still a real route — keyboard-first access only.
    { label: "Validation queue — BD promotion pipeline", href: "/queue", hint: "internal" },
  ];
  const sites: PaletteItem[] = listSites({ status: "active" })
    .filter((s) => s.id !== "validation" && s.appPath)
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
        <FleetShell siteId="validation">{children}</FleetShell>
        <CommandPalette items={paletteItems()} />
      </body>
    </html>
  );
}
