#!/bin/sh
set -eu

mode="${1:-api}"
cd /app
PORT="${PORT:-8000}"
UV="/app/.venv/bin"

echo "[entrypoint] mode=${mode} PORT=${PORT} pid=$$"

case "$mode" in
  api)
    cd /app/services/core-api
    echo "[entrypoint] running alembic upgrade head"
    "$UV/alembic" upgrade head || echo "[entrypoint] migrate warning — continuing"
    echo "[entrypoint] starting uvicorn on 0.0.0.0:${PORT}"
    exec "$UV/uvicorn" app.main:app --host 0.0.0.0 --port "$PORT" --log-level info
    ;;
  worker)
    exec "$UV/python" /app/services/worker/main.py
    ;;
  all)
    # Combined api + worker in one container: shared filesystem for model
    # checkpoints (true service split needs MODEL_REGISTRY_URI -> S3).
    cd /app/services/core-api
    echo "[entrypoint] running alembic upgrade head"
    "$UV/alembic" upgrade head || echo "[entrypoint] migrate warning - continuing"
    echo "[entrypoint] starting supervised worker (background)"
    (
      while true; do
        PYTHONPATH=/app/services/core-api "$UV/python" /app/services/worker/main.py
        echo "[entrypoint] worker exited (rc=$?) - restarting in 10s (OOM kills land here)"
        sleep 10
      done
    ) &
    echo "[entrypoint] starting uvicorn on 0.0.0.0:${PORT}"
    exec "$UV/uvicorn" app.main:app --host 0.0.0.0 --port "$PORT" --log-level info
    ;;
  migrate)
    cd /app/services/core-api
    exec "$UV/alembic" upgrade head
    ;;
  *)
    echo "usage: $0 {api|worker|migrate}" >&2
    exit 1
    ;;
esac
