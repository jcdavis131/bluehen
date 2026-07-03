/** A chapter of content. Hairline top rule + mono section label, then the
 *  body. Pages read like chapters, not a scroll of boxes. */
export function RuledSection({
  label,
  as: Tag = "section",
  className,
  children,
}: {
  label: string;
  as?: "section" | "div" | "article";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Tag className={`bh-ruled-section${className ? ` ${className}` : ""}`}>
      <span className="bh-ruled-section__label">{label}</span>
      <div className="bh-ruled-section__body">{children}</div>
    </Tag>
  );
}
