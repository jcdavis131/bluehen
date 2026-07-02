# Claude autoresearch delegate (terminal 3)

**You are the CLAUDE worker.** Cursor runs patch experiments via `research_loop`; you run **code-shape** delegate items.

**Team:** `.claude/TEAM.md` · **Claim tasks:** `uv run python scripts/pick_task.py claim AR-306 --agent claude`

## Setup (once)

```powershell
cd C:\Users\jcdav\bluehenre
uv run python scripts/autoresearch_orchestrate.py --init-champion
```

## Each experiment

1. Read `data/autoresearch/progress.jsonl` and `data/autoresearch/champion_train.py`
2. Copy champion → `scripts/autoresearch_train.py`, apply **one** hypothesis change
3. Run:

```powershell
uv run python scripts/autoresearch_run.py claude
```

KEEP/DISCARD is automatic (promote/revert champion). Do not hand-edit after DISCARD.

---

## Round 3 queue (embedding + RAG) — `config/work_queue.json`

| ID | Agent | Hypothesis |
|---|---|---|
| AR-306 / claude-1 | Claude | depth=2 GELU@256 |
| AR-307 / claude-2 | Claude | InfoNCE + Barlow aux 0.1 |
| AR-308 / claude-3-mrl | Claude | MRL prefix loss in synthetic train |
| AR-309 / claude-4-rankfloor | Claude | VICReg rank floor when served_rank < 12 |

Cursor patch items (AR-301–305) run via `research_loop` daemon automatically.

**Sync queue from backlog:**
```powershell
uv run python scripts/sync_research_queue.py --round 3
```

---

## claude-3-mrl: MRL prefix loss (AR-308)

Add Matryoshka-style nested prefix losses on projector outputs (dims e.g. 16, 32, 64).
Import pattern from `asn_engine.train_loop` MRL branch. Weight smaller prefixes equally.
Goal: lift `knn_t8` without knn_full regression > 0.02. No surgery.

---

## claude-4-rankfloor: Regime-specific rank guard (AR-309)

Only when batch-averaged served rank estimate drops below 12, add VICReg variance term
(import from asn_engine.losses). Otherwise pure Barlow. Test collapse-prone synthetic only.

---

## claude-1: depth=2 + gelu@256 (SWEEP top row hypothesis)

Champion is TPE depth=1 linear. Test whether adding hidden layer helps under 300 steps.

From champion, change `Net` to:

```python
self.enc = nn.Sequential(
    nn.Linear(D_IN, 256),
    nn.GELU(),
    nn.Linear(256, D_SERVE, bias=False),
)
BATCH = 256
```

Keep `BARLOW_LAMBDA = 0.0215`, `LR = 2e-3`. Run once.

---

## claude-2 (if claude-1 DISCARD): InfoNCE + barlow aux

Add `info_nce` on projector outputs with weight 0.1 alongside barlow (import from asn_engine.losses).
Single combined loss. Do not enable surgery.

---

## Paste this into Claude terminal 3

```
Read .claude/autoresearch-delegate.md and program.md. Execute claude-1 only:
edit scripts/autoresearch_train.py per the depth=2 gelu hypothesis, then run
uv run python scripts/autoresearch_run.py claude
Report KEEP or DISCARD and robust_score in one paragraph.
```
