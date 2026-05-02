def test_get_returns_zero_when_unset(client, auth_headers):
    resp = client.get("/budgets/2026-05", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == {"month": "2026-05", "totalBudget": 0}


def test_put_creates_then_updates(client, auth_headers):
    create = client.put(
        "/budgets/2026-05",
        json={"totalBudget": 400000},
        headers=auth_headers,
    )
    assert create.status_code == 200
    assert create.json() == {"month": "2026-05", "totalBudget": 400000}

    update = client.put(
        "/budgets/2026-05",
        json={"totalBudget": 450000},
        headers=auth_headers,
    )
    assert update.status_code == 200
    assert update.json()["totalBudget"] == 450000


def test_invalid_month_returns_422(client, auth_headers):
    resp = client.get("/budgets/2026-13", headers=auth_headers)
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "VALIDATION_ERROR"


def test_negative_budget_rejected(client, auth_headers):
    resp = client.put(
        "/budgets/2026-05",
        json={"totalBudget": -1},
        headers=auth_headers,
    )
    assert resp.status_code == 422
