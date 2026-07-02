# 0011 — Modal Trainer Production Implementation

- **Status:** Implemented
- **Owner:** ML / Platform
- **Supersedes / Superseded by:** —
- **Related specs:** 0003, 0008, 0009

## Problem

`services/trainer/modal_app.py` is a runnable skeleton with five TODO blocks that prevent
GPU-scale training from functioning. The local worker (`services/worker/main.py`) already
proves the full train → eval → deploy → register pipeline; this spec wires the same logic
into the Modal serverless path and fills every TODO with production-grade I/O.

## Goals

- `TR-01` Corpus loaded from Modal Volume at a deterministic path before job dispatch.
- `TR-02` `train_asn()` calls `asn_engine.train_loop.train_asn()` (identical to local worker).
- `TR-03` Checkpoint persisted to ARTIFACTS Volume after training.
- `TR-04` `evaluate()` returns real metrics (`ndcg10`, `effectiveRank`, gates) — no `None` values.
- `TR-05` MRL truncation by dimension-slicing the projection head output.
- `TR-06` int8 quantization via `torch.quantization.quantize_dynamic`.
- `TR-07` Served artifact (truncated + quantized) written to ARTIFACTS Volume.
- `TR-08` Each stage POSTs a structured result to `payload['callbackUrl']` so core-api
  registers the `model_versions` row and ledger entries.

## Non-goals

- Changes to `asn_engine` or `eval_harness` packages (used as-is).
- New core-api routes (existing callback endpoint is sufficient).
- Direct Postgres access from Modal workers.
- Horizontal Modal worker scaling (job-level parallelism deferred).
- Full elevated-mask MLM implementation in `domain_adapt()` — corpus I/O must be real; the
  masking logic is stubbed with `NotImplementedError` and a clear interface comment so the
  next engineer knows exactly what to fill in.

## Design

### Volume layout

```
/artifacts/                                              ← Modal Volume mount (ARTIFACTS)
  corpus/{workspaceId}/{collectionId}.jsonl              ← written by core-api before dispatch
  checkpoints/{workspaceId}/{model_version}.pt           ← written by train_asn()
  served/{workspaceId}/{model_version}_{dims}_{quant}.pt ← written by compress_and_register()
```

### Stage flow

```
core-api
  │─ writes corpus JSONL to Volume
  │─ calls domain_adapt(payload)     →  MLM adapt (corpus I/O real; masking stub)
  │─ calls train_asn(payload)        →  full contrastive loop → checkpoint → callback
  │─ calls evaluate(payload)         →  eval_harness runner → real metrics → callback
  │─ calls compress_and_register()   →  MRL trunc + int8 → served artifact → callback
```

### Callback contract

Every stage ends with `httpx.post(payload['callbackUrl'], json={...})`. Shape:

```json
{
  "stage":        "collect|train|applied_test|deploy",
  "modelVersion": "asn-xxxxxx",
  "traceId":      "...",
  "metrics":      {},
  "gates":        {},
  "allPassed":    false,
  "registered":   true
}
```

Core-api callback endpoint already exists and handles `model_versions` registration +
ledger writes.

### MRL truncation

Matryoshka truncation = slice the first `truncateDims` columns of the final projection
head output after a forward pass. We do **not** modify the saved weights — we wrap inference
in a thin `TruncatedEncoder` that calls `encoder.encode()[..., :truncateDims]`.
The served `.pt` stores `{"recipe", "model", "truncateDims", "quant"}`.

### int8 quantization

`torch.quantization.quantize_dynamic(encoder, {torch.nn.Linear}, dtype=torch.qint8)`.
Applied after truncation decision; written into the served artifact.

## Contract

### `domain_adapt(payload)` → `dict`

Input fields:
- `corpusUri`: `str` — Volume-relative path, e.g. `corpus/{wid}/{cid}.jsonl`
- `baseModel`: `str`
- `domainEntities`: `list[str]` (optional) — vocab for elevated masking (stubbed)
- `callbackUrl`: `str`
- `traceId`: `str`

Output: `{"stage": "collect", "status": "adapted"|"skipped", "pairs": int, "baseModel": str}`

### `train_asn(payload)` → `dict`

Input fields:
- `corpusUri`: `str`
- `recipe`: `dict` (forwarded to `train_loop.train_asn`)
- `callbackUrl`: `str`
- `traceId`: `str`

Output: `{"stage": "train", "modelVersion": str, "effectiveRank": float, "finalLoss": float, "surgeries": int}`

### `evaluate(payload)` → `dict`

Input fields:
- `corpusUri`: `str`
- `modelVersion`: `str`
- `workspaceId`: `str`
- `callbackUrl`: `str`
- `traceId`: `str`

Output: `{"stage": "applied_test", "ndcg10": float, "effectiveRank": float, "gates": dict, "allPassed": bool}`

### `compress_and_register(payload)` → `dict`

Input fields:
- `modelVersion`: `str`
- `workspaceId`: `str`
- `truncateDims`: `int | None`
- `quant`: `"int8" | "binary"` (default `"int8"`)
- `callbackUrl`: `str`
- `traceId`: `str`

Output: `{"stage": "deploy", "modelVersion": str, "truncateDims": int|None, "quant": str, "registered": bool}`

## Acceptance criteria

1. `domain_adapt()` reads JSONL from Volume path, returns `pairs` count > 0 for a valid
   corpus file, and does not raise for a missing `domainEntities` key.
2. `train_asn()` returns a `modelVersion` string and a non-None `effectiveRank` float;
   checkpoint file exists on Volume at expected path after call.
3. `evaluate()` returns `ndcg10` and `effectiveRank` as floats (not `None`); `gates` dict
   has exactly three keys matching `eval_harness.gates.compute_gates` output.
4. `compress_and_register()` writes a served artifact to Volume; returned `registered` is `True`;
   file size is less than raw checkpoint (quantization reduces size).
5. All four stages invoke `httpx.post(callbackUrl, ...)` exactly once with the correct `stage` key.

## Test plan

- `services/trainer/tests/test_modal_app.py` — unit tests with:
  - Mock Modal Volume via `tmp_path` fixture (write test JSONL, run stage, check outputs).
  - Mock `httpx.post` to assert callback shape per stage.
  - Real `asn_engine` imports (no mocking of training math).
- Tests run on CPU (no GPU required); `torch.quantization.quantize_dynamic` works on CPU.

## Rollout & rollback

- No database migrations (Modal Volume is append-only; core-api callback handles DB).
- Rollback: revert `modal_app.py`; local worker continues serving unaffected.

## Risks

- `torch.quantization.quantize_dynamic` with `qint8` degrades retrieval quality on very
  small models — mitigated by gate check before serving; `mrlWithinTolerance` flag can block.
- Modal Volume I/O latency between stages — corpus JSONL is written once and read twice
  (train + eval); acceptable for batch workloads.
- `httpx` not in existing Modal image — added to `pip_install` list.
