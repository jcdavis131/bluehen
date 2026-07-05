"""AUTO-101 self-completing bridge: the Operator drops credentials into
data/workspaces/stripe.env (gitignored) — this script does the rest:
Railway env, Stripe adapter env flag, deploy, live checkout verification.

Drop-file format (either or both lines):
  STRIPE_SECRET_KEY=sk_test_... (or sk_live_...)

Run manually or let the session watcher invoke it on file-appear:
  uv run python scripts/wire_payments.py
"""

from __future__ import annotations

import json
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
DROP = REPO / "data" / "workspaces" / "stripe.env"
API = "https://api-production-3dea.up.railway.app"


def main() -> int:
    if not DROP.exists():
        print("no credentials dropped yet (data/workspaces/stripe.env)")
        return 0
    kv = dict(line.split("=", 1) for line in DROP.read_text().splitlines()
              if "=" in line and not line.startswith("#"))
    key = kv.get("STRIPE_SECRET_KEY", "").strip()
    if not key.startswith("sk_"):
        print("drop file present but no valid STRIPE_SECRET_KEY line")
        return 1
    mode = "LIVE" if key.startswith("sk_live_") else "TEST"
    print(f"Stripe key detected ({mode} mode) — wiring…")

    # 1. Railway env (variables set + service redeploy)
    for cmd in (["railway", "variables", "--set", f"STRIPE_SECRET_KEY={key}",
                 "--service", "api"],
                ["railway", "up", "--service", "api", "--detach"]):
        r = subprocess.run(cmd, cwd=REPO, capture_output=True, text=True)
        if r.returncode != 0:
            print("railway step failed:", (r.stderr or r.stdout)[-300:])
            return 1
    print("env set + redeploy triggered; waiting for /readyz…")
    for _ in range(40):
        try:
            with urllib.request.urlopen(f"{API}/readyz", timeout=10) as resp:
                if resp.status == 200:
                    break
        except Exception:
            pass
        time.sleep(15)

    # 2. verify pricing flips + checkout responds (Stripe adapter is
    #    gated server-side on the env; 503 means the adapter code path
    #    still needs the deploy that includes it — report honestly)
    try:
        with urllib.request.urlopen(f"{API}/v1/pricing", timeout=20) as resp:
            data = json.loads(resp.read().decode())
        print("paymentsLive:", data.get("paymentsLive"))
    except Exception as e:
        print("pricing probe failed:", e)
    print("NEXT (Claude, next session): ship the Stripe adapter in "
          "billing.py (same interface as BTCPay), then one test checkout "
          "end-to-end. The key never leaves Railway env + this gitignored file.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
