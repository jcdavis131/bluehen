import "./globals.css";
import "@synthaembed/ui-fleet/styles.css";
import { FleetShell } from "@synthaembed/ui-fleet";

export const metadata = {
  title: "Dumb Model — How dumb is your embedding?",
  description: "Public proof that collapse is measurable.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <FleetShell siteId="dumbmodel">{children}</FleetShell>
      </body>
    </html>
  );
}
