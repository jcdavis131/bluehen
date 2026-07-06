"""WIKI-101 — synthesize concept pages FROM the harvested corpus (the
Karpathy LLM-wiki layer). Trust rules:

- FREE-TIER MODELS ONLY (hard allow-list; anything else raises).
- The model sees ONLY corpus abstracts; every [arxiv:ID] citation in
  the output is verified to exist in the provided context — pages with
  invented citations are rejected and retried once, then skipped.
- Output goes between okf:auto markers; curated frontmatter/body
  outside the markers is never touched. Idempotent per corpus hash.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CORPUS = ROOT / "data" / "corpora" / "research" / "corpus.jsonl"
CONCEPTS = ROOT / "knowledge" / "personal" / "concepts"

FREE_TIER_MODELS = {"llama-3.3-70b-versatile", "llama-3.1-8b-instant"}
MODEL = "llama-3.3-70b-versatile"
assert MODEL in FREE_TIER_MODELS, "free-tier models only"

TOPICS = {
    "embedding-spaces": ["embedding space", "representation", "effective rank",
                         "geometry", "anisotropy", "collapse"],
    "contrastive-objectives": ["contrastive", "infonce", "negative", "simclr",
                               "alignment and uniformity"],
    "hard-negatives": ["hard negative", "negative mining", "false negative"],
    "retrieval-and-rag": ["retrieval", "rag", "retriever", "dense retrieval",
                          "rerank"],
    "adapters-and-heads": ["adapter", "lora", "fine-tun", "parameter-efficient",
                           "head"],
    "mtnn-omni-embedding": ["multi-task", "multitask", "unified embedding",
                            "universal embedding", "matryoshka"],
}

AUTO_BEGIN = "<!-- okf:auto:begin -->"
AUTO_END = "<!-- okf:auto:end -->"


def load_key() -> str:
    env = (ROOT / "data" / "workspaces" / "llm.env").read_text(encoding="utf-8")
    for line in env.splitlines():
        if line.startswith("GROQ_API_KEY="):
            return line.split("=", 1)[1].strip()
    raise SystemExit("no GROQ_API_KEY in llm.env")


def groq(key: str, prompt: str, retries: int = 3) -> str:
    body = json.dumps({
        "model": MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2, "max_tokens": 1400,
    }).encode()
    for attempt in range(retries):
        req = urllib.request.Request(
            "https://api.groq.com/openai/v1/chat/completions", data=body,
            headers={"Authorization": f"Bearer {key}",
                     "Content-Type": "application/json",
                     "User-Agent": "bluehenre-wiki/1.0"})
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                return json.load(r)["choices"][0]["message"]["content"]
        except Exception as e:  # free-tier rate limits: back off, resume
            wait = 20 * (attempt + 1)
            print(f"    retry in {wait}s ({e})")
            time.sleep(wait)
    raise RuntimeError("groq call failed after retries")


def main() -> None:
    key = load_key()
    papers = [json.loads(l) for l in
              CORPUS.read_text(encoding="utf-8").splitlines()]
    print(f"{len(papers)} corpus papers")

    for topic, kws in TOPICS.items():
        page = CONCEPTS / f"{topic}.md"
        if not page.exists():
            print(f"  {topic}: no curated stub — skipping")
            continue
        hits = []
        for p in papers:
            blob = (p["title"] + " " + p["text"]).lower()
            score = sum(blob.count(k) for k in kws)
            if score:
                hits.append((score, p))
        hits.sort(key=lambda x: -x[0])
        ctx = hits[:10]
        if len(ctx) < 3:
            print(f"  {topic}: only {len(ctx)} relevant papers — skipping")
            continue
        ids = {p["id"] for _, p in ctx}
        digest = hashlib.sha256(
            ("|".join(sorted(ids)) + MODEL).encode()).hexdigest()[:12]
        text = page.read_text(encoding="utf-8")
        if digest in text:
            print(f"  {topic}: up to date ({digest})")
            continue

        context = "\n\n".join(
            f"[{p['id']}] {p['title']}\n{p['text'][:900]}" for _, p in ctx)
        prompt = (
            "Write a concise concept page section (250-400 words, markdown, "
            "## subheadings allowed) about '" + topic.replace('-', ' ') +
            "' USING ONLY the abstracts below. Cite inline as [arxiv:ID] "
            "for every claim. Do not invent facts, papers, numbers, or "
            "citations. If the abstracts disagree, say so. If the abstracts "
            "only weakly cover the topic, write less rather than padding.\n\n"
            + context)
        print(f"  {topic}: synthesizing from {len(ctx)} papers…")
        out = None
        for attempt in range(2):
            cand = groq(key, prompt)
            cited = set(re.findall(r"\[(arxiv:[^\]\s]+)\]", cand))
            bogus = cited - ids
            if not bogus and cited:
                out = cand
                break
            print(f"    rejected: bogus={sorted(bogus)[:3]} cited={len(cited)}")
        if out is None:
            print(f"  {topic}: FAILED citation check twice — skipped honestly")
            continue

        block = (f"{AUTO_BEGIN}\n_Auto-synthesized from {len(ctx)} corpus "
                 f"abstracts ({MODEL}, free tier) — every citation verified "
                 f"against the corpus. digest:{digest}_\n\n{out}\n{AUTO_END}")
        if AUTO_BEGIN in text:
            text = re.sub(re.escape(AUTO_BEGIN) + r".*?" + re.escape(AUTO_END),
                          block, text, flags=re.S)
        else:
            text = text.rstrip() + "\n\n" + block + "\n"
        page.write_text(text, encoding="utf-8")
        print(f"    written ({len(out)} chars)")
        time.sleep(5)  # free-tier RPM respect

    print("done")


if __name__ == "__main__":
    main()
