export function ApiStatusBanner({
  online,
  apiKeyConfigured,
  modelVersion,
  indexedHint,
}: {
  online: boolean;
  apiKeyConfigured: boolean;
  modelVersion?: string | null;
  indexedHint?: string;
}) {
  const ready = online && apiKeyConfigured;
  return (
    <div className={`bh-badge ${ready ? "bh-badge--ok" : "bh-badge--warn"}`} style={{ marginBottom: 16 }}>
      <span>{ready ? "API connected" : "Offline / not configured"}</span>
      {modelVersion && <> · {modelVersion}</>}
      {indexedHint && <> · {indexedHint}</>}
      {!apiKeyConfigured && <> · set SYNTH_API_KEY</>}
    </div>
  );
}
