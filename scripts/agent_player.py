"""Agent player (Spec 0031 §7): an agent plays the studio games through
the SAME public BFFs humans use, self-declared player="agent" — proving
the provenance-labeled harvest end to end and seeding the label stream.

Strategies are deliberately simple/honest (no LLM): Verdict picks the
longer-overlap passage; Beat the Baseline paraphrases with synonym
swaps. Volume floor, not quality ceiling — that's the design.

Usage: python scripts/agent_player.py [--verdicts N] [--beats N]
"""

from __future__ import annotations

import argparse
import json
import random
import sys
import time
import urllib.request

VERDICT_BASE = "https://www.slasso.com"
BEAT_BASE = "https://www.dumbmodel.com"
UA = {"User-Agent": "bluehen-agent-player/1.0", "Content-Type": "application/json"}
SWAPS = [("retrieval", "search over documents"), ("embedding", "vector representation"),
         ("benchmark", "evaluation suite"), ("training", "model fitting"),
         ("neural", "learned"), ("efficient", "low-cost")]


def _req(url: str, payload: dict | None = None) -> dict:
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=data, headers=UA,
                                 method="POST" if data else "GET")
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode())


def play_verdicts(n: int, ref: str) -> int:
    wins = 0
    for i in range(n):
        try:
            case = _req(f"{VERDICT_BASE}/api/verdict/case")
            a, b = case["a"], case["b"]
            q_words = set(case["query"].lower().split())
            score = lambda p: len(q_words & set(p["text"].lower().split()))
            winner, loser = (a, b) if score(a) >= score(b) else (b, a)
            out = _req(f"{VERDICT_BASE}/api/verdict", {
                "userRef": ref, "player": "agent", "caseId": case.get("caseId"),
                "query": case["query"], "winnerId": winner["id"], "loserId": loser["id"]})
            wins += 1 if out.get("engineAgreed") else 0
            print(f"verdict {i+1}/{n}: agreed={out.get('engineAgreed')}")
        except Exception as e:
            print(f"verdict {i+1} failed: {e}")
        time.sleep(2)
    return wins


def play_beats(n: int, ref: str) -> int:
    poisons = 0
    for i in range(n):
        try:
            anchor = _req(f"{BEAT_BASE}/api/beat/anchor")
            snippet = (anchor.get("snippet") or "")[:200]
            words = [w for w in snippet.split() if len(w) > 5][:6]
            base = " ".join(words[:4]) if len(words) >= 4 else snippet[:60]
            query = base.lower()
            for old, new in random.sample(SWAPS, 3):
                query = query.replace(old, new)
            query = ("what work discusses " + query)[:180]
            out = _req(f"{BEAT_BASE}/api/beat/attempt", {
                "userRef": ref, "player": "agent",
                "anchorId": anchor["anchorId"], "anchorTitle": anchor["title"],
                "query": query})
            res = out.get("result")
            poisons += 1 if res == "POISONED" else 0
            print(f"beat {i+1}/{n}: {res} (rank={out.get('anchorRank')})")
        except Exception as e:
            print(f"beat {i+1} failed: {e}")
        time.sleep(2)
    return poisons


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--verdicts", type=int, default=8)
    ap.add_argument("--beats", type=int, default=6)
    args = ap.parse_args()
    ref = f"agent-{random.randbytes(4).hex()}"
    print(f"agent player {ref}")
    w = play_verdicts(args.verdicts, ref)
    p = play_beats(args.beats, ref)
    print(f"DONE: {args.verdicts} verdicts ({w} engine-agreed), "
          f"{args.beats} beat attempts ({p} poisons)")
    sys.exit(0)
