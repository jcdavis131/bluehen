import "./globals.css";
import "@synthaembed/ui-fleet/styles.css";
import { FleetShell } from "@synthaembed/ui-fleet";

export const metadata = {
  metadataBase: new URL("https://dumbmodel.com"),
  title: {
    default: "Baseline Comparison — Blue Hen RE",
    template: "%s — Baseline Comparison · Blue Hen RE",
  },
  description: "Free embedder health check and collapse diagnostics — every score is measured.",
  openGraph: { siteName: "Baseline Comparison · Blue Hen RE", type: "website" },
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
