def test_login_with_correct_pin(client):
    resp = client.post("/auth/login", json={"pin": "1234"})
    assert resp.status_code == 200
    body = resp.json()
    assert "token" in body and body["token"]
    assert body["user"] == {"name": "Tester", "currency": "EUR"}


def test_login_with_wrong_pin(client):
    resp = client.post("/auth/login", json={"pin": "9999"})
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "UNAUTHORIZED"


def test_login_rejects_unknown_fields(client):
    resp = client.post("/auth/login", json={"pin": "1234", "extra": "x"})
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "VALIDATION_ERROR"


def test_me_requires_auth(client):
    assert client.get("/auth/me").status_code == 401


def test_me_with_token(client, auth_headers):
    resp = client.get("/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == {"name": "Tester", "currency": "EUR"}


def test_logout_returns_204(client, auth_headers):
    resp = client.post("/auth/logout", headers=auth_headers)
    assert resp.status_code == 204
