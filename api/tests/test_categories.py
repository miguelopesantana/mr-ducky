def test_create_and_get_category(client, auth_headers):
    resp = client.post(
        "/categories",
        json={
            "name": "Shopping",
            "emoji": "🛍️",
            "color": "#FF8800",
            "monthlyBudget": 150000,
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.text
    cat = resp.json()
    assert cat["name"] == "Shopping"
    assert cat["emoji"] == "🛍️"
    assert cat["monthlyBudget"] == 150000

    fetched = client.get(f"/categories/{cat['id']}", headers=auth_headers)
    assert fetched.status_code == 200
    assert fetched.json()["id"] == cat["id"]


def test_create_rejects_unknown_field(client, auth_headers):
    resp = client.post(
        "/categories",
        json={
            "name": "X",
            "emoji": "X",
            "color": "#000000",
            "monthlyBudget": 0,
            "rogue": "no",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "VALIDATION_ERROR"


def test_create_rejects_invalid_color(client, auth_headers):
    resp = client.post(
        "/categories",
        json={"name": "X", "emoji": "X", "color": "red", "monthlyBudget": 0},
        headers=auth_headers,
    )
    assert resp.status_code == 422


def test_duplicate_name_returns_409(client, auth_headers):
    payload = {"name": "Food", "emoji": "🍕", "color": "#00AAFF", "monthlyBudget": 0}
    assert client.post("/categories", json=payload, headers=auth_headers).status_code == 201
    dup = client.post("/categories", json=payload, headers=auth_headers)
    assert dup.status_code == 409
    assert dup.json()["error"]["code"] == "CONFLICT"


def test_patch_and_delete_category(client, auth_headers):
    create = client.post(
        "/categories",
        json={"name": "Bills", "emoji": "💡", "color": "#112233", "monthlyBudget": 50000},
        headers=auth_headers,
    )
    cid = create.json()["id"]

    patch = client.patch(
        f"/categories/{cid}",
        json={"monthlyBudget": 60000},
        headers=auth_headers,
    )
    assert patch.status_code == 200
    assert patch.json()["monthlyBudget"] == 60000

    delete = client.delete(f"/categories/{cid}", headers=auth_headers)
    assert delete.status_code == 204
    missing = client.get(f"/categories/{cid}", headers=auth_headers)
    assert missing.status_code == 404


def test_delete_detaches_transactions(client, auth_headers):
    cat = client.post(
        "/categories",
        json={"name": "Travel", "emoji": "✈️", "color": "#0033AA", "monthlyBudget": 0},
        headers=auth_headers,
    ).json()
    txn = client.post(
        "/transactions",
        json={
            "categoryId": cat["id"],
            "bank": "ACME",
            "merchantName": "Hotel",
            "amount": -10000,
            "type": "expense",
            "occurredAt": "2026-05-15",
        },
        headers=auth_headers,
    ).json()

    assert client.delete(
        f"/categories/{cat['id']}", headers=auth_headers
    ).status_code == 204

    fetched = client.get(f"/transactions/{txn['id']}", headers=auth_headers)
    assert fetched.status_code == 200
    assert fetched.json()["categoryId"] is None


def test_list_includes_current_month_stats(client, auth_headers, monkeypatch):
    from datetime import datetime, timezone

    from app.services import months as months_module

    fixed = datetime(2026, 5, 10, tzinfo=timezone.utc)

    class _FakeDT:
        @classmethod
        def now(cls, tz=None):  # noqa: ARG003
            return fixed

    monkeypatch.setattr(months_module, "datetime", _FakeDT)

    cat = client.post(
        "/categories",
        json={"name": "Coffee", "emoji": "☕", "color": "#553311", "monthlyBudget": 5000},
        headers=auth_headers,
    ).json()
    for day, amount in [("2026-05-01", -350), ("2026-05-15", -420), ("2026-04-30", -999)]:
        client.post(
            "/transactions",
            json={
                "categoryId": cat["id"],
                "bank": "ACME",
                "merchantName": "Cafe",
                "amount": amount,
                "type": "expense",
                "occurredAt": day,
            },
            headers=auth_headers,
        )

    listing = client.get("/categories", headers=auth_headers).json()
    coffee = next(c for c in listing if c["id"] == cat["id"])
    assert coffee["spent"] == 770
    assert coffee["transactionCount"] == 2
