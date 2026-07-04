"""Usage retention (WIRE-203): daily rollup archive for purged raw events."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "017_usage_daily"
down_revision = "016_dataset_ent_grant"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "usage_daily",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("workspace_id", UUID(as_uuid=True), nullable=False),
        sa.Column("kind", sa.String(24), nullable=False),
        sa.Column("day", sa.Date(), nullable=False),
        sa.Column("units", sa.BigInteger(), nullable=False, server_default="0"),
        sa.UniqueConstraint("workspace_id", "kind", "day", name="uq_usage_daily_ws_kind_day"),
    )
    op.execute("GRANT SELECT ON usage_daily TO synthaembed_tenant")


def downgrade() -> None:
    op.drop_table("usage_daily")
