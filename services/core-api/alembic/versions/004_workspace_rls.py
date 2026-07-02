"""RLS on corporate_workspaces so tenant role can read its own row."""

from alembic import op

revision = "004_workspace_rls"
down_revision = "003_tenant_role"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE corporate_workspaces ENABLE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY tenant_read_self ON corporate_workspaces
        FOR SELECT
        USING (id = current_setting('app.workspace_id', true)::uuid)
        """
    )
    op.execute("GRANT SELECT ON corporate_workspaces TO synthaembed_tenant")


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS tenant_read_self ON corporate_workspaces")
    op.execute("ALTER TABLE corporate_workspaces DISABLE ROW LEVEL SECURITY")
    op.execute("REVOKE SELECT ON corporate_workspaces FROM synthaembed_tenant")
