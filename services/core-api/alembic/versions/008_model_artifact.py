"""Head-only model artifacts stored in Postgres (goal: serve trained models
from the DB so api and worker need no shared filesystem)."""

import sqlalchemy as sa
from alembic import op

revision = "008_model_artifact"
down_revision = "007_leads"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "model_versions",
        sa.Column("artifact", sa.LargeBinary(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("model_versions", "artifact")
