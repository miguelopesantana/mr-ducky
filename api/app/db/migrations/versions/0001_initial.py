"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-05-02
"""

import sqlalchemy as sa
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "categories",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(64), nullable=False),
        sa.Column("emoji", sa.String(16), nullable=False),
        sa.Column("color", sa.String(9), nullable=False),
        sa.Column("monthly_budget", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint("name", name="uq_categories_name"),
    )

    op.create_table(
        "transactions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "category_id",
            sa.Integer(),
            sa.ForeignKey("categories.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("bank", sa.String(64), nullable=False),
        sa.Column("merchant_name", sa.String(128), nullable=False),
        sa.Column("amount", sa.BigInteger(), nullable=False),
        sa.Column(
            "type",
            sa.String(16),
            nullable=False,
        ),
        sa.Column("occurred_at", sa.Date(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("type IN ('expense','income')", name="ck_transactions_type"),
    )
    op.create_index(
        "ix_transactions_occurred_at", "transactions", ["occurred_at"], unique=False
    )

    op.create_table(
        "subscriptions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(128), nullable=False),
        sa.Column("logo_url", sa.Text(), nullable=True),
        sa.Column("amount", sa.BigInteger(), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="EUR"),
        sa.Column("billing_cycle", sa.String(16), nullable=False),
        sa.Column("next_charge_date", sa.Date(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "billing_cycle IN ('monthly','yearly','weekly')",
            name="ck_subscriptions_billing_cycle",
        ),
    )

    op.create_table(
        "budgets",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("month", sa.String(7), nullable=False),
        sa.Column("total_budget", sa.BigInteger(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint("month", name="uq_budgets_month"),
    )

    # Stub tables for gocardless / chat routers (not yet wired).
    op.create_table(
        "accounts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("gocardless_id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("currency", sa.String(3), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.UniqueConstraint("gocardless_id"),
    )
    op.create_table(
        "bank_transactions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "account_id",
            sa.Integer(),
            sa.ForeignKey("accounts.id"),
            nullable=False,
        ),
        sa.Column("gocardless_id", sa.String(), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(3), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("booked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.UniqueConstraint("gocardless_id"),
    )
    op.create_table(
        "chat_messages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_table("chat_messages")
    op.drop_table("bank_transactions")
    op.drop_table("accounts")
    op.drop_table("budgets")
    op.drop_table("subscriptions")
    op.drop_index("ix_transactions_occurred_at", table_name="transactions")
    op.drop_table("transactions")
    op.drop_table("categories")
