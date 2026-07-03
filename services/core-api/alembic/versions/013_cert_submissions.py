"""Automated certification (Spec 0021 P4): self-service submissions."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "013_cert_submissions"
down_revision = "012_tenant_grants"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "cert_submissions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("workspace_id", UUID(as_uuid=True), nullable=False),
        sa.Column("endpoint_url", sa.Text(), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="pending"),
        sa.Column("scorecard", JSONB(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("payment_status", sa.String(24), nullable=False, server_default="pending-gate"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.execute("GRANT SELECT, INSERT ON cert_submissions TO synthaembed_tenant")


def downgrade() -> None:
    op.drop_table("cert_submissions")
