"""Chunking: SourceDoc markdown → retrieval units.

Chonkie (semantic strategies) when installed; otherwise a paragraph-aware
sentence chunker that respects markdown structure. Token counts are
estimated at ~4 chars/token, matching the heuristic used elsewhere in the
platform.
"""

from __future__ import annotations

import hashlib
import re

from datalab.schemas import Chunk

_SENT_SPLIT = re.compile(r"(?<=[.!?])\s+(?=[A-Z0-9\"'(])")


def _estimate_tokens(text: str) -> int:
    return max(1, len(text) // 4)


def _make_chunk(doc_id: str, ordinal: int, text: str, strategy: str) -> Chunk:
    cid = hashlib.sha256(f"{doc_id}:{ordinal}:{text[:64]}".encode()).hexdigest()[:16]
    return Chunk(
        chunk_id=cid, doc_id=doc_id, ordinal=ordinal, text=text,
        token_estimate=_estimate_tokens(text), strategy=strategy,
    )


def sentence_chunks(
    doc_id: str, text: str, max_tokens: int = 512, overlap_sentences: int = 1
) -> list[Chunk]:
    """Paragraph-aware sentence packing (fallback strategy).

    Paragraph boundaries are never crossed mid-sentence; chunks carry a
    small sentence overlap so retrieval context survives boundary cuts.
    """
    chunks: list[Chunk] = []
    buf: list[str] = []
    buf_tokens = 0

    def flush() -> None:
        nonlocal buf, buf_tokens
        if buf:
            chunks.append(_make_chunk(doc_id, len(chunks), " ".join(buf).strip(), "sentence"))
            buf = buf[-overlap_sentences:] if overlap_sentences else []
            buf_tokens = sum(_estimate_tokens(s) for s in buf)

    for para in re.split(r"\n\s*\n", text):
        para = para.strip()
        if not para:
            continue
        for sent in _SENT_SPLIT.split(para):
            t = _estimate_tokens(sent)
            if buf_tokens + t > max_tokens and buf:
                flush()
            buf.append(sent)
            buf_tokens += t
        # paragraph end is a soft boundary: flush if the buffer is mostly full
        if buf_tokens > max_tokens * 0.7:
            flush()
    if buf:
        chunks.append(_make_chunk(doc_id, len(chunks), " ".join(buf).strip(), "sentence"))
    return chunks


def chunk_text(
    doc_id: str, text: str, max_tokens: int = 512, strategy: str = "auto"
) -> list[Chunk]:
    """Chunk with the best available strategy.

    strategy: "auto" (chonkie if installed, else sentence) | "semantic" | "sentence"
    """
    if strategy in ("auto", "semantic"):
        try:
            return _chonkie_chunks(doc_id, text, max_tokens)
        except ImportError:
            if strategy == "semantic":
                raise RuntimeError(
                    "semantic chunking needs chonkie: uv pip install chonkie"
                ) from None
    return sentence_chunks(doc_id, text, max_tokens=max_tokens)


def _chonkie_chunks(doc_id: str, text: str, max_tokens: int) -> list[Chunk]:
    from chonkie import SentenceChunker  # type: ignore[import-not-found]

    chunker = SentenceChunker(chunk_size=max_tokens)
    out = []
    for i, ch in enumerate(chunker.chunk(text)):
        c = _make_chunk(doc_id, i, ch.text, "chonkie-sentence")
        c.token_estimate = getattr(ch, "token_count", c.token_estimate)
        out.append(c)
    return out
