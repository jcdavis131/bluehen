import "@synthaembed/ui-fleet/styles.css";
import { FleetShell } from "@synthaembed/ui-fleet";

export const metadata = {
  metadataBase: new URL("https://signals.bhenre.com"),
  title: {
    default: "Simulation Lab — Blue Hen RE",
    template: "%s — Simulation Lab · Blue Hen RE",
  },
  description: "Paper-trading strategy reports across prediction markets, DFS, and equities — simulation only, no live capital.",
  openGraph: { siteName: "Simulation Lab · Blue Hen RE", type: "website" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <FleetShell siteId="simulation">{children}</FleetShell>
      </body>
    </html>
  );
}
