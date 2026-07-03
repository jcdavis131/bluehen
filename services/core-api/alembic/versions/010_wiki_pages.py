"""Wiki Refinery pages (Spec 0020) — Postgres is the durable wiki store."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "010_wiki_pages"
down_revision = "009_refinery_catalog"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "wiki_pages",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("slug", sa.String(256), nullable=False, unique=True),
        sa.Column("kind", sa.String(16), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("body_md", sa.Text(), nullable=False),
        sa.Column("generated_by", sa.String(16), nullable=False, server_default="deterministic"),
        sa.Column("sources", JSONB(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_wiki_pages_kind", "wiki_pages", ["kind"])


def downgrade() -> None:
    op.drop_index("ix_wiki_pages_kind", table_name="wiki_pages")
    op.drop_table("wiki_pages")
