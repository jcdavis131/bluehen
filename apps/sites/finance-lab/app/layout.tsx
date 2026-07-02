import "@synthaembed/ui-fleet/styles.css";
import { FleetShell } from "@synthaembed/ui-fleet";

export const metadata = {
  title: "Omni-Market Simulation Lab — Phase B",
  description: "Paper-trading across prediction markets, DFS, and equities — simulation only (Spec 0013)",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <FleetShell siteId="finance-lab">{children}</FleetShell>
      </body>
    </html>
  );
}
