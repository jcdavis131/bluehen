"""Initial schema + Postgres RLS policies (spec 0002)."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "corporate_workspaces",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("site_id", sa.String(64), unique=True),
        sa.Column("api_key_hash", sa.String(128), unique=True, nullable=False),
        sa.Column("cost_ceiling_usd", sa.Float(), server_default="50"),
        sa.Column("spent_usd_today", sa.Float(), server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )

    tenant_tables = [
        ("trace_spans", [
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("workspace_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("corporate_workspaces.id")),
            sa.Column("trace_id", sa.String(64), index=True),
            sa.Column("span_id", sa.String(64)),
            sa.Column("parent_span", sa.String(64)),
            sa.Column("actor", sa.String(128)),
            sa.Column("target", sa.String(128)),
            sa.Column("action", sa.String(128)),
            sa.Column("status", sa.String(32)),
            sa.Column("duration_ms", sa.Integer()),
            sa.Column("detail", postgresql.JSONB()),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        ]),
        ("auto_research_ledger", [
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("workspace_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("corporate_workspaces.id"), nullable=False),
            sa.Column("stage", sa.String(64), nullable=False),
            sa.Column("site_id", sa.String(64)),
            sa.Column("notes", sa.Text()),
            sa.Column("model_version", sa.String(128)),
            sa.Column("metric_delta", sa.Float()),
            sa.Column("hyperparameters", postgresql.JSONB()),
            sa.Column("cost_usd", sa.Float(), server_default="0"),
            sa.Column("trace_id", sa.String(64)),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        ]),
        ("collections", [
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("workspace_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("corporate_workspaces.id"), nullable=False),
            sa.Column("corpus_uri", sa.Text(), nullable=False),
            sa.Column("doc_count", sa.Integer(), server_default="0"),
            sa.Column("chunk_count", sa.Integer(), server_default="0"),
            sa.Column("pair_count", sa.Integer(), server_default="0"),
            sa.Column("meta", postgresql.JSONB()),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        ]),
        ("training_jobs", [
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("workspace_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("corporate_workspaces.id"), nullable=False),
            sa.Column("collection_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("collections.id")),
            sa.Column("status", sa.String(32), server_default="pending"),
            sa.Column("recipe", postgresql.JSONB(), nullable=False),
            sa.Column("model_version", sa.String(128)),
            sa.Column("effective_rank", sa.Float()),
            sa.Column("checkpoint_path", sa.Text()),
            sa.Column("error", sa.Text()),
            sa.Column("trace_id", sa.String(64)),
            sa.Column("cost_usd", sa.Float(), server_default="0"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        ]),
        ("model_versions", [
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("workspace_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("corporate_workspaces.id"), nullable=False),
            sa.Column("version", sa.String(128), nullable=False),
            sa.Column("checkpoint_path", sa.Text(), nullable=False),
            sa.Column("effective_rank", sa.Float()),
            sa.Column("ndcg10", sa.Float()),
            sa.Column("deployed", sa.Boolean(), server_default="false"),
            sa.Column("truncate_dims", sa.Integer()),
            sa.Column("quant", sa.String(16)),
            sa.Column("meta", postgresql.JSONB()),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
            sa.UniqueConstraint("workspace_id", "version", name="uq_workspace_model_version"),
        ]),
    ]

    for name, cols in tenant_tables:
        op.create_table(name, *cols)
        op.execute(f"ALTER TABLE {name} ENABLE ROW LEVEL SECURITY")
        if name == "trace_spans":
            op.execute(
                f"""
                CREATE POLICY tenant_isolation ON {name}
                USING (
                  workspace_id IS NULL
                  OR workspace_id = current_setting('app.workspace_id', true)::uuid
                )
                """
            )
        else:
            op.execute(
                f"""
                CREATE POLICY tenant_isolation ON {name}
                USING (workspace_id = current_setting('app.workspace_id', true)::uuid)
                """
            )


def downgrade() -> None:
    for t in ["model_versions", "training_jobs", "collections", "auto_research_ledger", "trace_spans"]:
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation ON {t}")
        op.drop_table(t)
    op.drop_table("corporate_workspaces")
