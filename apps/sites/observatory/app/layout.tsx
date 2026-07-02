import "@synthaembed/ui-fleet/styles.css";
import "./console.css";
import { FleetShell } from "@synthaembed/ui-fleet";

export const metadata = {
  title: "Training Observatory — Blue Hen RE",
  description:
    "Live training-run telemetry: loss curves, effective-rank monitoring, collapse alerts, and R2D curvature.",
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
