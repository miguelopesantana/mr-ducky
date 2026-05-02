"""subscription metadata + widen category icon column

Revision ID: 0002
Revises: 0001
Create Date: 2026-05-02
"""

import sqlalchemy as sa
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "categories",
        "emoji",
        existing_type=sa.String(16),
        type_=sa.String(64),
        existing_nullable=False,
    )
    op.add_column(
        "subscriptions",
        sa.Column("color", sa.String(9), nullable=True),
    )
    op.add_column(
        "subscriptions",
        sa.Column("initials", sa.String(4), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("subscriptions", "initials")
    op.drop_column("subscriptions", "color")
    op.alter_column(
        "categories",
        "emoji",
        existing_type=sa.String(64),
        type_=sa.String(16),
        existing_nullable=False,
    )
