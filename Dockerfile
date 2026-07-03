# SynthaEmbed backend — core-api + worker (ADR-002, Railway)
FROM ghcr.io/astral-sh/uv:python3.11-bookworm-slim AS builder

WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

# every [tool.uv.workspace] member must be present or `uv sync` fails
COPY pyproject.toml uv.lock ./
COPY packages/asn-engine packages/asn-engine
COPY packages/datalab packages/datalab
COPY packages/eval-harness packages/eval-harness
COPY packages/omni-sim packages/omni-sim
COPY packages/runboard packages/runboard
COPY services/core-api services/core-api
COPY services/trainer services/trainer
COPY services/worker services/worker

# db extra is required: app.auth imports sqlalchemy at module level
RUN uv sync --all-packages --extra model --extra db \
    && uv pip install --python .venv/bin/python torch \
         --index-url https://download.pytorch.org/whl/cpu --force-reinstall

# --- runtime ---
FROM ghcr.io/astral-sh/uv:python3.11-bookworm-slim AS runtime

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/services/core-api \
    PATH="/app/.venv/bin:$PATH" \
    SYNTH_ARTIFACTS_DIR=/data/artifacts \
    SYNTH_CORPORA_DIR=/app/corpora \
    RUNBOARD_DIR=/data/runs \
    DATALAB_DIR=/data/datalab

RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /data/artifacts /data/corpora /data/runs /data/datalab

COPY --from=builder /app/.venv /app/.venv
COPY packages/asn-engine packages/asn-engine
COPY packages/datalab packages/datalab
COPY packages/eval-harness packages/eval-harness
COPY packages/omni-sim packages/omni-sim
COPY packages/runboard packages/runboard
COPY services/core-api services/core-api
COPY services/trainer services/trainer
COPY services/worker services/worker
COPY content/corpora /app/corpora
# Charters + BD queue: the deploy authorization layer must exist in-image
COPY config/recipes /app/config/recipes
COPY content/fleet /app/content/fleet
COPY infra/docker-entrypoint.sh infra/docker-entrypoint.sh

# smoke: import the app AND the lazily-imported telemetry service
RUN chmod +x infra/docker-entrypoint.sh \
    && python -c "import app.main, app.services.telemetry; print('app import ok')"

EXPOSE 8000

ENTRYPOINT ["/app/infra/docker-entrypoint.sh"]
CMD ["api"]
