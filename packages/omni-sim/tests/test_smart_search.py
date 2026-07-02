from omni_sim.smart_search import extract_terms, smart_search


def test_extract_terms_weights_proper_nouns():
    terms = dict(extract_terms("Kalshi Fed rate cut probability"))
    assert terms.get("kalshi", 0) >= 2.0


def test_smart_search_truncates_by_alpha():
    docs = [
        {"id": "a", "text": "kalshi fed rate cut"},
        {"id": "b", "text": "unrelated sports blog template"},
        {"id": "c", "text": "fed probability market"},
    ]
    hits = smart_search("kalshi fed rate", docs, alpha=0.5)
    ids = [h.doc_id for h in hits]
    assert "a" in ids
    assert "b" not in ids
