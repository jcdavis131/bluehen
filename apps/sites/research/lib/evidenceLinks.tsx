/** Link EVIDENCE.md citations to the canonical GitHub blob (UX-108). */

const REPO =
  process.env.NEXT_PUBLIC_GITHUB_REPO?.replace(/\/$/, "") ??
  "https://github.com/jcdavis131/bluehenre";

const EVIDENCE_BLOB = `${REPO}/blob/main/EVIDENCE.md`;

/** Turn "EVIDENCE.md §3.1" or "EVIDENCE §3.7 (B)" into a GitHub URL. */
export function evidenceHref(ref: string): string {
  const m = ref.match(/(?:EVIDENCE(?:\.md)?)\s*(?:§|#)\s*([\d.]+)/i);
  if (m) {
    const anchor = m[1]!.replace(/\./g, "-");
    return `${EVIDENCE_BLOB}#${anchor}`;
  }
  if (/EVIDENCE/i.test(ref)) return EVIDENCE_BLOB;
  return `${REPO}/blob/main/${ref.replace(/\s+/g, "")}`;
}

export function EvidenceLink({ ref }: { ref: string }) {
  return (
    <a href={evidenceHref(ref)} target="_blank" rel="noopener noreferrer">
      {ref}
    </a>
  );
}
