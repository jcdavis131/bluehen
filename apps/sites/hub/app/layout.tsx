import "@synthaembed/ui-fleet/styles.css";
import { FleetShell } from "@synthaembed/ui-fleet";

export const metadata = {
  title: "Blue Hen RE — Hub",
  description: "Platform hub · ASN lifecycle dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <FleetShell siteId="hub">{children}</FleetShell>
      </body>
    </html>
  );
}
