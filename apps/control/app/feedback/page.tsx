import { FeedbackForm, PageHeader, SiteSubnav } from "@synthaembed/ui-fleet";
import { getSiteNav, GLOSSARY } from "@synthaembed/fleet";

export const metadata = {
  title: `${GLOSSARY.feedback} — Operations Center`,
};

export default function ControlFeedbackPage() {
  const nav = getSiteNav("control");

  return (
    <>
      <PageHeader
        eyebrow="Operations Center · jcamd.com"
        title={GLOSSARY.feedback}
        lead="Operator feedback routes to Platform Orchestration for prioritization and data requests."
      />
      <SiteSubnav items={nav} currentPath="/feedback" />
      <FeedbackForm siteId="control" division="orchestration" />
    </>
  );
}
