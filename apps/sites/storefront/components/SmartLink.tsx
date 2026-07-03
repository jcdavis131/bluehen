import Link from "next/link";

/** Renders next/link for internal paths and a plain anchor for cross-site
 *  URLs — one place for the internal-vs-external decision so /offers and
 *  /pricing can't drift (UX-110/111). */
export function SmartLink({
  href,
  className,
  style,
  children,
}: {
  href: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  if (href.startsWith("http")) {
    return (
      <a className={className} style={style} href={href}>
        {children}
      </a>
    );
  }
  return (
    <Link className={className} style={style} href={href}>
      {children}
    </Link>
  );
}
