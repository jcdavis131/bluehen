/** Staggered entrance wrapper: children rise in sequence on load.
 * Pure CSS animation (`.bh-rise`), so it is server-renderable and fully
 * static under prefers-reduced-motion. Wrap grid children, not grids. */
export function Reveal({
  index = 0,
  children,
  className,
  as: Tag = "div",
}: {
  /** Position in the stagger sequence (70ms per step). */
  index?: number;
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section" | "li" | "span";
}) {
  return (
    <Tag
      className={`bh-rise${className ? ` ${className}` : ""}`}
      style={{ ["--rise-i" as string]: index }}
    >
      {children}
    </Tag>
  );
}
