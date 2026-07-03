"""Tenant-scoped persistence — all tables carry workspace_id for RLS."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import BigInteger, Boolean, DateTime, Float, ForeignKey, Integer, LargeBinary, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class Workspace(Base):
    __tablename__ = "corporate_workspaces"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    site_id: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True)
    api_key_hash: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    cost_ceiling_usd: Mapped[float] = mapped_column(Float, default=50.0)
    spent_usd_today: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class TraceSpan(Base):
    __tablename__ = "trace_spans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    workspace_id: Mapped[uuid.UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("corporate_workspaces.id"))
    trace_id: Mapped[str | None] = mapped_column(String(64), index=True)
    span_id: Mapped[str | None] = mapped_column(String(64))
    parent_span: Mapped[str | None] = mapped_column(String(64))
    actor: Mapped[str] = mapped_column(String(128), default="unknown")
    target: Mapped[str] = mapped_column(String(128))
    action: Mapped[str] = mapped_column(String(128))
    status: Mapped[str] = mapped_column(String(32))
    duration_ms: Mapped[int] = mapped_column(Integer)
    detail: Mapped[dict | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class LedgerEntry(Base):
    __tablename__ = "auto_research_ledger"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    workspace_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("corporate_workspaces.id"), index=True)
    stage: Mapped[str] = mapped_column(String(64))
    site_id: Mapped[str | None] = mapped_column(String(64))
    notes: Mapped[str | None] = mapped_column(Text)
    model_version: Mapped[str | None] = mapped_column(String(128))
    metric_delta: Mapped[float | None] = mapped_column(Float)
    hyperparameters: Mapped[dict | None] = mapped_column(JSONB)
    cost_usd: Mapped[float] = mapped_column(Float, default=0.0)
    trace_id: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Collection(Base):
    __tablename__ = "collections"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("corporate_workspaces.id"), index=True)
    corpus_uri: Mapped[str] = mapped_column(Text)
    doc_count: Mapped[int] = mapped_column(Integer, default=0)
    chunk_count: Mapped[int] = mapped_column(Integer, default=0)
    pair_count: Mapped[int] = mapped_column(Integer, default=0)
    meta: Mapped[dict | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class TrainingJob(Base):
    __tablename__ = "training_jobs"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("corporate_workspaces.id"), index=True)
    collection_id: Mapped[uuid.UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("collections.id"))
    status: Mapped[str] = mapped_column(String(32), default="pending", index=True)
    recipe: Mapped[dict] = mapped_column(JSONB)
    model_version: Mapped[str | None] = mapped_column(String(128))
    effective_rank: Mapped[float | None] = mapped_column(Float)
    checkpoint_path: Mapped[str | None] = mapped_column(Text)
    error: Mapped[str | None] = mapped_column(Text)
    trace_id: Mapped[str | None] = mapped_column(String(64))
    cost_usd: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class ModelVersion(Base):
    __tablename__ = "model_versions"
    __table_args__ = (UniqueConstraint("workspace_id", "version", name="uq_workspace_model_version"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    workspace_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("corporate_workspaces.id"), index=True)
    version: Mapped[str] = mapped_column(String(128), nullable=False)
    checkpoint_path: Mapped[str] = mapped_column(Text)
    effective_rank: Mapped[float | None] = mapped_column(Float)
    ndcg10: Mapped[float | None] = mapped_column(Float)
    deployed: Mapped[bool] = mapped_column(Boolean, default=False)
    truncate_dims: Mapped[int | None] = mapped_column(Integer)
    quant: Mapped[str | None] = mapped_column(String(16))
    meta: Mapped[dict | None] = mapped_column(JSONB)
    # Head-only checkpoints (a few MB) live in the DB so serving needs no
    # shared filesystem with the trainer.
    artifact: Mapped[bytes | None] = mapped_column(LargeBinary)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    workspace: Mapped["Workspace"] = relationship(backref="models")


class CatalogDataset(Base):
    """Public dataset catalog (Spec 0018). workspace_id NULL = public."""

    __tablename__ = "catalog_datasets"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(256), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    doc_count: Mapped[int] = mapped_column(Integer, default=0)
    chunk_count: Mapped[int] = mapped_column(Integer, default=0)
    token_estimate: Mapped[int] = mapped_column(BigInteger, default=0)
    tags: Mapped[list] = mapped_column(JSONB, default=list)
    card_md: Mapped[str | None] = mapped_column(Text)
    provenance: Mapped[dict | None] = mapped_column(JSONB)
    source_id: Mapped[str | None] = mapped_column(String(128))
    workspace_id: Mapped[uuid.UUID | None] = mapped_column(PGUUID(as_uuid=True))
    sample: Mapped[list | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class HarvestJob(Base):
    __tablename__ = "harvest_jobs"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_id: Mapped[str] = mapped_column(String(128), nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="pending")
    error: Mapped[str | None] = mapped_column(Text)
    requested_by: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class RefinerySubmission(Base):
    """Consented contribution (Spec 0018 §4). Consent is NOT NULL by design."""

    __tablename__ = "refinery_submissions"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False)
    consent: Mapped[bool] = mapped_column(Boolean, nullable=False)
    receipt: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False, unique=True, default=uuid.uuid4)
    text_count: Mapped[int] = mapped_column(Integer, default=0)
    text_ref: Mapped[str | None] = mapped_column(Text)
    tags: Mapped[list] = mapped_column(JSONB, default=list)
    status: Mapped[str] = mapped_column(String(16), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class WikiPage(Base):
    """Wiki Refinery page (Spec 0020). Postgres is the durable wiki store."""

    __tablename__ = "wiki_pages"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(256), nullable=False, unique=True)
    kind: Mapped[str] = mapped_column(String(16), nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    body_md: Mapped[str] = mapped_column(Text, nullable=False)
    generated_by: Mapped[str] = mapped_column(String(16), default="deterministic")
    sources: Mapped[list | None] = mapped_column(JSONB)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    workspace_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("corporate_workspaces.id"), index=True)
    name: Mapped[str] = mapped_column(Text, default="")
    email: Mapped[str] = mapped_column(Text, nullable=False)
    company: Mapped[str] = mapped_column(Text, default="")
    topic: Mapped[str] = mapped_column(Text, default="general")
    message: Mapped[str] = mapped_column(Text, default="")
    source: Mapped[str] = mapped_column(Text, nullable=False)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
