"""CLI: uv run python -m datalab {collect|datasets|extract}."""

from __future__ import annotations

import argparse
import json
import sys


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="datalab")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_collect = sub.add_parser("collect", help="run a point-in-time collection")
    p_collect.add_argument("sources", nargs="+", help="URLs or file paths")
    p_collect.add_argument("--name", required=True)
    p_collect.add_argument("--max-tokens", type=int, default=512)
    p_collect.add_argument("--strategy", default="auto", choices=["auto", "semantic", "sentence"])

    sub.add_parser("datasets", help="list collected datasets")

    p_watch = sub.add_parser(
        "watch", help="continuous collection from config/datalab_sources.json"
    )
    p_watch.add_argument("--once", action="store_true", help="one pass over due sources, then exit")
    p_watch.add_argument("--registry", default=None, help="alternate source registry path")
    p_watch.add_argument("--poll-seconds", type=int, default=60)

    p_extract = sub.add_parser("extract", help="structured extraction from a file")
    p_extract.add_argument("path")
    p_extract.add_argument("--model", default=None, help="LiteLLM model id (default: $DATALAB_MODEL)")

    args = parser.parse_args(argv)

    if args.cmd == "collect":
        from datalab.pipeline import run_collection

        run = run_collection(
            args.sources, args.name, max_tokens=args.max_tokens, strategy=args.strategy
        )
        m = run.manifest
        print(f"dataset {m.dataset_id}: {m.doc_count} docs, {m.chunk_count} chunks")
        print(f"artifacts: {run.out_dir}")
        if m.okf_card:
            print(f"okf card:  knowledge/{m.okf_card}")
        if m.stats.get("failures"):
            print(f"failures: {json.dumps(m.stats['failures'], indent=2)}", file=sys.stderr)
            return 1
        return 0

    if args.cmd == "datasets":
        from datalab.pipeline import list_datasets

        for m in list_datasets():
            print(f"{m.dataset_id}  docs={m.doc_count}  chunks={m.chunk_count}  {m.name}")
        return 0

    if args.cmd == "watch":
        from datalab.watch import watch_loop

        watch_loop(args.registry, once=args.once, poll_seconds=args.poll_seconds)
        return 0

    if args.cmd == "extract":
        from datalab.ingest import convert_file
        from datalab.schemas import FinancialMetrics
        from datalab.structure import extract_structured

        doc = convert_file(args.path)
        result = extract_structured(doc.markdown, FinancialMetrics, model=args.model)
        print(result.model_dump_json(indent=2))
        return 0

    return 2


if __name__ == "__main__":
    raise SystemExit(main())
