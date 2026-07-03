import "@synthaembed/ui-fleet/styles.css";
import { FleetShell } from "@synthaembed/ui-fleet";

export const metadata = {
  metadataBase: new URL("https://jcamd.com"),
  title: {
    default: "Headquarters — Blue Hen RE",
    template: "%s — Headquarters · Blue Hen RE",
  },
  description: "The org hub: fleet directory, live operating loop, lifecycle controls.",
  openGraph: { siteName: "Headquarters · Blue Hen RE", type: "website" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <FleetShell siteId="hq">{children}</FleetShell>
      </body>
    </html>
  );
}
