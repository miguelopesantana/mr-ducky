import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Configure settings BEFORE the app imports them.
from app.settings import settings  # noqa: E402

settings.admin_pin_hash = ""  # set per fixture
settings.jwt_secret = "test-secret"
settings.currency = "EUR"
settings.owner_name = "Tester"

from app.core.security import hash_pin  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.deps import get_db  # noqa: E402
from app.main import app  # noqa: E402

TEST_PIN = "1234"


@pytest.fixture()
def engine():
    eng = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(eng)
    try:
        yield eng
    finally:
        Base.metadata.drop_all(eng)
        eng.dispose()


@pytest.fixture()
def db_session(engine):
    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client(engine):
    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    def _override_get_db():
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = _override_get_db
    settings.admin_pin_hash = hash_pin(TEST_PIN)
    try:
        with TestClient(app) as c:
            yield c
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.fixture()
def auth_token(client) -> str:
    resp = client.post("/auth/login", json={"pin": TEST_PIN})
    assert resp.status_code == 200, resp.text
    return resp.json()["token"]


@pytest.fixture()
def auth_headers(auth_token) -> dict[str, str]:
    return {"Authorization": f"Bearer {auth_token}"}
