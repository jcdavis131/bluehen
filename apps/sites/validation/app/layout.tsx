import "@synthaembed/ui-fleet/styles.css";
import { FleetShell } from "@synthaembed/ui-fleet";

export const metadata = {
  metadataBase: new URL("https://slasso.com"),
  title: {
    default: "Validation Lab — Blue Hen RE",
    template: "%s — Validation Lab · Blue Hen RE",
  },
  description: "Paid RAG certification, published scorecards, and the promotion queue.",
  openGraph: { siteName: "Validation Lab · Blue Hen RE", type: "website" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <FleetShell siteId="validation">{children}</FleetShell>
      </body>
    </html>
  );
}
