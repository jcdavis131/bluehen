"""Allow tenant role to update own workspace budget (spent_usd_today)."""

from alembic import op

revision = "006_workspace_budget_update"
down_revision = "005_tenant_sequences"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE POLICY tenant_update_self ON corporate_workspaces
        FOR UPDATE
        USING (id = current_setting('app.workspace_id', true)::uuid)
        WITH CHECK (id = current_setting('app.workspace_id', true)::uuid)
        """
    )
    op.execute("GRANT UPDATE (spent_usd_today) ON corporate_workspaces TO synthaembed_tenant")


def downgrade() -> None:
    op.execute("REVOKE UPDATE (spent_usd_today) ON corporate_workspaces FROM synthaembed_tenant")
    op.execute("DROP POLICY IF EXISTS tenant_update_self ON corporate_workspaces")
