import "./globals.css";
import "@synthaembed/ui-fleet/styles.css";
import { FleetShell } from "@synthaembed/ui-fleet";

export const metadata = {
  metadataBase: new URL("https://dumbmodel.com"),
  title: {
    default: "Dumb Model — Blind Rank Arcade",
    template: "%s — dumbmodel.com",
  },
  description:
    "Rank anything blind: eight rapid picks, S-tier reveal, shareable like the viral videos. Beat the Baseline and measured proof tools underneath.",
  openGraph: { siteName: "dumbmodel.com", type: "website" },
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
