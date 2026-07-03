/** Line-drawn hairline frame for data panels — 1px `--bh-rule`, not ASCII.
 *  Distinct from the 2px structural card border; never mix the two inside
 *  one panel. Optional mono label in the top rule. */
export function TTYFrame({
  label,
  as: Tag = "div",
  className,
  children,
}: {
  label?: string;
  as?: "div" | "section" | "figure";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Tag className={`bh-tty-frame${className ? ` ${className}` : ""}`}>
      {label && <span className="bh-tty-frame__label">{label}</span>}
      <div className="bh-tty-frame__body">{children}</div>
    </Tag>
  );
}
