import "@synthaembed/ui-fleet/styles.css";
import { FleetShell } from "@synthaembed/ui-fleet";

export const metadata = {
  title: "Simulation Lab — signals.bhenre.com",
  description:
    "Published paper-trading strategy reports across prediction markets, DFS, and equities — simulation only, no live capital (Spec 0013)",
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
