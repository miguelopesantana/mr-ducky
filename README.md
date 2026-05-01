# mr-ducky

Privacy-focused personal finance butler. Connect your bank, understand your money.

## Architecture

| Service | Stack | Runs |
|---------|-------|------|
| `app/` | Next.js 16 (App Router) | Docker |
| `api/` | FastAPI + SQLAlchemy + Alembic | Docker |
| `landing/` | Next.js 16 (static) | Vercel |

Postgres 16 runs alongside `app` and `api` in Docker Compose. The dashboard is exposed at `localhost:3000`.

## Quickstart

**1. Generate a bcrypt password hash**

```bash
cd api
uv sync
uv run python -c "from passlib.context import CryptContext; print(CryptContext(['bcrypt']).hash('yourpassword'))"
```

**2. Configure the environment**

```bash
cd infra
cp .env.example .env
```

Edit `infra/.env`:

| Variable | Description |
|----------|-------------|
| `POSTGRES_PASSWORD` | Postgres password (any string) |
| `JWT_SECRET` | Secret used to sign JWTs (any long random string) |
| `ADMIN_USER_EMAIL` | Login email |
| `ADMIN_USER_PASSWORD_HASH` | Bcrypt hash from step 1 |

**3. Start everything**

```bash
docker compose up --build
# Dashboard → http://localhost:3000
```

## Running services individually

Useful when iterating on a single service without rebuilding images.

**API**

```bash
cd api
uv sync
cp .env.example .env   # set DATABASE_URL to a local Postgres instance
uv run uvicorn app.main:app --reload
# → http://localhost:8000
```

**App (dashboard)**

```bash
cd app
pnpm install
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:8000
pnpm dev
# → http://localhost:3000
```

**Landing**

```bash
cd landing
pnpm install
pnpm dev
# → http://localhost:3001
```

## Tests

```bash
cd api && uv run pytest
```

## Repo layout

```
mr-ducky/
├── app/       # Next.js dashboard
├── landing/   # Next.js marketing page
├── api/       # FastAPI service
├── infra/     # Docker Compose + env config
└── CLAUDE.md  # Conventions for AI-assisted development
```

## Tech stack

- **Next.js 16** — App Router, Tailwind CSS, dark theme
- **FastAPI** — Pydantic v2 validation
- **SQLAlchemy 2 + Alembic** — typed ORM, schema migrations
- **uv** — Python dependency management
- **pnpm workspaces** — monorepo for `app/` and `landing/`
- **Postgres 16** — primary datastore
