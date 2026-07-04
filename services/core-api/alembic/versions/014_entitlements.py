"""Entitlements (Spec 0021 P3/P5): what a workspace has paid-or-been-granted
access to. Checkout webhooks grant these later; admin grants work today."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "014_entitlements"
down_revision = "013_cert_submissions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "entitlements",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("workspace_id", UUID(as_uuid=True), nullable=False),
        sa.Column("sku", sa.String(128), nullable=False),
        sa.Column("granted_by", sa.String(32), nullable=False, server_default="admin"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_entitlements_ws_sku", "entitlements", ["workspace_id", "sku"])
    op.execute("GRANT SELECT ON entitlements TO synthaembed_tenant")


def downgrade() -> None:
    op.drop_table("entitlements")
