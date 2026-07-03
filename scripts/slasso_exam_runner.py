"""slasso YAML exam runner — BD-701 (spec 0008).

Loads a YAML-defined MCQ exam, runs the demo baseline panel (per-chunk
retrieval-bias ranking + top-k hit + MRR), and emits an ExamScorecard JSON
matching `@synthaembed/eval-public`'s `runPanelScorecard` shape so the
slasso (validation) site and `data/evidence/` stay in sync with the
arxiviq `/api/exam` scorecard.

Demo mode mirrors the TypeScript scorecard exactly (same panel, corpus,
and per-chunk retrievalBias). Live mode (real org-embed / BGE / e5 vectors
over data/corpora/research/corpus.jsonl) is a P6-run follow-on — only the
`mode` field and per-model numbers change, the scorecard shape is identical.

Source of truth for the panel/corpus/bias:
  packages/eval-public/src/baselines.ts · packages/eval-public/src/corpus.ts
Keep these Python constants in sync with those files until the panel itself
is migrated to YAML.

Usage:
  uv run python scripts/slasso_exam_runner.py
  uv run python scripts/slasso_exam_runner.py --exam data/exams/arxiv-mcq.yaml \
      --out data/evidence/slasso_exam_arxiv-mcq.json --top-k 3
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import yaml

# --- Demo panel (mirror of packages/eval-public/src/baselines.ts) ------------
# fmt: off
BASELINE_MODELS = [
    {"id": "infonce",     "name": "Plain InfoNCE",              "vendor": "control",     "effectiveRank": 3.8,  "ndcg10": 0.39, "isHen": False, "retrievalBias": {"c6": 0.95, "c1": 0.70, "c5": 0.40, "c2": 0.15, "c4": 0.10, "c3": 0.08, "c7": 0.05, "c8": 0.05}},
    {"id": "openai-small","name": "text-embedding-3-small",     "vendor": "commercial",  "effectiveRank": 11.2, "ndcg10": 0.48, "isHen": False, "retrievalBias": {"c5": 0.85, "c2": 0.55, "c1": 0.45, "c3": 0.35, "c6": 0.30, "c4": 0.20, "c7": 0.15, "c8": 0.12}},
    {"id": "e5",          "name": "e5-large-v2",                "vendor": "Microsoft",   "effectiveRank": 14.6, "ndcg10": 0.51, "isHen": False, "retrievalBias": {"c5": 0.80, "c2": 0.60, "c3": 0.50, "c1": 0.45, "c6": 0.40, "c4": 0.25, "c8": 0.20, "c7": 0.10}},
    {"id": "bge",         "name": "BGE-M3",                     "vendor": "BAAI",        "effectiveRank": 18.4, "ndcg10": 0.54, "isHen": False, "retrievalBias": {"c5": 0.75, "c2": 0.65, "c3": 0.55, "c4": 0.40, "c1": 0.40, "c8": 0.35, "c6": 0.30, "c7": 0.20}},
    {"id": "qwen3-emb",   "name": "Qwen3-Embedding-0.6B",       "vendor": "Alibaba",     "effectiveRank": 22.1, "ndcg10": 0.56, "isHen": False, "retrievalBias": {"c2": 0.70, "c4": 0.60, "c5": 0.58, "c3": 0.50, "c8": 0.45, "c1": 0.40, "c6": 0.35, "c7": 0.25}},
    {"id": "blue-hen",    "name": "Blue Hen RE · ASN org",      "vendor": "Blue Hen RE", "effectiveRank": 49.6, "ndcg10": 0.61, "isHen": True,  "retrievalBias": {"c4": 0.92, "c2": 0.88, "c8": 0.85, "c3": 0.80, "c1": 0.78, "c5": 0.75, "c7": 0.70, "c6": 0.65}},
]
# fmt: on

DEMO_CORPUS_IDS = ["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8"]

DEFAULT_TOP_K = 3
REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_EXAM = REPO_ROOT / "data" / "exams" / "arxiv-mcq.yaml"
DEFAULT_OUT = REPO_ROOT / "data" / "evidence" / "slasso_exam_arxiv-mcq.json"


def load_exam(path: Path) -> dict:
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(raw, dict):
        raise ValueError(f"{path}: expected a YAML mapping with id/title/questions")
    if "questions" not in raw or not isinstance(raw["questions"], list):
        raise ValueError(f"{path}: missing 'questions' list")
    for i, q in enumerate(raw["questions"]):
        for key in ("id", "prompt", "options", "correctIndex", "sourceChunkId"):
            if key not in q:
                raise ValueError(f"{path}: question[{i}] missing '{key}'")
        if not isinstance(q["options"], list) or len(q["options"]) < 2:
            raise ValueError(f"{path}: question[{i}] needs >=2 options")
        if not (0 <= int(q["correctIndex"]) < len(q["options"])):
            raise ValueError(f"{path}: question[{i}] correctIndex out of range")
    return raw


def demo_rank(model: dict, chunk_ids: list[str]) -> list[str]:
    """Rank corpus chunk ids: descending retrievalBias, tie-break by chunk id."""
    return sorted(
        chunk_ids,
        key=lambda cid: (-(model["retrievalBias"].get(cid, -1.0)), cid),
    )


def score_model(model: dict, questions: list[dict], chunk_ids: list[str], top_k: int) -> dict:
    ranked = demo_rank(model, chunk_ids)
    per_question = []
    for q in questions:
        rank = ranked.index(q["sourceChunkId"]) + 1 if q["sourceChunkId"] in ranked else None
        per_question.append(
            {"qId": q["id"], "rank": rank, "hit": rank is not None and rank <= top_k}
        )
    n = len(per_question)
    hits = sum(1 for p in per_question if p["hit"])
    accuracy = round(hits / n, 3) if n else 0.0
    mrr = round(sum((1 / p["rank"]) for p in per_question if p["rank"]) / n, 3) if n else 0.0
    return {
        "modelId": model["id"],
        "name": model["name"],
        "vendor": model["vendor"],
        "isHen": model["isHen"],
        "accuracy": accuracy,
        "mrr": mrr,
        "perQuestion": per_question,
    }


def run_panel_scorecard(exam: dict, top_k: int, mode: str = "demo") -> dict:
    panel = [score_model(m, exam["questions"], DEMO_CORPUS_IDS, top_k) for m in BASELINE_MODELS]
    # Highest accuracy first; MRR breaks ties; hen wins a dead tie for narrative clarity.
    panel.sort(key=lambda m: (-m["accuracy"], -m["mrr"], 0 if m["isHen"] else 1))
    return {
        "examId": exam.get("id", "exam"),
        "mode": mode,
        "topK": top_k,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "panel": panel,
    }


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="Run a YAML MCQ exam against the demo baseline panel.")
    p.add_argument("--exam", type=Path, default=DEFAULT_EXAM, help="Path to exam YAML (default: data/exams/arxiv-mcq.yaml)")
    p.add_argument("--out", type=Path, default=DEFAULT_OUT, help="Output scorecard JSON path (default: data/evidence/slasso_exam_arxiv-mcq.json)")
    p.add_argument("--top-k", type=int, default=DEFAULT_TOP_K, help=f"Top-k hit threshold (default {DEFAULT_TOP_K})")
    p.add_argument("--mode", choices=("demo", "live"), default="demo", help="Scorecard mode label (demo=panel simulation, live=real vectors — P6-run)")
    p.add_argument("--stdout", action="store_true", help="Print scorecard JSON to stdout instead of writing a file")
    args = p.parse_args(argv)

    if not args.exam.exists():
        print(f"error: exam file not found: {args.exam}", file=sys.stderr)
        return 2
    exam = load_exam(args.exam)
    scorecard = run_panel_scorecard(exam, args.top_k, mode=args.mode)

    if args.stdout:
        print(json.dumps(scorecard, indent=2))
    else:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(json.dumps(scorecard, indent=2), encoding="utf-8")
        print(f"wrote {args.out} ({len(scorecard['panel'])} models · {len(exam['questions'])} questions · {scorecard['mode']})")

    # Console summary table.
    print(f"\n{scorecard['examId']} · top-{scorecard['topK']} · {scorecard['mode']}")
    print(f"{'model':<28} {'acc':>6} {'mrr':>6} {'vendor':<12}")
    for m in scorecard["panel"]:
        flag = " org" if m["isHen"] else ""
        print(f"{m['name']:<28} {m['accuracy']:>6.3f} {m['mrr']:>6.3f} {m['vendor']:<12}{flag}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
