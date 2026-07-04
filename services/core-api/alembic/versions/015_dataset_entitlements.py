"""Dataset purchase entitlements (Spec 0021 P3)."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "015_dataset_entitlements"
down_revision = "014_entitlements"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "dataset_entitlements",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("order_id", sa.String(128), nullable=False),
        sa.Column("dataset_slug", sa.String(256), nullable=False),
        sa.Column("email", sa.Text(), nullable=False, server_default=""),
        sa.Column("payment_status", sa.String(24), nullable=False, server_default="pending-gate"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("order_id", "dataset_slug", name="uq_dataset_entitlement_order_slug"),
    )
    op.create_index("ix_dataset_entitlements_slug", "dataset_entitlements", ["dataset_slug"])


def downgrade() -> None:
    op.drop_index("ix_dataset_entitlements_slug", table_name="dataset_entitlements")
    op.drop_table("dataset_entitlements")
