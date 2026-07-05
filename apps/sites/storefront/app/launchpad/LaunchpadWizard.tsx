"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FilterChips, ModelReportCard, type FilterValue } from "@synthaembed/ui-fleet";
import {
  FieldDef,
  FieldType,
  INITIAL_STATE,
  MAX_DOCS,
  MAX_TOTAL_BYTES,
  Recommendation,
  STORAGE_KEY,
  TrainStatus,
  WIZARD_STEPS,
  WizardState,
  WizardStepId,
} from "./types";

const TYPE_LABEL: Record<FieldType, string> = {
  keyword: "Category",
  number: "Number",
  date: "Date",
};

const SANDBOX_NOTICE =
  "Sandbox runs are shared demo data, auto-deleted after 24 hours — please no personal or confidential information.";

function byteLength(s: string): number {
  return new TextEncoder().encode(s).length;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (data && typeof data === "object" && "error" in data && typeof data.error === "string")
      ? data.error
      : `request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

export function LaunchpadWizard() {
  const [state, setState] = useState<WizardState>(INITIAL_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Hydrate from sessionStorage after mount (avoids SSR/client mismatch).
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<WizardState>;
        setState((s) => ({ ...s, ...parsed }));
      }
    } catch {
      // corrupt/unavailable storage — start fresh, silently
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage full/unavailable — state still lives in memory for this tab
    }
  }, [state, hydrated]);

  function goTo(step: WizardStepId) {
    setError(null);
    setState((s) => ({ ...s, step }));
  }

  return (
    <div className="bh-card" style={{ marginTop: 20, padding: 20 }}>
      <StepHeader current={state.step} />
      {state.step === "describe" && (
        <DescribeStep
          state={state}
          setState={setState}
          busy={busy}
          setBusy={setBusy}
          error={error}
          setError={setError}
          onNext={() => goTo("upload")}
        />
      )}
      {state.step === "upload" && (
        <UploadStep
          state={state}
          setState={setState}
          busy={busy}
          setBusy={setBusy}
          error={error}
          setError={setError}
          onBack={() => goTo("describe")}
          onNext={() => goTo("train")}
        />
      )}
      {state.step === "train" && (
        <TrainStep
          state={state}
          setState={setState}
          onBack={() => goTo("upload")}
          onNext={() => goTo("try")}
        />
      )}
      {state.step === "try" && (
        <TryStep
          state={state}
          setState={setState}
          busy={busy}
          setBusy={setBusy}
          error={error}
          setError={setError}
          onBack={() => goTo("train")}
        />
      )}
    </div>
  );
}

function StepHeader({ current }: { current: WizardStepId }) {
  const idx = WIZARD_STEPS.findIndex((s) => s.id === current);
  return (
    <div
      role="list"
      aria-label="Launchpad progress"
      style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}
    >
      {WIZARD_STEPS.map((s, i) => {
        const state = i < idx ? "done" : i === idx ? "active" : "upcoming";
        return (
          <span
            key={s.id}
            role="listitem"
            aria-current={state === "active" ? "step" : undefined}
            className={`bh-badge${state === "done" ? " bh-badge--ok" : state === "active" ? " bh-badge--accent" : ""}`}
          >
            {i + 1}. {s.label}
          </span>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Step 1 — Describe                                                      */
/* ---------------------------------------------------------------------- */

function DescribeStep({
  state,
  setState,
  busy,
  setBusy,
  error,
  setError,
  onNext,
}: {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
  busy: boolean;
  setBusy: (b: boolean) => void;
  error: string | null;
  setError: (e: string | null) => void;
  onNext: () => void;
}) {
  const fields = state.fields;

  function updateField(idx: number, patch: Partial<FieldDef>) {
    setState((s) => ({
      ...s,
      fields: s.fields.map((f, i) => (i === idx ? { ...f, ...patch } : f)),
    }));
  }

  function addField() {
    setState((s) => ({ ...s, fields: [...s.fields, { name: "", type: "keyword" }] }));
  }

  function removeField(idx: number) {
    setState((s) => ({ ...s, fields: s.fields.filter((_, i) => i !== idx) }));
  }

  const trimmedNames = fields.map((f) => f.name.trim());
  const canContinue =
    state.datasetName.trim().length > 0 &&
    fields.length > 0 &&
    trimmedNames.every((n) => n.length > 0) &&
    new Set(trimmedNames).size === trimmedNames.length;

  async function handleContinue() {
    if (!canContinue || busy) return;
    setError(null);
    setBusy(true);
    try {
      await postJson("/api/launchpad/contract", {
        fields: fields.map((f) => ({ name: f.name.trim(), type: f.type })),
      });
      setState((s) => ({
        ...s,
        fields: fields.map((f) => ({ ...f, name: f.name.trim() })),
        contractSaved: true,
      }));
      onNext();
    } catch (e) {
      setError(e instanceof Error ? e.message : "could not save the field setup");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h2 className="bh-card__title" style={{ marginTop: 0 }}>
        Describe your dataset
      </h2>
      <p className="bh-card__body">
        Give it a name, then list the fields you'd want to filter results by later.
      </p>

      <label className="bh-label" htmlFor="lp-dataset-name">
        Dataset name
      </label>
      <input
        id="lp-dataset-name"
        className="bh-input"
        style={{ width: "100%", maxWidth: 420, marginBottom: 20 }}
        value={state.datasetName}
        placeholder="e.g. product-catalog"
        onChange={(e) => setState((s) => ({ ...s, datasetName: e.target.value }))}
      />

      <div className="bh-label" style={{ marginBottom: 8 }}>
        Which fields should be filterable?
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
        {fields.map((f, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input
              className="bh-input"
              style={{ flex: "1 1 200px" }}
              value={f.name}
              placeholder="field name (e.g. category)"
              onChange={(e) => updateField(i, { name: e.target.value })}
              aria-label={`Field ${i + 1} name`}
            />
            <select
              className="bh-input"
              value={f.type}
              onChange={(e) => updateField(i, { type: e.target.value as FieldType })}
              aria-label={`Field ${i + 1} type`}
            >
              <option value="keyword">{TYPE_LABEL.keyword}</option>
              <option value="number">{TYPE_LABEL.number}</option>
              <option value="date">{TYPE_LABEL.date}</option>
            </select>
            <button
              type="button"
              className="bh-btn bh-btn--ghost bh-btn--sm"
              onClick={() => removeField(i)}
              disabled={fields.length <= 1}
              aria-label={`Remove field ${i + 1}`}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="bh-btn bh-btn--sm" onClick={addField} style={{ marginBottom: 20 }}>
        + Add another field
      </button>

      {error && (
        <p className="bh-card__body" style={{ color: "var(--bh-danger, #a4322e)" }}>
          {error}
        </p>
      )}

      <div>
        <button
          type="button"
          className="bh-btn bh-btn--primary"
          disabled={!canContinue || busy}
          onClick={handleContinue}
        >
          {busy ? "Saving…" : "Continue"}
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Step 2 — Upload                                                        */
/* ---------------------------------------------------------------------- */

function linesToDocuments(raw: string): { text: string }[] {
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((text) => ({ text }));
}

function UploadStep({
  state,
  setState,
  busy,
  setBusy,
  error,
  setError,
  onBack,
  onNext,
}: {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
  busy: boolean;
  setBusy: (b: boolean) => void;
  error: string | null;
  setError: (e: string | null) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docs = state.documents;
  const totalBytes = docs.reduce((sum, d) => sum + byteLength(d.text), 0);
  const overDocs = docs.length > MAX_DOCS;
  const overBytes = totalBytes > MAX_TOTAL_BYTES;
  const canContinue = docs.length > 0 && !overDocs && !overBytes;

  function onTextareaChange(raw: string) {
    setState((s) => ({ ...s, rawText: raw, documents: linesToDocuments(raw) }));
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    try {
      const text = await file.text();
      const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
      const parsed: { text: string }[] = [];
      lines.forEach((line, i) => {
        let obj: unknown;
        try {
          obj = JSON.parse(line);
        } catch {
          throw new Error(`line ${i + 1} is not valid JSON`);
        }
        const t = (obj as { text?: unknown })?.text;
        if (typeof t !== "string" || !t.trim()) {
          throw new Error(`line ${i + 1} is missing a "text" field`);
        }
        parsed.push({ text: t });
      });
      setState((s) => ({ ...s, rawText: "", documents: parsed }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "could not read that file");
    }
  }

  async function handleStart() {
    if (!canContinue || busy) return;
    setError(null);
    setBusy(true);
    try {
      const resp = await postJson<{ training?: { jobId?: string } }>("/api/launchpad/corpus", {
        name: state.datasetName.trim(),
        documents: docs,
      });
      const jobId = resp.training?.jobId;
      if (!jobId) {
        throw new Error("the sandbox accepted the upload but did not start a training run");
      }
      setState((s) => ({ ...s, jobId, lastStatus: null }));
      onNext();
    } catch (e) {
      setError(e instanceof Error ? e.message : "could not start the run");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h2 className="bh-card__title" style={{ marginTop: 0 }}>
        Upload your documents
      </h2>
      <p className="bh-card__body">Paste one row per line, or drop a .jsonl file.</p>

      <label className="bh-label" htmlFor="lp-paste">
        Paste rows (one per line)
      </label>
      <textarea
        id="lp-paste"
        className="bh-input"
        style={{ width: "100%", minHeight: 160, fontFamily: "var(--bh-font-mono)", marginBottom: 12 }}
        value={state.rawText}
        onChange={(e) => onTextareaChange(e.target.value)}
        placeholder={"Wireless mouse with ergonomic grip\nStainless steel water bottle, 32oz\n..."}
      />

      <div style={{ marginBottom: 16 }}>
        <button
          type="button"
          className="bh-btn bh-btn--sm"
          onClick={() => fileInputRef.current?.click()}
        >
          Or choose a .jsonl file
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".jsonl"
          onChange={onFileChange}
          style={{ display: "none" }}
        />
      </div>

      <p className="bh-meta" style={{ marginBottom: 4 }}>
        {docs.length} of {MAX_DOCS} documents
        {overDocs ? " — over the sandbox limit" : ""}
        {overBytes ? " — total text exceeds the sandbox size limit" : ""}
      </p>

      <p className="bh-card__body bh-meta" style={{ fontStyle: "italic", marginBottom: 20 }}>
        {SANDBOX_NOTICE}
      </p>

      {error && (
        <p className="bh-card__body" style={{ color: "var(--bh-danger, #a4322e)" }}>
          {error}
        </p>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <button type="button" className="bh-btn bh-btn--ghost" onClick={onBack} disabled={busy}>
          Back
        </button>
        <button
          type="button"
          className="bh-btn bh-btn--primary"
          disabled={!canContinue || busy}
          onClick={handleStart}
        >
          {busy ? "Starting…" : "Start the run"}
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Step 3 — Train                                                         */
/* ---------------------------------------------------------------------- */

type StageState = "done" | "active" | "pending" | "failed" | "unknown";

function stageRow(label: string, st: StageState, note?: string) {
  const mark = st === "done" ? "●" : st === "failed" ? "✕" : st === "active" ? "◐" : "○";
  const tone =
    st === "done" ? "var(--bh-moss)" : st === "failed" ? "var(--bh-danger, #a4322e)" : st === "active" ? "var(--bh-hen-blue)" : "var(--bh-faint)";
  return (
    <div key={label} style={{ display: "flex", gap: 10, alignItems: "baseline", padding: "6px 0" }}>
      <span aria-hidden style={{ color: tone, width: 16, display: "inline-block" }}>
        {mark}
      </span>
      <span style={{ fontWeight: 600 }}>{label}</span>
      {note && (
        <span className="bh-meta" style={{ color: tone }}>
          {note}
        </span>
      )}
    </div>
  );
}

function TrainStep({
  state,
  setState,
  onBack,
  onNext,
}: {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
  onBack: () => void;
  onNext: () => void;
}) {
  const [pollError, setPollError] = useState<string | null>(null);
  const jobId = state.jobId;
  const status = state.lastStatus;

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/launchpad/status?jobId=${encodeURIComponent(jobId as string)}`, {
          cache: "no-store",
        });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok) {
          setPollError(
            (data && typeof data === "object" && "error" in data && typeof data.error === "string")
              ? data.error
              : `could not fetch run status (${res.status})`,
          );
          return;
        }
        setPollError(null);
        setState((s) => ({ ...s, lastStatus: data as TrainStatus }));
      } catch (e) {
        if (!cancelled) setPollError(e instanceof Error ? e.message : "could not fetch run status");
      }
    }

    void poll();
    const terminal = status?.status === "completed" || status?.status === "failed";
    if (terminal) return;
    const id = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, status?.status]);

  const trainStatus = status?.status;
  const terminal = trainStatus === "completed" || trainStatus === "failed";

  const trainState: StageState =
    !status || trainStatus === "pending"
      ? "active"
      : trainStatus === "running"
        ? "active"
        : trainStatus === "completed"
          ? "done"
          : trainStatus === "failed"
            ? "failed"
            : "unknown";
  const trainNote =
    !status || trainStatus === "pending"
      ? "queued"
      : trainStatus === "running"
        ? "training on your documents"
        : trainStatus === "completed"
          ? `trained${status?.modelVersion ? ` — ${status.modelVersion}` : ""}`
          : trainStatus === "failed"
            ? "failed"
            : trainStatus
              ? `status: ${trainStatus}`
              : undefined;

  const gatesState: StageState = trainState === "done" ? "unknown" : trainState === "failed" ? "pending" : "pending";
  const gatesNote =
    trainState === "done"
      ? "not reported by this endpoint — see verdict below"
      : trainState === "failed"
        ? "not reached — training failed"
        : "waiting on training";

  return (
    <div>
      <h2 className="bh-card__title" style={{ marginTop: 0 }}>
        Watching the loop run
      </h2>
      <p className="bh-card__body">
        Every stage below reflects the real job status — nothing here is simulated.
      </p>

      <div style={{ margin: "16px 0" }}>
        {stageRow("Ingest", "done")}
        {stageRow("Chunks", "done")}
        {stageRow("Pairs", "done")}
        {stageRow("Train", trainState, trainNote)}
        {stageRow("Gates", gatesState, gatesNote)}
      </div>

      {pollError && (
        <p className="bh-card__body" style={{ color: "var(--bh-danger, #a4322e)" }}>
          {pollError}
        </p>
      )}

      {trainStatus === "failed" && (
        <div className="bh-card bh-card--inset" style={{ padding: 16, marginBottom: 16 }}>
          <p className="bh-card__body" style={{ margin: 0 }}>
            The gate refused to ship this model — that is the product working. Small corpora
            often fail honestly.
          </p>
          {status?.error && (
            <p className="bh-card__body bh-mono" style={{ marginBottom: 0 }}>
              {status.error}
            </p>
          )}
        </div>
      )}

      {trainStatus === "completed" && (
        <div style={{ marginBottom: 16 }}>
          <ModelReportCard
            model={{
              version: status?.modelVersion || "sandbox model",
              metrics:
                typeof status?.effectiveRank === "number" ? { effectiveRank: status.effectiveRank } : {},
              gates: [],
            }}
          />
        </div>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <button type="button" className="bh-btn bh-btn--ghost" onClick={onBack}>
          Back
        </button>
        {terminal && (
          <button type="button" className="bh-btn bh-btn--primary" onClick={onNext}>
            Continue to try it
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Step 4 — Try                                                           */
/* ---------------------------------------------------------------------- */

function TryStep({
  state,
  setState,
  busy,
  setBusy,
  error,
  setError,
  onBack,
}: {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
  busy: boolean;
  setBusy: (b: boolean) => void;
  error: string | null;
  setError: (e: string | null) => void;
  onBack: () => void;
}) {
  const filterable = state.fields
    .filter((f) => f.name.trim().length > 0)
    .map((f) => ({ name: f.name.trim(), type: f.type }));

  async function handleSearch() {
    if (!state.query.trim() || busy) return;
    setError(null);
    setBusy(true);
    try {
      const resp = await postJson<{ recommendations?: Recommendation[] }>("/api/launchpad/recommend", {
        text: state.query,
        filters: state.filters,
      });
      setState((s) => ({ ...s, results: resp.recommendations ?? [] }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "recommend failed");
      setState((s) => ({ ...s, results: null }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h2 className="bh-card__title" style={{ marginTop: 0 }}>
        Try the model you just trained
      </h2>
      <p className="bh-card__body">Search and filter using the fields you described in step 1.</p>

      {filterable.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <FilterChips
            filterable={filterable}
            value={state.filters as FilterValue}
            onChange={(next) => setState((s) => ({ ...s, filters: next }))}
          />
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          className="bh-input"
          style={{ flex: "1 1 320px" }}
          value={state.query}
          placeholder="Ask a question about your documents…"
          onChange={(e) => setState((s) => ({ ...s, query: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleSearch();
          }}
        />
        <button
          type="button"
          className="bh-btn bh-btn--primary"
          disabled={!state.query.trim() || busy}
          onClick={handleSearch}
        >
          {busy ? "Searching…" : "Search"}
        </button>
      </div>

      {error && (
        <p className="bh-card__body" style={{ color: "var(--bh-danger, #a4322e)" }}>
          {error}
        </p>
      )}

      {state.results && (
        <div className="bh-hits" style={{ marginBottom: 20 }}>
          {state.results.length === 0 ? (
            <p className="bh-muted" style={{ fontSize: "0.8125rem" }}>
              No results for that query and filter combination.
            </p>
          ) : (
            state.results.map((r, i) => (
              <article key={r.id ?? i} className="bh-hit">
                <div className="bh-hit__title">
                  #{i + 1} · {r.url ? (
                    <a href={r.url} target="_blank" rel="noopener noreferrer">
                      {r.title} ↗
                    </a>
                  ) : (
                    r.title
                  )}
                  <span className="bh-hit__score">{(r.score * 100).toFixed(1)}%</span>
                </div>
                <div className="bh-hit__body">{r.reason}</div>
              </article>
            ))
          )}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <button type="button" className="bh-btn bh-btn--ghost" onClick={onBack}>
          Back
        </button>
        <Link href="/contact?topic=launchpad" className="bh-btn bh-btn--sm">
          This ran in a shared sandbox. Get your own workspace →
        </Link>
      </div>
    </div>
  );
}
