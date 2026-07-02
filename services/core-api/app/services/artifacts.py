"""Model checkpoint storage — local disk or S3-compatible registry."""

from __future__ import annotations

import tempfile
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator
from uuid import UUID

from app.config import (
    ARTIFACTS_DIR,
    AWS_ACCESS_KEY_ID,
    AWS_REGION,
    AWS_SECRET_ACCESS_KEY,
    MODEL_REGISTRY_URI,
    S3_ENDPOINT_URL,
)


def workspace_dir(workspace_id: UUID | str) -> Path:
    path = ARTIFACTS_DIR / str(workspace_id)
    path.mkdir(parents=True, exist_ok=True)
    return path


def _split_s3_uri(uri: str) -> tuple[str, str]:
    if not uri.startswith("s3://"):
        raise ValueError(f"expected s3:// URI, got {uri!r}")
    bucket, _, key = uri[5:].partition("/")
    if not bucket or not key:
        raise ValueError(f"invalid s3 URI: {uri!r}")
    return bucket, key


def s3_enabled() -> bool:
    return MODEL_REGISTRY_URI.startswith("s3://")


def _s3_client():
    import boto3

    kwargs: dict = {"region_name": AWS_REGION}
    if S3_ENDPOINT_URL:
        kwargs["endpoint_url"] = S3_ENDPOINT_URL
    if AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY:
        kwargs["aws_access_key_id"] = AWS_ACCESS_KEY_ID
        kwargs["aws_secret_access_key"] = AWS_SECRET_ACCESS_KEY
    return boto3.client("s3", **kwargs)


def publish_checkpoint(local_path: Path, workspace_id: UUID | str, model_version: str) -> str:
    """Upload checkpoint if S3 registry configured; return canonical DB path."""
    local_path = Path(local_path)
    if not local_path.exists():
        raise FileNotFoundError(local_path)

    if not s3_enabled():
        return str(local_path.resolve())

    rest = MODEL_REGISTRY_URI[5:]
    bucket, _, prefix = rest.partition("/")
    key_parts = [p for p in (prefix.strip("/"), str(workspace_id), f"{model_version}.pt") if p]
    key = "/".join(key_parts)

    client = _s3_client()
    client.upload_file(str(local_path), bucket, key)
    return f"s3://{bucket}/{key}"


def checkpoint_exists(path: str) -> bool:
    if path.startswith("s3://"):
        bucket, key = _split_s3_uri(path)
        client = _s3_client()
        try:
            client.head_object(Bucket=bucket, Key=key)
            return True
        except client.exceptions.NoSuchKey:
            return False
        except Exception:
            return False
    return Path(path).exists()


@contextmanager
def open_checkpoint(path: str) -> Iterator[Path]:
    """Yield a local path suitable for torch.load (downloads S3 to temp)."""
    if not path.startswith("s3://"):
        local = Path(path)
        if not local.exists():
            raise FileNotFoundError(f"checkpoint missing: {path}")
        yield local
        return

    bucket, key = _split_s3_uri(path)
    client = _s3_client()
    suffix = Path(key).suffix or ".pt"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp_path = Path(tmp.name)
    try:
        client.download_file(bucket, key, str(tmp_path))
        yield tmp_path
    finally:
        tmp_path.unlink(missing_ok=True)
