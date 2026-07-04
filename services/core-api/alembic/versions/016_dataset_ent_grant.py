"""Tenant grant for dataset_entitlements (consistency with 012-014 pattern)."""

from alembic import op

revision = "016_dataset_ent_grant"
down_revision = "015_dataset_entitlements"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("GRANT SELECT ON dataset_entitlements TO synthaembed_tenant")


def downgrade() -> None:
    op.execute("REVOKE SELECT ON dataset_entitlements FROM synthaembed_tenant")
