import "@synthaembed/ui-fleet/styles.css";
import { FleetShell } from "@synthaembed/ui-fleet";

export const metadata = {
  metadataBase: new URL("https://arxiviq.com"),
  title: {
    default: "Applied Research — Blue Hen RE",
    template: "%s — Applied Research · Blue Hen RE",
  },
  description: "Live arXiv retrieval assistant and the research method registry.",
  openGraph: { siteName: "Applied Research · Blue Hen RE", type: "website" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <FleetShell siteId="research">{children}</FleetShell>
      </body>
    </html>
  );
}
