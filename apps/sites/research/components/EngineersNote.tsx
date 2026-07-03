/** Collapsed "For engineers" disclosure for internal ops commands.
 *
 * Keeps operational commands available to technical readers without
 * surfacing them to every visitor (Spec 0020, UX-130). Native <details>,
 * so it renders in both server and client components. */
export function EngineersNote({
  summary,
  children,
  open,
}: {
  summary: string;
  children: React.ReactNode;
  /** Render expanded (e.g. when surrounding copy points the reader here). */
  open?: boolean;
}) {
  return (
    <details open={open} style={{ marginTop: 8 }}>
      <summary style={{ cursor: "pointer", color: "var(--bh-muted)", fontSize: 12 }}>
        {summary}
      </summary>
      <p style={{ margin: "8px 0 0", lineHeight: 1.55 }}>{children}</p>
    </details>
  );
}
