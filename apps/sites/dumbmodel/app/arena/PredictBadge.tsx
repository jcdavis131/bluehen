"use client";

/** Co-host guess — blind-rank video energy, not a dashboard widget. */
export function PredictBadge({
  predictedText,
  confidence,
  note,
  showMeter = true,
}: {
  predictedText: string;
  confidence: number;
  note?: string | null;
  showMeter?: boolean;
}) {
  const pct = Math.round(confidence * 100);
  return (
    <div className="arena-host-guess" aria-label={`We would pick ${predictedText}`}>
      <span className="arena-host-guess-label">We&apos;d pick</span>
      <p className="arena-host-guess-text">{predictedText}</p>
      {showMeter && (
        <div className="arena-host-guess-meter" aria-hidden>
          <div className="arena-host-guess-fill" style={{ width: `${pct}%` }} />
        </div>
      )}
      {note && <p className="arena-host-guess-note">{note}</p>}
    </div>
  );
}
