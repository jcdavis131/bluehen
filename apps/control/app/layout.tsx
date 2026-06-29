import "@synthaembed/ui-fleet/styles.css";
import { FleetShell } from "@synthaembed/ui-fleet";

export const metadata = {
  title: "Blue Hen RE — Fleet Control",
  description: "Operator control plane",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <FleetShell siteId="control">{children}</FleetShell>
      </body>
    </html>
  );
}
