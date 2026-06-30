import { hallOfCone } from "@/lib/baselines";
import { dumbnessLabel } from "@/lib/scoring";
import { ConeMascot, DumbnessMeter, HenMascot } from "@/components/site";

export function HallOfConeTable() {
  const rows = hallOfCone();

  return (
    <div className="bh-table-wrap">
      <div className="bh-table-toolbar">
        <ConeMascot size={36} />
        <div>
          <div className="bh-card__title">Hall of Cone</div>
          <div className="bh-card__subtitle">
            Lowest effective rank wins. Reference panel for baseline embedders.
          </div>
        </div>
      </div>
      <table className="bh-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Model</th>
            <th>erank</th>
            <th>nDCG@10</th>
            <th>Collapse score</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m, i) => (
            <tr
              key={m.id}
              className={m.isHen ? "is-highlight" : i === 0 ? "is-top" : undefined}
            >
              <td className="bh-mono">{i === 0 && !m.isHen ? "★" : i + 1}</td>
              <td>
                <div className="bh-card__header" style={{ marginBottom: 0 }}>
                  {m.isHen ? <HenMascot size={24} /> : <ConeMascot size={24} />}
                  <div>
                    <div className="bh-card__title">{m.name}</div>
                    <div className="bh-card__subtitle">{m.vendor}</div>
                  </div>
                </div>
              </td>
              <td className="bh-mono">{m.effectiveRank.toFixed(1)}</td>
              <td className="bh-mono">{m.ndcg10.toFixed(2)}</td>
              <td style={{ minWidth: 160 }}>
                <DumbnessMeter score={m.dumbnessScore} label={dumbnessLabel(m.dumbnessScore)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
