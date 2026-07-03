import "@synthaembed/ui-fleet/styles.css";
import "./console.css";
import { FleetShell } from "@synthaembed/ui-fleet";

export const metadata = {
  metadataBase: new URL("https://training.jcamd.com"),
  title: {
    default: "Observatory — Blue Hen RE",
    template: "%s — Observatory · Blue Hen RE",
  },
  description: "Live training telemetry: loss curves, effective-rank monitoring, collapse alerts.",
  openGraph: { siteName: "Observatory · Blue Hen RE", type: "website" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <FleetShell siteId="observatory">
          <div className="console-root">{children}</div>
        </FleetShell>
      </body>
    </html>
  );
}
