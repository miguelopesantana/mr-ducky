import pytest


@pytest.fixture()
def dashboard_seed(client, auth_headers):
    """May 2026 — ISO weeks 18..22."""
    cats = {}
    for name, emoji, budget in [
        ("Shopping", "🛍️", 150000),
        ("Food", "🍕", 100000),
        ("Salary", "💰", 0),
    ]:
        cats[name] = client.post(
            "/categories",
            json={
                "name": name,
                "emoji": emoji,
                "color": "#000000",
                "monthlyBudget": budget,
            },
            headers=auth_headers,
        ).json()

    client.put(
        "/budgets/2026-05",
        json={"totalBudget": 400000},
        headers=auth_headers,
    )

    rows = [
        ("Shopping", "Zara", -5000, "expense", "2026-05-01"),    # iso wk 18
        ("Shopping", "Zalando", -8000, "expense", "2026-05-04"),  # iso wk 19
        ("Food", "El Bulli", -12000, "expense", "2026-05-06"),    # iso wk 19
        ("Food", "Five Guys", -3500, "expense", "2026-05-12"),    # iso wk 20
        ("Salary", "ACME", 250000, "income", "2026-05-25"),       # ignored
        ("Shopping", "Apple", -150000, "expense", "2026-04-20"),  # ignored (April)
        (None, "Cash", -2000, "expense", "2026-05-03"),           # uncategorized
    ]
    for cat, merchant, amount, type_, occurred in rows:
        client.post(
            "/transactions",
            json={
                "categoryId": cats[cat]["id"] if cat else None,
                "bank": "ACME",
                "merchantName": merchant,
                "amount": amount,
                "type": type_,
                "occurredAt": occurred,
            },
            headers=auth_headers,
        )

    client.post(
        "/subscriptions",
        json={
            "name": "Netflix",
            "amount": 1399,
            "billingCycle": "monthly",
            "nextChargeDate": "2026-05-21",
        },
        headers=auth_headers,
    )
    client.post(
        "/subscriptions",
        json={
            "name": "iCloud",
            "amount": 12000,
            "billingCycle": "yearly",
            "nextChargeDate": "2026-12-01",
        },
        headers=auth_headers,
    )
    return cats


def test_dashboard_aggregation(client, auth_headers, dashboard_seed):
    resp = client.get("/dashboard", headers=auth_headers, params={"month": "2026-05"})
    assert resp.status_code == 200, resp.text
    body = resp.json()

    assert body["month"] == "2026-05"

    # Expenses in May: 5000 + 8000 + 12000 + 3500 + 2000 = 30500
    monthly = body["monthlySpending"]
    assert monthly == {
        "spent": 30500,
        "budget": 400000,
        "currency": "EUR",
        "deltaVsBudget": 30500 - 400000,
    }

    # ISO weeks of May 2026 are 18, 19, 20, 21, 22 → numbered 1..5
    weekly = body["weeklySpending"]
    assert [w["weekNumber"] for w in weekly] == [1, 2, 3, 4, 5]
    by_week = {w["weekNumber"]: w["spent"] for w in weekly}
    # Week 1 (iso 18, Apr 27 – May 3): May 1 (Zara 5000) + May 3 (Cash 2000) = 7000
    assert by_week[1] == 7000
    # Week 2 (iso 19, May 4 – May 10): Zalando 8000 + El Bulli 12000 = 20000
    assert by_week[2] == 20000
    # Week 3 (iso 20, May 11 – May 17): Five Guys 3500
    assert by_week[3] == 3500
    assert by_week[4] == 0
    assert by_week[5] == 0

    # Categories
    cats = {c["name"]: c for c in body["categories"]}
    assert cats["Shopping"]["spent"] == 13000
    assert cats["Shopping"]["transactionCount"] == 2
    assert cats["Shopping"]["budget"] == 150000
    assert cats["Food"]["spent"] == 15500
    assert cats["Food"]["transactionCount"] == 2
    assert cats["Salary"]["spent"] == 0  # income ignored

    # Subscriptions: 1399 monthly + 12000/12 = 2399
    subs = body["subscriptions"]
    assert subs["totalMonthly"] == 2399
    assert {s["name"] for s in subs["items"]} == {"Netflix", "iCloud"}
    assert "billingCycle" in subs["items"][0]
    assert "nextChargeDate" in subs["items"][0]


def test_dashboard_invalid_month(client, auth_headers):
    resp = client.get("/dashboard", headers=auth_headers, params={"month": "not-a-month"})
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "VALIDATION_ERROR"


def test_dashboard_requires_auth(client):
    assert client.get("/dashboard", params={"month": "2026-05"}).status_code == 401


def test_dashboard_with_no_data(client, auth_headers):
    resp = client.get("/dashboard", headers=auth_headers, params={"month": "2026-05"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["monthlySpending"]["spent"] == 0
    assert body["monthlySpending"]["budget"] == 0
    assert all(w["spent"] == 0 for w in body["weeklySpending"])
    assert body["subscriptions"]["totalMonthly"] == 0
