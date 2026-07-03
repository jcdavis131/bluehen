/** Small mono side-label / caption — twee but disciplined. Short and
 *  factual; enterprise B2B voice, no decoration. */
export function Marginalia({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <aside className={`bh-marginalia${className ? ` ${className}` : ""}`}>
      {children}
    </aside>
  );
}
