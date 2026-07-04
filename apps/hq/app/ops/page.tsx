import { PageHeader } from "@synthaembed/ui-fleet";
import { adminDatalabSources, adminSubmissions, adminUsage } from "@synthaembed/ui-fleet/admin-api";
import { getSiteCircuit } from "@synthaembed/fleet";
import { OpsConsole } from "../../components/OpsConsole";

export const dynamic = "force-dynamic";
export const metadata = { title: "Division Ops" };

export default async function OpsPage() {
  const surface = getSiteCircuit("hq");
  let sources: any[] = [];
  let jobs: any[] = [];
  let submissions: any[] = [];
  let usage: { sinceDays: number; workspaces: Record<string, Record<string, number>> } = {
    sinceDays: 31,
    workspaces: {},
  };
  let error: string | null = null;
  try {
    const [src, subs, use] = await Promise.all([
      adminDatalabSources(),
      adminSubmissions(),
      adminUsage(),
    ]);
    sources = src.sources ?? [];
    jobs = src.recentJobs ?? [];
    submissions = subs.items ?? [];
    usage = use ?? usage;
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return (
    <>
      <PageHeader
        eyebrow={surface?.eyebrow}
        title="Division operations — Data Refinery"
        lead="Source registry health, on-demand harvests, and the consented-contribution review queue. Admin-keyed and internal (Spec 0018 amendment: this console deliberately lives off the public site)."
      />
      {error ? (
        <div className="bh-alert bh-alert--error">
          Ops data unavailable: {error} — requires <code>API_SECRET_KEY</code> on
          this deployment.
        </div>
      ) : (
        <OpsConsole sources={sources} jobs={jobs} submissions={submissions} usage={usage} />
      )}
    </>
  );
}
