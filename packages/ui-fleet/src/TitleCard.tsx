import { Marginalia } from "./Marginalia";

/** Wes Anderson overture frame — the centered chapter card that opens a
 *  homepage. Hairline rule above and below, mono eyebrow, Instrument Serif
 *  title, optional marginalia caption. The title is set with intent, not
 *  default flow. */
export function TitleCard({
  eyebrow,
  title,
  marginalia,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  /** Short factual side-caption rendered below the title (mono). */
  marginalia?: React.ReactNode;
  /** Optional lead paragraph under the title. */
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={`bh-title-card${className ? ` ${className}` : ""}`}>
      {eyebrow && <span className="bh-title-card__eyebrow">{eyebrow}</span>}
      <h1 className="bh-title-card__title">{title}</h1>
      {marginalia != null && (
        <Marginalia className="bh-title-card__marginalia">
          {marginalia}
        </Marginalia>
      )}
      {children && <div className="bh-title-card__lead">{children}</div>}
    </header>
  );
}
