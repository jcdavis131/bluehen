"use client";

/**
 * Spec 0027 §2 step 4 — filter chips generated FROM a metadata contract's
 * `filterable` declarations (Spec 0024). Emits the exact filter DSL shape
 * `/v1/recommend` expects (services/core-api/app/services/filters.py):
 *   - keyword eq   → { field: value }
 *   - number range → { field: { gte?, lte? } }
 *   - date range   → { field: { gte?, lte? } }
 *   - geo          → not filterable yet; renders a disabled chip
 * Empty range bounds are omitted; a field with no bounds set is omitted
 * from the emitted filters object entirely.
 */

export type FilterableField = {
  name: string;
  type: "keyword" | "number" | "date" | "geo";
};

export type FilterValue = Record<string, unknown>;

export function FilterChips({
  filterable,
  value,
  onChange,
}: {
  filterable: FilterableField[];
  value: FilterValue;
  onChange: (filters: FilterValue) => void;
}) {
  function setField(field: string, next: unknown) {
    const nextValue: FilterValue = { ...value };
    if (next === undefined) {
      delete nextValue[field];
    } else {
      nextValue[field] = next;
    }
    onChange(nextValue);
  }

  function setRange(field: string, key: "gte" | "lte", raw: string, kind: "number" | "date") {
    const existing = value[field];
    const current: Record<string, unknown> =
      existing && typeof existing === "object" ? { ...(existing as Record<string, unknown>) } : {};
    if (raw === "") {
      delete current[key];
    } else {
      current[key] = kind === "number" ? Number(raw) : raw;
    }
    setField(field, Object.keys(current).length === 0 ? undefined : current);
  }

  return (
    <div className="bh-filter-chips" role="group" aria-label="Filters">
      {filterable.map((f) => {
        if (f.type === "geo") {
          return (
            <div className="bh-filter-chip bh-filter-chip--geo" key={f.name}>
              <span className="bh-label">{f.name}</span>
              <span
                className="bh-btn bh-btn--chip"
                aria-disabled="true"
                title="Geo filtering pending PostGIS adoption (Spec 0024)"
              >
                geo (coming soon)
              </span>
            </div>
          );
        }

        if (f.type === "keyword") {
          const current = typeof value[f.name] === "string" ? (value[f.name] as string) : "";
          return (
            <div className="bh-filter-chip" key={f.name}>
              <label className="bh-label" htmlFor={`filter-${f.name}`}>
                {f.name}
              </label>
              <input
                id={`filter-${f.name}`}
                className="bh-input"
                type="text"
                value={current}
                placeholder={f.name}
                onChange={(e) => setField(f.name, e.target.value === "" ? undefined : e.target.value)}
              />
            </div>
          );
        }

        if (f.type === "number") {
          const existing = value[f.name];
          const range =
            existing && typeof existing === "object" ? (existing as { gte?: number; lte?: number }) : {};
          return (
            <div className="bh-filter-chip" key={f.name}>
              <span className="bh-label">{f.name}</span>
              <div className="bh-filter-chip__range">
                <input
                  className="bh-input"
                  type="number"
                  inputMode="decimal"
                  placeholder="min"
                  aria-label={`${f.name} minimum`}
                  value={range.gte ?? ""}
                  onChange={(e) => setRange(f.name, "gte", e.target.value, "number")}
                />
                <input
                  className="bh-input"
                  type="number"
                  inputMode="decimal"
                  placeholder="max"
                  aria-label={`${f.name} maximum`}
                  value={range.lte ?? ""}
                  onChange={(e) => setRange(f.name, "lte", e.target.value, "number")}
                />
              </div>
            </div>
          );
        }

        // date
        const existing = value[f.name];
        const range =
          existing && typeof existing === "object" ? (existing as { gte?: string; lte?: string }) : {};
        return (
          <div className="bh-filter-chip" key={f.name}>
            <span className="bh-label">{f.name}</span>
            <div className="bh-filter-chip__range">
              <input
                className="bh-input"
                type="date"
                aria-label={`${f.name} from`}
                value={range.gte ?? ""}
                onChange={(e) => setRange(f.name, "gte", e.target.value, "date")}
              />
              <input
                className="bh-input"
                type="date"
                aria-label={`${f.name} to`}
                value={range.lte ?? ""}
                onChange={(e) => setRange(f.name, "lte", e.target.value, "date")}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
