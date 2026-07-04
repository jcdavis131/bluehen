"""FLY-001: wiki pages carry meta descriptions for the demand engine."""

import sqlalchemy as sa
from alembic import op

revision = "018_wiki_description"
down_revision = "017_usage_daily"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("wiki_pages", sa.Column("description", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("wiki_pages", "description")
