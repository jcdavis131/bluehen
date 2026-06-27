# services/trainer — Modal GPU pipeline

The four-stage lifecycle as Modal serverless functions. core-api invokes these via Vercel
Connect (OIDC, no static secrets); each receives the inbound trace context so its spans land
in the same trace as the agent/CLI call that started it.

| Stage | Function | GPU | ASN hooks |
|---|---|---|---|
| Collect | `domain_adapt` | L40S | selective-mask MLM |
| Train/validate | `train_asn` | H100 | effective rank, Newton–Schulz, InfoNCE/zELO |
| Applied test | `evaluate` | L40S | eval gates (§8 of WHITEPAPER) |
| Real-world use | `compress_and_register` | CPU | Matryoshka + int8/binary quant |

```bash
uv sync
modal serve services/trainer/modal_app.py     # local dev
modal deploy services/trainer/modal_app.py     # deploy
```

The ASN math (`effective_rank`, `newton_schulz`, `info_nce`, three-tier surgery) is imported
from `packages/asn-engine` and is unit-tested there. Training/eval I/O is marked `TODO` where
it depends on the corpus and storage choices.
