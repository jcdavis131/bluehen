export function StatTile({
  label,
  value,
  hero = false,
}: {
  label: string;
  value: string | number;
  hero?: boolean;
}) {
  return (
    <div className="stat-tile">
      <div className="stat-tile__label">{label}</div>
      <div className={`stat-tile__value${hero ? " stat-tile__value--hero" : ""}`}>
        {typeof value === "number" ? formatStat(value) : value}
      </div>
    </div>
  );
}

export function formatStat(v: number): string {
  if (!Number.isFinite(v)) return String(v);
  if (Math.abs(v) >= 1000) return v.toFixed(0);
  if (Math.abs(v) >= 10) return v.toFixed(1);
  if (Math.abs(v) >= 0.01 || v === 0) return v.toFixed(3);
  return v.toExponential(1);
}
