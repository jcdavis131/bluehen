"""Usage metering (Spec 0021 P1): the event stream Stripe reconciles from."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "011_usage_events"
down_revision = "010_wiki_pages"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "usage_events",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("workspace_id", UUID(as_uuid=True), nullable=False),
        sa.Column("kind", sa.String(24), nullable=False),
        sa.Column("units", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("ts", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_usage_events_ws_ts", "usage_events", ["workspace_id", "ts"])


def downgrade() -> None:
    op.drop_index("ix_usage_events_ws_ts", table_name="usage_events")
    op.drop_table("usage_events")
