# mr-ducky

Privacy-focused personal finance butler. Connect your bank, understand your money.

## Architecture

Three services, all containerised:

| Service | Stack | Where |
|---------|-------|-------|
| `app/` | Next.js 16 (App Router) | Docker on VPS, accessed via Cloudflare tunnel |
| `api/` | FastAPI + SQLAlchemy + Alembic | Docker on VPS |
| `landing/` | Next.js 16 (static) | Vercel |

Postgres 16 runs alongside `app` and `api` in Docker Compose. Cloudflare tunnel routes external traffic to `app:3000` — no open inbound ports on the VPS.

## Quickstart (local dev with Docker)

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
| `ADMIN_USER_EMAIL` | Login email for the single user |
| `ADMIN_USER_PASSWORD_HASH` | Bcrypt hash from step 1 |
| `CF_TUNNEL_TOKEN` | Cloudflare tunnel token — leave blank locally, cloudflared will just exit |

**3. Start everything**

```bash
docker compose up --build
```

Dashboard is available at **http://localhost:3000**.

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
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL=http://localhost:8000
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

## Running tests

```bash
cd api
uv run pytest
```

## Repo layout

```
mr-ducky/
├── app/          # Next.js dashboard (Docker)
├── landing/      # Next.js marketing page (Vercel)
├── api/          # FastAPI service (Docker)
├── infra/        # Docker Compose, cloud-init, deploy notes
└── CLAUDE.md     # Conventions for AI-assisted development
```

## Deploy (VPS)

See [`infra/README.md`](infra/README.md) for step-by-step Hetzner + Cloudflare tunnel setup.

## Tech stack

- **Next.js 16** — App Router, Tailwind CSS, dark theme
- **FastAPI** — async-ready, Pydantic v2 validation
- **SQLAlchemy 2 + Alembic** — typed ORM, schema migrations
- **uv** — Python dependency management
- **pnpm workspaces** — monorepo for `app/` and `landing/`
- **Postgres 16** — primary datastore
- **Cloudflare tunnel** — zero-trust ingress, no open ports
