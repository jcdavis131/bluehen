/** Fleet mascots (shared home: moved up from dumbmodel so sites reuse
 * rather than fork). Restrained personality — max one mascot per page. */

export function ConeMascot({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id="bhConeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#9a958c" />
          <stop offset="100%" stopColor="#5c5852" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="54" rx="18" ry="5" fill="#3a3834" opacity="0.5" />
      <path d="M32 8 L52 52 L12 52 Z" fill="url(#bhConeGrad)" stroke="#4a4640" strokeWidth="1.5" />
      <circle cx="26" cy="38" r="3" fill="#2a2826" />
      <circle cx="38" cy="38" r="3" fill="#2a2826" />
      <path d="M24 46 Q32 50 40 46" stroke="#2a2826" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function HenMascot({
  size = 48,
  gaze = 0,
}: {
  size?: number;
  /** Horizontal gaze, -1 (left) … 1 (right) — e.g. toward the active
   * division's position in the operating loop. */
  gaze?: number;
}) {
  const dx = Math.max(-1, Math.min(1, gaze)) * 2.5;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <ellipse cx="32" cy="52" rx="16" ry="4" fill="#1a3a5c" opacity="0.4" />
      <ellipse cx="32" cy="36" rx="20" ry="18" fill="#3d8bfd" />
      <circle cx="32" cy="28" r="14" fill="#5aa3ff" />
      <path d="M44 22 L58 18 L44 28 Z" fill="#e8a030" />
      <circle cx={28 + dx} cy="26" r="3" fill="#0f2744" style={{ transition: "cx 300ms" }} />
      <circle cx={36 + dx} cy="26" r="3" fill="#0f2744" style={{ transition: "cx 300ms" }} />
      <path d="M22 14 Q28 6 34 12" stroke="#e8a030" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M18 40 L12 52 M46 40 L52 48" stroke="#2563a8" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
