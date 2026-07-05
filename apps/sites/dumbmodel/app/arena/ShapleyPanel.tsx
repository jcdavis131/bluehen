"use client";

type FactorShapley = Record<string, number>;
type PickShapley = { round: number | null; id: string; phi: number };

const FACTOR_LABELS: Record<string, string> = {
  personal: "Personal taste",
  query: "Deck theme",
  boosts: "Boosts",
};

/** Shapley panel (Spec 0032 §5): marginal contribution to prediction. */
export function ShapleyPanel({
  factors,
  picks,
}: {
  factors: FactorShapley;
  picks: PickShapley[];
}) {
  const factorEntries = Object.entries(factors);
  const maxAbs = Math.max(...factorEntries.map(([, v]) => Math.abs(v)), 0.001);

  return (
    <div className="arena-shapley">
      <p className="arena-shapley-lead">Marginal contribution to the model&apos;s prediction</p>
      <div className="arena-shapley-factors">
        {factorEntries.map(([key, phi]) => (
          <div key={key} className="arena-shapley-row">
            <span className="arena-shapley-label">{FACTOR_LABELS[key] ?? key}</span>
            <div className="arena-shapley-bar-wrap" aria-hidden>
              <div
                className="arena-shapley-bar"
                style={{ width: `${(Math.abs(phi) / maxAbs) * 100}%` }}
              />
            </div>
            <span className="arena-shapley-val">{phi >= 0 ? "+" : ""}{phi.toFixed(3)}</span>
          </div>
        ))}
      </div>
      {picks.length > 0 && (
        <div className="arena-shapley-picks">
          <span className="arena-shapley-picks-label">Past picks</span>
          <div className="arena-shapley-chips">
            {picks.map((p) => (
              <span key={`${p.id}-${p.round}`} className="arena-shapley-chip">
                {p.id === "_remainder"
                  ? `other picks ${p.phi >= 0 ? "+" : ""}${p.phi.toFixed(3)}`
                  : `R${p.round} ${p.phi >= 0 ? "+" : ""}${p.phi.toFixed(3)}`}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
