/** Kubrick one-point perspective column — a single centered reading axis.
 *  `max-width: var(--bh-axis)` (or `--bh-axis-wide` for data pages), centered.
 *  Below 768px the block fills the viewport so content collapses to
 *  left-aligned (symmetry is a desktop property). Pure presentational. */
export function Axis({
  wide = false,
  as: Tag = "div",
  className,
  children,
}: {
  /** Use the wider 1080px axis for data-dense pages. */
  wide?: boolean;
  as?: "div" | "section" | "main" | "article";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Tag
      className={`bh-axis${wide ? " bh-axis--wide" : ""}${
        className ? ` ${className}` : ""
      }`}
    >
      {children}
    </Tag>
  );
}
