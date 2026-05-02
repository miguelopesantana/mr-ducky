"""Tool-level tests: schema validation, row limits, sanitization, write flow."""
from __future__ import annotations

import json

import pytest

from app.db.models import Category, PendingAction, Transaction
from app.services.chat.tools import ChatContext, REGISTRY, execute


def _seed(db):
    cat = Category(name="Food", emoji="🍕", color="#000000", monthly_budget=10000)
    db.add(cat)
    db.flush()
    db.add(
        Transaction(
            category_id=cat.id,
            bank="acme-private-bank",
            merchant_name="Pizza Shop",
            amount=-1500,
            type="expense",
            occurred_at=__import__("datetime").date(2026, 5, 5),
            notes="iban=DE89, contact john@example.com",
        )
    )
    db.commit()
    return cat


def test_query_transactions_strips_sensitive_fields(db_session):
    _seed(db_session)
    result = execute(
        "query_transactions",
        {"month": "2026-05"},
        db_session,
        ChatContext("conv1"),
    )
    assert result.error is None
    item = result.payload["items"][0]
    assert item["merchantName"] == "Pizza Shop"
    assert "notes" not in item
    assert "bank" not in item
    # category_id is not exposed; categoryName is.
    assert "categoryId" not in item
    assert item["categoryName"] == "Food"


def test_query_transactions_rejects_over_limit(db_session):
    _seed(db_session)
    result = execute(
        "query_transactions",
        {"limit": 100},  # max=50
        db_session,
        ChatContext("conv1"),
    )
    assert result.error is not None
    assert "invalid arguments" in result.error


def test_query_transactions_rejects_unknown_field(db_session):
    _seed(db_session)
    result = execute(
        "query_transactions",
        {"limit": 5, "extra": "x"},
        db_session,
        ChatContext("conv1"),
    )
    assert result.error is not None


def test_propose_set_category_budget_does_not_mutate(db_session):
    cat = _seed(db_session)
    result = execute(
        "propose_set_category_budget",
        {"categoryId": cat.id, "amountCents": 12345},
        db_session,
        ChatContext("conv1"),
    )
    assert result.error is None
    assert result.pending_action is not None
    assert result.payload["proposedCents"] == 12345

    db_session.refresh(cat)
    assert cat.monthly_budget == 10000  # unchanged


def test_top_merchants_returns_aggregates(db_session):
    cat = _seed(db_session)
    db_session.add_all(
        [
            Transaction(
                category_id=cat.id,
                bank="b",
                merchant_name="Pizza Shop",
                amount=-3000,
                type="expense",
                occurred_at=__import__("datetime").date(2026, 5, 7),
            ),
            Transaction(
                category_id=cat.id,
                bank="b",
                merchant_name="Burger Hut",
                amount=-1000,
                type="expense",
                occurred_at=__import__("datetime").date(2026, 5, 8),
            ),
        ]
    )
    db_session.commit()
    result = execute(
        "top_merchants",
        {"month": "2026-05", "limit": 3},
        db_session,
        ChatContext("conv1"),
    )
    assert result.error is None
    merchants = result.payload["merchants"]
    assert merchants[0]["merchantName"] == "Pizza Shop"
    assert merchants[0]["totalCents"] == 4500  # 1500 + 3000
    assert merchants[0]["count"] == 2


def test_unknown_tool_returns_error():
    result = execute("nope", {}, None, ChatContext("conv1"))  # type: ignore[arg-type]
    assert result.error == "unknown tool: nope"


def test_all_tools_have_jsonschema_object():
    for spec in REGISTRY.values():
        assert spec.parameters["type"] == "object"
        # Forbid extra props so the model can't smuggle fields past validation.
        assert spec.parameters.get("additionalProperties") is False


def test_to_llm_content_serializes_payload_and_error():
    from app.services.chat.tools import ToolResult

    ok = ToolResult.ok({"a": 1})
    assert json.loads(ok.to_llm_content()) == {"a": 1}
    err = ToolResult.fail("boom")
    assert json.loads(err.to_llm_content()) == {"error": "boom"}


def test_action_confirm_applies_then_expires(client, auth_headers, db_session):
    cat = _seed(db_session)

    # Manually create a pending action (skip the LLM loop here).
    from datetime import datetime, timedelta, timezone

    pa = PendingAction(
        id="actfresh",
        conversation_id=_make_conv(db_session),
        tool_name="propose_set_category_budget",
        args={"categoryId": cat.id, "amountCents": 50000},
        summary="Set Food budget to 500",
        status="pending",
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
    )
    db_session.add(pa)

    expired = PendingAction(
        id="actstale",
        conversation_id=pa.conversation_id,
        tool_name="propose_set_category_budget",
        args={"categoryId": cat.id, "amountCents": 99999},
        summary="stale",
        status="pending",
        expires_at=datetime.now(timezone.utc) - timedelta(minutes=1),
    )
    db_session.add(expired)
    db_session.commit()

    resp = client.post("/chat/actions/actfresh/confirm", headers=auth_headers)
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "confirmed"
    assert resp.json()["result"]["monthlyBudgetCents"] == 50000

    # Stale action returns 410.
    resp = client.post("/chat/actions/actstale/confirm", headers=auth_headers)
    assert resp.status_code == 410


def _make_conv(db) -> str:
    from app.db.models import Conversation

    conv = Conversation(id="cv_seed_" + "x" * 24)
    db.add(conv)
    db.flush()
    return conv.id


@pytest.fixture()
def auth_headers_db(db_session, client, auth_headers):
    """Convenience: many tests need both db_session and the API client."""
    return auth_headers
