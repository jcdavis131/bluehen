"use client";

/** Model prediction badge (Spec 0032 §5). */
export function PredictBadge({
  predictedText,
  confidence,
  note,
}: {
  predictedText: string;
  confidence: number;
  note?: string | null;
}) {
  return (
    <div className="arena-predict">
      <p className="arena-predict-label">Model picks</p>
      <p className="arena-predict-choice">{predictedText}</p>
      <div
        className="arena-predict-confidence"
        role="meter"
        aria-valuenow={Math.round(confidence * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Confidence ${Math.round(confidence * 100)} percent`}
      >
        <div className="arena-predict-bar" style={{ width: `${confidence * 100}%` }} />
      </div>
      <p className="arena-predict-confidence-label">{Math.round(confidence * 100)}% confident</p>
      {note && <p className="arena-predict-note">{note}</p>}
    </div>
  );
}
