"""Grant sequence usage to synthaembed_tenant for INSERT under RLS."""

from alembic import op

revision = "005_tenant_sequences"
down_revision = "004_workspace_rls"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO synthaembed_tenant")
    op.execute(
        """
        ALTER DEFAULT PRIVILEGES IN SCHEMA public
        GRANT USAGE, SELECT ON SEQUENCES TO synthaembed_tenant
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER DEFAULT PRIVILEGES IN SCHEMA public
        REVOKE USAGE, SELECT ON SEQUENCES FROM synthaembed_tenant
        """
    )
    op.execute("REVOKE USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public FROM synthaembed_tenant")
