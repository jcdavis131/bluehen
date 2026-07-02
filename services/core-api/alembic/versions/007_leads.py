"""Durable lead storage (REV-904).

Contact + waitlist leads previously wrote to repo-relative data/leads JSONL,
which is read-only / ephemeral on Vercel — real customer leads 500'd or
vanished. This migration adds a tenant-scoped `leads` table backed by Postgres
so core-api can durably persist leads via POST /v1/leads. RLS keeps each
workspace to its own leads.
"""

from alembic import op

revision = "007_leads"
down_revision = "006_workspace_budget_update"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE leads (
            id BIGSERIAL PRIMARY KEY,
            workspace_id UUID NOT NULL REFERENCES corporate_workspaces(id),
            name TEXT NOT NULL DEFAULT '',
            email TEXT NOT NULL,
            company TEXT NOT NULL DEFAULT '',
            topic TEXT NOT NULL DEFAULT 'general',
            message TEXT NOT NULL DEFAULT '',
            source TEXT NOT NULL,
            received_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute("CREATE INDEX leads_workspace_id_idx ON leads(workspace_id)")
    op.execute("CREATE INDEX leads_received_at_idx ON leads(received_at DESC)")
    op.execute("ALTER TABLE leads ENABLE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY tenant_insert_self ON leads
        FOR INSERT
        WITH CHECK (workspace_id = current_setting('app.workspace_id', true)::uuid)
        """
    )
    op.execute(
        """
        CREATE POLICY tenant_select_self ON leads
        FOR SELECT
        USING (workspace_id = current_setting('app.workspace_id', true)::uuid)
        """
    )
    op.execute("GRANT SELECT, INSERT ON leads TO synthaembed_tenant")


def downgrade() -> None:
    op.execute("REVOKE SELECT, INSERT ON leads FROM synthaembed_tenant")
    op.execute("DROP POLICY IF EXISTS tenant_select_self ON leads")
    op.execute("DROP POLICY IF EXISTS tenant_insert_self ON leads")
    op.execute("ALTER TABLE leads DISABLE ROW LEVEL SECURITY")
    op.execute("DROP TABLE IF EXISTS leads")
