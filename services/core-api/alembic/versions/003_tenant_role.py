"""Tenant DB role so RLS applies even when the connection user is a superuser."""

from alembic import op

revision = "003_tenant_role"
down_revision = "002_pgvector_chunks"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'synthaembed_tenant') THEN
            CREATE ROLE synthaembed_tenant NOLOGIN NOINHERIT;
          END IF;
        END
        $$
        """
    )
    op.execute("GRANT USAGE ON SCHEMA public TO synthaembed_tenant")
    for table in (
        "trace_spans",
        "auto_research_ledger",
        "collections",
        "training_jobs",
        "model_versions",
        "document_chunks",
    ):
        op.execute(f"GRANT SELECT, INSERT, UPDATE, DELETE ON {table} TO synthaembed_tenant")
    op.execute(
        """
        DO $$
        BEGIN
          EXECUTE 'GRANT synthaembed_tenant TO ' || current_user;
        END
        $$
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DO $$
        BEGIN
          EXECUTE 'REVOKE synthaembed_tenant FROM ' || current_user;
        END
        $$
        """
    )
    op.execute("DROP ROLE IF EXISTS synthaembed_tenant")
