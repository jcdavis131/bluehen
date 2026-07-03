"""Tenant-role grants for refinery + metering tables (the 007_leads
pattern — tenant sessions run as synthaembed_tenant and see nothing
without explicit grants)."""

from alembic import op

revision = "012_tenant_grants"
down_revision = "011_usage_events"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("GRANT SELECT ON usage_events TO synthaembed_tenant")
    op.execute("GRANT SELECT, INSERT ON refinery_submissions TO synthaembed_tenant")


def downgrade() -> None:
    op.execute("REVOKE SELECT ON usage_events FROM synthaembed_tenant")
    op.execute("REVOKE SELECT, INSERT ON refinery_submissions FROM synthaembed_tenant")
