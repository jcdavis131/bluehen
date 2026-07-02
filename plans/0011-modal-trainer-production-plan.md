# Plan: 0011 — Modal Trainer Production Implementation

**Spec:** `specs/0011-modal-trainer-production.md`
**File to modify:** `services/trainer/modal_app.py`
**New test file:** `services/trainer/tests/test_modal_app.py`

---

## Checklist

### Phase A — Modal image + helpers

- [x] **A1** `[TR-01, TR-08]` Add `httpx` to `pip_install` in the Modal image definition.
- [x] **A2** `[TR-01]` Add `_load_corpus(volume_path: str) -> list[dict]` helper: reads
  JSONL from `ARTIFACTS/{volume_path}`, returns list of pair dicts.
- [x] **A3** `[TR-03, TR-07]` Add `_ckpt_path(workspace_id, model_version) -> Path` and
  `_served_path(workspace_id, model_version, dims, quant) -> Path` path helpers.
- [x] **A4** `[TR-08]` Add `_post_callback(url: str, body: dict) -> None` helper: POSTs
  JSON to `callbackUrl`; logs on failure but does not raise (fire-and-forget with one retry).

### Phase B — `domain_adapt()` (TR-01)

- [x] **B1** `[TR-01]` Replace TODO line 35: read JSONL pairs from
  `payload['corpusUri']` via `_load_corpus`. Store count in result.
- [x] **B2** Stub elevated-mask MLM with `NotImplementedError` in an inner function
  `_apply_domain_mask(texts, entities)` — interface documented, body raises with message.
- [x] **B3** `[TR-08]` POST callback with `stage=collect`, pair count, status.

### Phase C — `train_asn()` (TR-02, TR-03, TR-08)

- [x] **C1** `[TR-01]` Load pairs from `payload['corpusUri']` via `_load_corpus`.
- [x] **C2** `[TR-02]` Replace TODO line 51: call
  `asn_engine.train_loop.train_asn(pairs, recipe, checkpoint_dir)`.
  `checkpoint_dir` = `Path(ARTIFACTS) / "checkpoints" / payload['workspaceId']`.
- [x] **C3** `[TR-03]` Replace TODO line 57: `model_version` comes from `TrainResult`;
  assert checkpoint file exists at `_ckpt_path(...)`.
- [x] **C4** `[TR-08]` POST callback with `stage=train`, `modelVersion`, `effectiveRank`,
  `finalLoss`, `surgeries`.
- [x] **C5** Return dict matching spec contract.

### Phase D — `evaluate()` (TR-04, TR-08)

- [x] **D1** `[TR-01]` Load pairs from `payload['corpusUri']` via `_load_corpus`.
- [x] **D2** `[TR-04]` Replace TODO line 67: call
  `eval_harness.runner.evaluate_checkpoint(_ckpt_path(...), pairs)`.
- [x] **D3** Assert returned `ndcg10` and `effectiveRank` are floats (not None).
- [x] **D4** `[TR-08]` POST callback with `stage=applied_test`, full metrics + gates.
- [x] **D5** Return dict matching spec contract.

### Phase E — `compress_and_register()` (TR-05, TR-06, TR-07, TR-08)

- [x] **E1** `[TR-05]` Load checkpoint `.pt` from ARTIFACTS Volume via `_ckpt_path`.
  Reconstruct `ASNEncoder`, load state dict.
- [x] **E2** `[TR-05]` Wrap in `TruncatedEncoder` (inline class): `forward` calls
  `encoder.encode()[..., :truncate_dims]` when `truncate_dims` is not None.
- [x] **E3** `[TR-06]` Apply `torch.quantization.quantize_dynamic(model, {nn.Linear}, dtype=torch.qint8)`
  when `quant == "int8"`. Skip (identity) for other quant values.
- [x] **E4** `[TR-07]` `torch.save({"recipe", "model", "truncateDims", "quant"}, served_path)`.
  `served_path` = `_served_path(workspace_id, model_version, dims, quant)`.
- [x] **E5** `[TR-08]` POST callback with `stage=deploy`, `registered=True`.
- [x] **E6** Return dict matching spec contract.

### Phase F — Tests (AC 1–5)

- [x] **F1** `services/trainer/tests/__init__.py` — empty file.
- [x] **F2** `[AC-1]` Test `domain_adapt`: write sample JSONL to `tmp_path`, call stage,
  assert `pairs > 0` and callback called with `stage=collect`.
- [x] **F3** `[AC-2]` Test `train_asn`: write JSONL, call stage, assert `modelVersion` str,
  `effectiveRank` float, checkpoint `.pt` exists.
- [x] **F4** `[AC-3]` Test `evaluate`: depends on F3 checkpoint; assert `ndcg10` float,
  `effectiveRank` float, `gates` has 3 keys.
- [x] **F5** `[AC-4]` Test `compress_and_register`: depends on F3 checkpoint; assert
  served file exists and `registered=True`.
- [x] **F6** `[AC-5]` Assert `httpx.post` called exactly once per stage in each test
  (mock via `unittest.mock.patch`).

### Phase G — Verification

- [x] **G1** Run `pytest services/trainer/tests/ -v` — all tests green.
- [x] **G2** Run `ruff check services/trainer/ --fix && ruff format services/trainer/`.
- [x] **G3** Confirm no `None` values remain in any return dict from the four functions.
- [x] **G4** Mark spec 0011 status → `Implemented`.
