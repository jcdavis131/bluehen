"""Data Refinery catalog (Spec 0018): public dataset catalog, harvest
jobs, and consented submissions."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "009_refinery_catalog"
down_revision = "008_model_artifact"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "catalog_datasets",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("slug", sa.String(256), nullable=False, unique=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("doc_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("chunk_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("token_estimate", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("tags", JSONB(), nullable=False, server_default="[]"),
        sa.Column("card_md", sa.Text(), nullable=True),
        sa.Column("provenance", JSONB(), nullable=True),
        sa.Column("source_id", sa.String(128), nullable=True),
        sa.Column("workspace_id", UUID(as_uuid=True), nullable=True),
        sa.Column("sample", JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_catalog_datasets_cursor", "catalog_datasets", ["created_at", "id"]
    )
    op.create_index(
        "ix_catalog_datasets_tags", "catalog_datasets", ["tags"], postgresql_using="gin"
    )

    op.create_table(
        "harvest_jobs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("source_id", sa.String(128), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="pending"),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("requested_by", sa.String(64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "refinery_submissions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("workspace_id", UUID(as_uuid=True), nullable=False),
        sa.Column("consent", sa.Boolean(), nullable=False),
        sa.Column("receipt", UUID(as_uuid=True), nullable=False, unique=True),
        sa.Column("text_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("text_ref", sa.Text(), nullable=True),
        sa.Column("tags", JSONB(), nullable=False, server_default="[]"),
        sa.Column("status", sa.String(16), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("refinery_submissions")
    op.drop_table("harvest_jobs")
    op.drop_index("ix_catalog_datasets_tags", table_name="catalog_datasets")
    op.drop_index("ix_catalog_datasets_cursor", table_name="catalog_datasets")
    op.drop_table("catalog_datasets")
