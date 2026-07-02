---
type: Site
title: Observatory (training-console)
description: W&B/TensorBoard-style dashboard — live loss curves, effective-rank monitoring with collapse alerts, R2D curvature.
resource: /apps/sites/observatory
tags: [dashboard, training, observability, site]
timestamp: 2026-07-02T00:00:00Z
---

Fleet site `observatory` (port 3006, registered in
`config/fleet.json`). Renders [runboard](/platform/experiment-tracking.md)
runs via the [telemetry API](/platform/core-api-telemetry.md).

# Views

* **Run list** — status pills (icon + label, never color alone), summary
  stat tiles, 5 s polling.
* **Run detail** — charts grouped by metric prefix (`train/`, `eval/`,
  `asn/`), 3 s live tail while a run is `running`, event timeline,
  config table.

# ASN visual telemetry

* `asn/effective_rank` chart carries the rank-floor reference line and
  overlays surgery / collapse events as dated markers.
* A collapse alert banner (role="alert", flash animation) appears while
  the latest effective rank sits below the floor.
* `asn/r2d_curvature_b*` metrics fold into one multi-series chart with a
  legend and direct line-end labels.

# Chart discipline

Custom SVG line charts, zero chart dependencies. Dark-selected steps from
the validated reference palette (worst adjacent CVD pair sits in the
floor band, mitigated with direct labels and a per-chart data-table
view). One axis per chart; crosshair + tooltip hover; recessive grid.

# Running

```powershell
uv run python -m runboard demo    # seed synthetic telemetry (tagged demo)
uv run python -m runboard serve   # local reader on :8100
pnpm --filter @synthaembed/observatory dev   # console on :3006
```
