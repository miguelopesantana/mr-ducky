# infra

Docker Compose setup for running mr-ducky locally.

## Setup

```bash
cp .env.example .env
# fill in POSTGRES_PASSWORD, JWT_SECRET, ADMIN_USER_EMAIL, ADMIN_USER_PASSWORD_HASH

docker compose up --build
```

- Dashboard: http://localhost:3000
- API health: `docker compose exec app wget -qO- http://api:8000/health`

## Generate a password hash

```bash
cd ../api
uv run python -c "from passlib.context import CryptContext; print(CryptContext(['bcrypt']).hash('yourpassword'))"
```

Paste the output into `ADMIN_USER_PASSWORD_HASH` in `.env`.
