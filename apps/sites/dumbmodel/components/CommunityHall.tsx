import Link from "next/link";
import { CountUpStat } from "@synthaembed/ui-fleet";
import { ConeMascot, DumbnessMeter } from "@/components/site";
import { dumbnessLabel } from "@/lib/scoring";
import { collapseScore } from "@/lib/share";
import type { HallFeed } from "@/lib/hall";

/**
 * Community submissions panel (Spec 0020, UX-121): consented, anonymous
 * scores from /check, read back from the Operations Ledger. Every row is a
 * measured /v1/diagnose result — no seeded or fabricated entries, and the
 * offline state says "offline", never "empty".
 */
export function CommunityHall({ feed }: { feed: HallFeed }) {
  const { online, submissions } = feed;

  return (
    <section aria-label="Community submissions" style={{ marginTop: "var(--bh-space-6)" }}>
      <div className="bh-table-wrap">
        <div className="bh-table-toolbar">
          <ConeMascot size={36} />
          <div>
            <div className="bh-card__title">Community submissions</div>
            <div className="bh-card__subtitle">
              {online && submissions.length > 0 ? (
                <>
                  <CountUpStat value={submissions.length} /> consented score
                  {submissions.length === 1 ? "" : "s"} from the free health check — most
                  collapsed first. Sample scores, not model rankings: each row is one
                  visitor&apos;s text measured under the production embedder.
                </>
              ) : (
                "Consented scores from the free health check land here."
              )}
            </div>
          </div>
        </div>

        {!online ? (
          <p className="bh-card__body" style={{ padding: "0 var(--bh-space-4) var(--bh-space-4)" }}>
            The community board is offline right now — core-api isn&apos;t reachable, so
            there are no scores to show (and we don&apos;t fake any). The reference panel
            above is static and unaffected.
          </p>
        ) : submissions.length === 0 ? (
          <p className="bh-card__body" style={{ padding: "0 var(--bh-space-4) var(--bh-space-4)" }}>
            No community scores yet. <Link href="/check">Run the health check</Link> and
            opt in on the result to put the first one on the board.
          </p>
        ) : (
          <table className="bh-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Sample</th>
                <th>erank</th>
                <th>utilization</th>
                <th>Collapse score</th>
                <th>measured under</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((s, i) => {
                const score = collapseScore(s.utilization);
                return (
                  <tr key={`${s.ts ?? "t"}-${i}`} className={i === 0 ? "is-top" : undefined}>
                    <td className="bh-mono">{i + 1}</td>
                    <td>
                      <div className="bh-card__title">{s.name}</div>
                      <div className="bh-card__subtitle">
                        {s.samples} samples · {s.dims}d
                        {s.ts ? ` · ${new Date(s.ts).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : ""}
                      </div>
                    </td>
                    <td className="bh-mono">
                      {s.effectiveRank.toFixed(1)}/{s.maxPossibleRank.toFixed(0)}
                    </td>
                    <td className="bh-mono">{Math.round(s.utilization * 100)}%</td>
                    <td style={{ minWidth: 160 }}>
                      <DumbnessMeter score={score} label={dumbnessLabel(score)} />
                    </td>
                    <td className="bh-mono">{s.modelVersion}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {online && (
        <p className="bh-meta" style={{ marginTop: 8 }}>
          Anonymous by design — display name and measured numbers only, from the most
          recent {feed.window} ledger entries. Add yours from the{" "}
          <Link href="/check">health check</Link>.
        </p>
      )}
    </section>
  );
}
