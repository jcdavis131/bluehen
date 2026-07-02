import numpy as np

from datalab.chunk import sentence_chunks
from datalab.ingest import html_to_markdown
from datalab.okf import Bundle, frontmatter
from datalab.pipeline import list_datasets, run_collection
from datalab.schemas import Chunk, FinancialMetrics
from datalab.store import LocalVectorStore
from datalab.structure import heuristic_financials


def test_html_to_markdown_strips_and_headings():
    html = "<html><head><script>x()</script><title>T</title></head>" \
           "<body><h1>Report</h1><p>Alpha beta.</p><nav>skip</nav></body></html>"
    md = html_to_markdown(html)
    assert "# Report" in md
    assert "Alpha beta." in md
    assert "x()" not in md


def test_sentence_chunks_pack_and_overlap():
    text = " ".join(f"Sentence number {i} has some words in it." for i in range(60))
    chunks = sentence_chunks("doc1", text, max_tokens=100)
    assert len(chunks) > 1
    assert all(c.token_estimate <= 160 for c in chunks)  # packing bound + one sentence
    assert [c.ordinal for c in chunks] == list(range(len(chunks)))
    # overlap: last sentence of chunk N appears in chunk N+1
    assert chunks[0].text.split(".")[-2].strip() in chunks[1].text


def test_heuristic_financials():
    text = ("Acme Corp (NASDAQ: ACME) reported record revenue of $2.5 billion, "
            "beat expectations with diluted EPS of $1.42 and raised guidance.")
    m = heuristic_financials(text)
    assert m.ticker == "ACME"
    assert m.revenue_usd == 2.5e9
    assert m.eps == 1.42
    assert m.sentiment_score > 0
    assert m.confidence <= 0.3  # fallback path is honest about itself


def test_heuristic_financials_empty():
    m = heuristic_financials("nothing financial here")
    assert m.ticker == "UNKNOWN"
    assert m.confidence == 0.1


def test_local_vector_store_roundtrip(tmp_path):
    store = LocalVectorStore(tmp_path, "t")
    chunks = [
        Chunk(chunk_id=f"c{i:02d}", doc_id="d", ordinal=i, text=f"text {i}", token_estimate=2)
        for i in range(3)
    ]
    vecs = np.eye(3, 8, dtype=np.float32)
    assert store.upsert(chunks, vecs) == 3
    hits = store.search(np.eye(1, 8, dtype=np.float32)[0], limit=2)
    assert hits[0]["chunk"]["chunk_id"] == "c00"
    assert hits[0]["score"] > 0.99


def test_okf_bundle_concept_index_log(tmp_path):
    bundle = Bundle(tmp_path)
    path = bundle.write_concept(
        "datasets/demo", type="Dataset", title="Demo",
        description="A demo dataset.", tags=["x"], body="# Schema\n\ncontent",
    )
    text = path.read_text(encoding="utf-8")
    assert text.startswith("---\ntype: Dataset")
    assert "# Schema" in text

    bundle.add_index_entry("datasets", "Demo", "demo.md", "a demo", section="Datasets")
    bundle.add_index_entry("datasets", "Demo", "demo.md", "a demo", section="Datasets")  # idempotent
    idx = (tmp_path / "datasets" / "index.md").read_text(encoding="utf-8")
    assert idx.count("](demo.md)") == 1

    bundle.append_log("Created [Demo](/datasets/demo.md).", kind="Creation")
    bundle.append_log("Updated it.", kind="Update")
    log = (tmp_path / "log.md").read_text(encoding="utf-8")
    assert log.index("Updated it.") < log.index("Created [Demo]")  # newest entry first within day


def test_frontmatter_quoting():
    fm = frontmatter({"type": "T", "title": 'Has: colon "quotes"', "tags": ["a", "b"]})
    assert 'title: "Has: colon \\"quotes\\""' in fm
    assert "tags: [a, b]" in fm


def test_run_collection_end_to_end(tmp_path):
    src = tmp_path / "doc.txt"
    src.write_text("Paragraph one about markets.\n\nParagraph two about filings.", encoding="utf-8")
    import os
    os.environ["DATALAB_TRACE_DIR"] = str(tmp_path / "traces")
    try:
        run = run_collection(
            [str(src)], "unit-test-set",
            strategy="sentence",
            data_root=tmp_path / "data",
            knowledge_root=tmp_path / "knowledge",
        )
    finally:
        del os.environ["DATALAB_TRACE_DIR"]
    m = run.manifest
    assert m.doc_count == 1 and m.chunk_count >= 1
    assert (run.out_dir / "manifest.json").exists()
    card = tmp_path / "knowledge" / m.okf_card
    assert card.exists()
    assert "type: Dataset" in card.read_text(encoding="utf-8")
    listed = list_datasets(tmp_path / "data")
    assert listed and listed[0].dataset_id == m.dataset_id
