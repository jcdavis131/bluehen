"""Tenant metadata contracts (Spec 0024 / RECO-004)."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "019_meta_contracts"
down_revision = "018_wiki_description"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "tenant_meta_contracts",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("workspace_id", UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("json_schema", JSONB(), nullable=False),
        sa.Column("filterable", JSONB(), nullable=False, server_default="[]"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("workspace_id", "version", name="uq_meta_contract_ws_version"),
    )
    op.execute("GRANT SELECT, INSERT ON tenant_meta_contracts TO synthaembed_tenant")


def downgrade() -> None:
    op.drop_table("tenant_meta_contracts")
