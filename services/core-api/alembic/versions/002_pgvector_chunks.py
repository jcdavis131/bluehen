"""pgvector chunk embeddings for tenant-scoped retrieval."""

from alembic import op

revision = "002_pgvector_chunks"
down_revision = "001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
    op.execute(
        """
        CREATE TABLE document_chunks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            workspace_id UUID NOT NULL REFERENCES corporate_workspaces(id) ON DELETE CASCADE,
            collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
            chunk_id TEXT NOT NULL,
            text TEXT NOT NULL,
            model_version TEXT NOT NULL,
            embedding vector(384) NOT NULL,
            payload JSONB,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            UNIQUE (workspace_id, collection_id, chunk_id, model_version)
        )
        """
    )
    op.execute("CREATE INDEX ix_document_chunks_workspace ON document_chunks (workspace_id)")
    op.execute("CREATE INDEX ix_document_chunks_collection ON document_chunks (collection_id)")
    op.execute("ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY tenant_isolation ON document_chunks
        USING (workspace_id = current_setting('app.workspace_id', true)::uuid)
        """
    )


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS tenant_isolation ON document_chunks")
    op.execute("DROP TABLE IF EXISTS document_chunks")
