"use client";

type LayerStack = {
  personal: number;
  query: number;
  boosts: number;
  lit: string[];
};

/** Layer stack viz (Spec 0032 §5): honest policy weights lighting up. */
export function LayerStackViz({
  stack,
  title,
}: {
  stack: LayerStack;
  title?: string;
}) {
  const layers: { key: keyof Omit<LayerStack, "lit">; label: string }[] = [
    { key: "personal", label: "Personal taste" },
    { key: "query", label: "Deck theme" },
    { key: "boosts", label: "Boosts" },
  ];

  return (
    <div className="arena-layer-stack" aria-label={title ?? "Rank engine layer stack"}>
      {title && <p className="arena-layer-title">{title}</p>}
      {layers.map(({ key, label }) => {
        const weight = stack[key];
        const lit = stack.lit.includes(key);
        return (
          <div key={key} className={`arena-layer${lit ? " is-lit" : ""}`}>
            <div className="arena-layer-head">
              <span>{label}</span>
              <span className="arena-layer-weight">{Math.round(weight * 100)}%</span>
            </div>
            <div className="arena-layer-bar" aria-hidden>
              <div
                className="arena-layer-fill"
                style={{ width: `${Math.min(100, weight * 100)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
