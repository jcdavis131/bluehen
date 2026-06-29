export function PageHeader({
  eyebrow,
  title,
  lead,
  badge,
  children,
}: {
  eyebrow?: string;
  title: string;
  lead?: React.ReactNode;
  badge?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="bh-page-header">
      {eyebrow && <span className="bh-eyebrow">{eyebrow}</span>}
      <div className="bh-page-header__row">
        <h1 className="bh-title">{title}</h1>
        {badge}
      </div>
      {lead && <p className="bh-lead bh-lead--top">{lead}</p>}
      {children}
    </header>
  );
}
