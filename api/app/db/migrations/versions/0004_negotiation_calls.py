"""negotiation_calls table

Revision ID: 0004
Revises: 0003
Create Date: 2026-05-03
"""

import sqlalchemy as sa
from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "negotiation_calls",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("title", sa.String(128), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="scheduled"),
        sa.Column("current_amount_cents", sa.BigInteger(), nullable=True),
        sa.Column("target_amount_cents", sa.BigInteger(), nullable=True),
        sa.Column("competitor_offer", sa.String(128), nullable=True),
        sa.Column("scheduled_for", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("result_summary", sa.Text(), nullable=True),
        sa.Column("saved_monthly_cents", sa.BigInteger(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "status IN ('scheduled','in_progress','successful','failed')",
            name="ck_negotiation_calls_status",
        ),
    )


def downgrade() -> None:
    op.drop_table("negotiation_calls")
