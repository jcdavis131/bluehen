import { PageHeader } from "@synthaembed/ui-fleet";
import { LaunchpadWizard } from "./LaunchpadWizard";

export const metadata = {
  title: "Launchpad",
  description:
    "Describe a few fields, upload up to 50 documents, and watch the loop train, gate, and serve a recommender end to end — in a shared sandbox, no account required.",
};

export default function LaunchpadPage() {
  return (
    <>
      <PageHeader
        eyebrow="Launchpad"
        title="See the loop run on your data"
        lead="Describe a few fields, paste in up to 50 rows, and watch training, gating, and serving happen for real — in a shared sandbox, no account required."
      />
      <LaunchpadWizard />
    </>
  );
}
