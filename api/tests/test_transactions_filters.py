import pytest


@pytest.fixture()
def seeded(client, auth_headers):
    cats = {}
    for name, emoji in [("Shopping", "🛍️"), ("Food", "🍕"), ("Salary", "💰")]:
        cats[name] = client.post(
            "/categories",
            json={"name": name, "emoji": emoji, "color": "#000000", "monthlyBudget": 0},
            headers=auth_headers,
        ).json()

    rows = [
        ("Shopping", "Revolut", "Zara", -5000, "expense", "2026-05-02"),
        ("Shopping", "BBVA", "Zalando", -8000, "expense", "2026-05-04"),
        ("Food", "Revolut", "El Bulli", -12000, "expense", "2026-05-06"),
        ("Food", "Revolut", "Five Guys", -3500, "expense", "2026-05-12"),
        ("Salary", "BBVA", "ACME Corp", 250000, "income", "2026-05-25"),
        ("Shopping", "Revolut", "Apple Store", -150000, "expense", "2026-04-20"),
    ]
    for cat, bank, merchant, amount, type_, occurred in rows:
        resp = client.post(
            "/transactions",
            json={
                "categoryId": cats[cat]["id"],
                "bank": bank,
                "merchantName": merchant,
                "amount": amount,
                "type": type_,
                "occurredAt": occurred,
            },
            headers=auth_headers,
        )
        assert resp.status_code == 201, resp.text
    return cats


def _list(client, headers, **params):
    resp = client.get("/transactions", headers=headers, params=params)
    assert resp.status_code == 200, resp.text
    return resp.json()


def test_list_returns_camel_case(client, auth_headers, seeded):
    body = _list(client, auth_headers)
    assert "items" in body and "nextCursor" in body
    assert "merchantName" in body["items"][0]
    assert "occurredAt" in body["items"][0]


def test_filter_by_category(client, auth_headers, seeded):
    body = _list(client, auth_headers, categoryId=seeded["Food"]["id"])
    assert {x["merchantName"] for x in body["items"]} == {"El Bulli", "Five Guys"}


def test_filter_by_type(client, auth_headers, seeded):
    body = _list(client, auth_headers, type="income")
    assert len(body["items"]) == 1
    assert body["items"][0]["type"] == "income"


def test_filter_by_bank(client, auth_headers, seeded):
    body = _list(client, auth_headers, bank="BBVA")
    assert {x["merchantName"] for x in body["items"]} == {"Zalando", "ACME Corp"}


def test_search_merchant(client, auth_headers, seeded):
    body = _list(client, auth_headers, search="zal")
    assert len(body["items"]) == 1
    assert body["items"][0]["merchantName"] == "Zalando"


def test_date_range(client, auth_headers, seeded):
    body = _list(client, auth_headers, **{"from": "2026-05-01", "to": "2026-05-31"})
    merchants = {x["merchantName"] for x in body["items"]}
    assert "Apple Store" not in merchants
    assert merchants == {"Zara", "Zalando", "El Bulli", "Five Guys", "ACME Corp"}


def test_amount_range_filters_signed(client, auth_headers, seeded):
    # minAmount=0 picks income only; signed integers
    body = _list(client, auth_headers, minAmount=0)
    assert {x["merchantName"] for x in body["items"]} == {"ACME Corp"}

    # max -10000 → only expenses with amount <= -10000 (i.e. >= 10000 in absolute)
    body = _list(client, auth_headers, maxAmount=-10000)
    assert {x["merchantName"] for x in body["items"]} == {"El Bulli", "Apple Store"}


def test_combined_filters(client, auth_headers, seeded):
    body = _list(
        client,
        auth_headers,
        type="expense",
        bank="Revolut",
        **{"from": "2026-05-01", "to": "2026-05-31"},
    )
    assert {x["merchantName"] for x in body["items"]} == {"Zara", "El Bulli", "Five Guys"}


def test_invalid_date_range_returns_validation(client, auth_headers, seeded):
    resp = client.get(
        "/transactions",
        headers=auth_headers,
        params={"from": "2026-06-01", "to": "2026-05-01"},
    )
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "VALIDATION_ERROR"


def test_cursor_pagination(client, auth_headers, seeded):
    page1 = _list(client, auth_headers, limit=2)
    assert len(page1["items"]) == 2
    assert page1["nextCursor"] is not None

    page2 = _list(client, auth_headers, limit=2, cursor=page1["nextCursor"])
    assert len(page2["items"]) == 2

    page3 = _list(client, auth_headers, limit=2, cursor=page2["nextCursor"])
    assert len(page3["items"]) == 2
    assert page3["nextCursor"] is None

    seen_ids = (
        [x["id"] for x in page1["items"]]
        + [x["id"] for x in page2["items"]]
        + [x["id"] for x in page3["items"]]
    )
    assert len(set(seen_ids)) == 6


def test_limit_bounds(client, auth_headers, seeded):
    assert client.get(
        "/transactions", headers=auth_headers, params={"limit": 0}
    ).status_code == 422
    assert client.get(
        "/transactions", headers=auth_headers, params={"limit": 101}
    ).status_code == 422


def test_create_rejects_zero_amount(client, auth_headers):
    resp = client.post(
        "/transactions",
        json={
            "bank": "ACME",
            "merchantName": "Zero",
            "amount": 0,
            "type": "expense",
            "occurredAt": "2026-05-01",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 422


def test_create_rejects_sign_mismatch(client, auth_headers):
    resp = client.post(
        "/transactions",
        json={
            "bank": "ACME",
            "merchantName": "X",
            "amount": 100,
            "type": "expense",
            "occurredAt": "2026-05-01",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 422


def test_create_rejects_unknown_category(client, auth_headers):
    resp = client.post(
        "/transactions",
        json={
            "categoryId": 9999,
            "bank": "ACME",
            "merchantName": "X",
            "amount": -100,
            "type": "expense",
            "occurredAt": "2026-05-01",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "VALIDATION_ERROR"


def test_unauth_returns_401_with_envelope(client, seeded):
    resp = client.get("/transactions")
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "UNAUTHORIZED"
