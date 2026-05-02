def _create(client, headers, **overrides):
    payload = {
        "name": "Netflix",
        "amount": 1399,
        "currency": "EUR",
        "billingCycle": "monthly",
        "nextChargeDate": "2026-10-21",
    }
    payload.update(overrides)
    resp = client.post("/subscriptions", json=payload, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_create_and_list(client, auth_headers):
    _create(client, auth_headers)
    body = client.get("/subscriptions", headers=auth_headers).json()
    assert len(body["items"]) == 1
    assert body["totalMonthlyCost"] == 1399


def test_total_monthly_cost_normalizes_cycles(client, auth_headers):
    _create(client, auth_headers, name="Netflix", amount=1399, billingCycle="monthly")
    _create(
        client,
        auth_headers,
        name="iCloud",
        amount=12000,
        billingCycle="yearly",
        nextChargeDate="2026-12-01",
    )
    _create(
        client,
        auth_headers,
        name="Newspaper",
        amount=300,
        billingCycle="weekly",
        nextChargeDate="2026-05-08",
    )
    body = client.get("/subscriptions", headers=auth_headers).json()
    # 1399 + 12000/12 + 300*52/12  = 1399 + 1000 + 1300 = 3699
    assert body["totalMonthlyCost"] == 3699


def test_inactive_excluded_from_total(client, auth_headers):
    sub = _create(client, auth_headers, amount=2000, billingCycle="monthly")
    cancel = client.post(f"/subscriptions/{sub['id']}/cancel", headers=auth_headers)
    assert cancel.status_code == 200
    assert cancel.json()["isActive"] is False
    body = client.get("/subscriptions", headers=auth_headers).json()
    assert body["totalMonthlyCost"] == 0


def test_patch_subscription(client, auth_headers):
    sub = _create(client, auth_headers)
    resp = client.patch(
        f"/subscriptions/{sub['id']}",
        json={"amount": 1599},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["amount"] == 1599


def test_delete_subscription(client, auth_headers):
    sub = _create(client, auth_headers)
    assert client.delete(
        f"/subscriptions/{sub['id']}", headers=auth_headers
    ).status_code == 204
    assert client.patch(
        f"/subscriptions/{sub['id']}", json={"amount": 1}, headers=auth_headers
    ).status_code == 404


def test_create_rejects_invalid_cycle(client, auth_headers):
    resp = client.post(
        "/subscriptions",
        json={
            "name": "X",
            "amount": 100,
            "billingCycle": "daily",
            "nextChargeDate": "2026-05-01",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 422
