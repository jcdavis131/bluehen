import "@synthaembed/ui-fleet/styles.css";
import { FleetShell } from "@synthaembed/ui-fleet";
import { SITE_ORIGIN } from "../lib/site";

export const metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: {
    default: "Data Refinery — Blue Hen RE",
    template: "%s — Data Refinery · Blue Hen RE",
  },
  description:
    "Provenance-carrying datasets, custom harvests, and dataset preparation — the Data Operations division of Blue Hen RE.",
  openGraph: { siteName: "Data Refinery · Blue Hen RE", type: "website" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <FleetShell siteId="refinery">{children}</FleetShell>
      </body>
    </html>
  );
}
