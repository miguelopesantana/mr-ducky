from datetime import date, datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base

TRANSACTION_TYPES = ("expense", "income")
BILLING_CYCLES = ("monthly", "yearly", "weekly")


class Category(Base):
    __tablename__ = "categories"
    __table_args__ = (UniqueConstraint("name", name="uq_categories_name"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    emoji: Mapped[str] = mapped_column(String(16), nullable=False)
    color: Mapped[str] = mapped_column(String(9), nullable=False)
    monthly_budget: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    transactions: Mapped[list["Transaction"]] = relationship(back_populates="category")


class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = (Index("ix_transactions_occurred_at", "occurred_at"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    category_id: Mapped[int | None] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL"), nullable=True
    )
    bank: Mapped[str] = mapped_column(String(64), nullable=False)
    merchant_name: Mapped[str] = mapped_column(String(128), nullable=False)
    amount: Mapped[int] = mapped_column(BigInteger, nullable=False)
    type: Mapped[str] = mapped_column(
        Enum(*TRANSACTION_TYPES, name="transaction_type", native_enum=False),
        nullable=False,
    )
    occurred_at: Mapped[date] = mapped_column(Date, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    category: Mapped["Category | None"] = relationship(back_populates="transactions")


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    logo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    amount: Mapped[int] = mapped_column(BigInteger, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="EUR")
    billing_cycle: Mapped[str] = mapped_column(
        Enum(*BILLING_CYCLES, name="billing_cycle", native_enum=False), nullable=False
    )
    next_charge_date: Mapped[date] = mapped_column(Date, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class Budget(Base):
    __tablename__ = "budgets"
    __table_args__ = (UniqueConstraint("month", name="uq_budgets_month"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    month: Mapped[str] = mapped_column(String(7), nullable=False)
    total_budget: Mapped[int] = mapped_column(BigInteger, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


# Stub-only tables retained for the gocardless / chat routers (not yet implemented).


class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    gocardless_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    currency: Mapped[str | None] = mapped_column(String(3))
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class BankTransaction(Base):
    __tablename__ = "bank_transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"), nullable=False)
    gocardless_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str | None] = mapped_column(String(3))
    description: Mapped[str | None] = mapped_column(Text)
    booked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    role: Mapped[str] = mapped_column(String, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
