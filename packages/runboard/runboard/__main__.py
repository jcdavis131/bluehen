"""CLI: uv run python -m runboard {list|demo|serve}."""

from __future__ import annotations

import argparse
import json
import sys

from runboard.store import default_store


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="runboard")
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("list", help="list runs in the store")

    p_demo = sub.add_parser("demo", help="generate a synthetic demo run")
    p_demo.add_argument("--steps", type=int, default=200)
    p_demo.add_argument("--seed", type=int, default=7)

    p_serve = sub.add_parser("serve", help="local read-only API server (dev)")
    p_serve.add_argument("--host", default="127.0.0.1")
    p_serve.add_argument("--port", type=int, default=8100)

    args = parser.parse_args(argv)
    store = default_store()

    if args.cmd == "list":
        for rec in store.list_runs():
            m = rec.manifest
            print(f"{m['id']}  {m.get('status', '?'):9s}  {m.get('project', '')}  "
                  f"{json.dumps(m.get('summary', {}), default=str)[:80]}")
        return 0

    if args.cmd == "demo":
        from runboard.demo import generate_demo_run

        run_id = generate_demo_run(steps=args.steps, seed=args.seed, store=store)
        print(f"demo run written: {store.root / run_id}")
        return 0

    if args.cmd == "serve":
        try:
            import uvicorn
        except ImportError:
            print(
                "serve requires fastapi+uvicorn: uv pip install fastapi 'uvicorn[standard]'",
                file=sys.stderr,
            )
            return 1
        from runboard.api import create_app

        uvicorn.run(create_app(store), host=args.host, port=args.port)
        return 0

    return 2


if __name__ == "__main__":
    raise SystemExit(main())
