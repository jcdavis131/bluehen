/** Link EVIDENCE.md citations to the canonical GitHub blob (UX-108). */

const REPO =
  process.env.NEXT_PUBLIC_GITHUB_REPO?.replace(/\/$/, "") ??
  "https://github.com/jcdavis131/bluehenre";

const EVIDENCE_BLOB = `${REPO}/blob/main/EVIDENCE.md`;

/** Turn "EVIDENCE.md §3.1" or "EVIDENCE §3.7 (B)" into a GitHub URL. */
export function evidenceHref(refStr: string): string {
  const m = refStr.match(/(?:EVIDENCE(?:\.md)?)\s*(?:§|#)\s*([\d.]+)/i);
  if (m) {
    const anchor = m[1]!.replace(/\./g, "-");
    return `${EVIDENCE_BLOB}#${anchor}`;
  }
  if (/EVIDENCE/i.test(refStr)) return EVIDENCE_BLOB;
  return `${REPO}/blob/main/${refStr.replace(/\s+/g, "")}`;
}

export function EvidenceLink({ evidenceRef, refStr }: { evidenceRef?: string; refStr?: string }) {
  const value = evidenceRef ?? refStr ?? "";
  return (
    <a href={evidenceHref(value)} target="_blank" rel="noopener noreferrer">
      {value}
    </a>
  );
}
