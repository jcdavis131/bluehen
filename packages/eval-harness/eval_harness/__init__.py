"""Eval metrics and CI gates — WHITEPAPER §8."""

from eval_harness.gates import compute_gates
from eval_harness.metrics import ndcg_at_k, retrieval_scores
from eval_harness.runner import evaluate_checkpoint

__all__ = ["compute_gates", "ndcg_at_k", "retrieval_scores", "evaluate_checkpoint"]
