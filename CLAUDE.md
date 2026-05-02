# mr-ducky

Privacy-focused personal finance butler. Single-user, single-VPS deployment.

## Repo layout

```
api/                  FastAPI + SQLAlchemy + Alembic (Docker)
app/                  Next.js 16 dashboard (Docker)
landing/              Next.js 16 marketing page (Vercel)
services/negotiator/  Self-contained voice agent (FastAPI + OpenAI Realtime)
infra/                docker-compose, cloud-init, env templates
```

`pnpm-workspace.yaml` only includes `landing` and `app`. `services/negotiator/` is intentionally self-contained — its own venv, requirements.txt, no shared deps.

## Git workflow

Always commit and push directly to `main`. Do not create feature branches or pull requests.

## Commands

```bash
# Bring up the full stack
cd infra && docker compose up --build

# API (Python 3.12, uv)
cd api && uv sync && uv run uvicorn app.main:app --reload
cd api && uv run pytest
cd api && uv run ruff check .

# App / landing (pnpm)
cd app && pnpm dev          # → :3000
cd landing && pnpm dev      # → :3001
pnpm -r build               # build all JS workspaces
pnpm -r typecheck

# Negotiator (pip, separate venv)
cd services/negotiator && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt && uvicorn app.main:app --reload
```

## API conventions (`api/`)

**Layout** — `app/core/` (cross-cutting: errors, security, pagination, routing), `app/db/` (engine, models), `app/routers/` (HTTP), `app/services/` (business logic), `app/schemas/` (Pydantic).

**Errors** — never raise raw `HTTPException`. Use `AppError` from `app.core.errors` or the helpers (`not_found`, `conflict`, `unauthorized`, `validation`). All responses go out as `{"error": {"code", "message", "details?"}}` via the registered exception handlers in `main.py`.

**Auth** — protect routers by attaching the dep at the router level: `APIRouter(dependencies=[Depends(require_auth)], route_class=CamelRoute)`. Single-user; PIN → bcrypt → JWT. `/auth/login` and `/health` are the only unauth endpoints.

**Schemas** — extend `StrictModel` (request bodies — `extra="forbid"`) or `ORMModel` (responses — `from_attributes=True`). Both use `to_camel` alias generator. Routers use `route_class=CamelRoute` so responses serialize with camelCase aliases. Query params that need camelCase use `Query(alias="categoryId")`.

**Money** — stored as `BigInteger` cents. Expenses are negative, income positive; the sign invariant is enforced in `TransactionCreate`/`TransactionUpdate` validators. Don't change this without updating both schema validators and `update_transaction`'s post-merge check.

**DB** — SQLAlchemy 2.0 typed `Mapped[...]` / `mapped_column`. Sessions via `Depends(get_db)` from `app.deps`. Migrations via Alembic in `app/db/migrations/`.

**Pagination** — opaque base64 cursors (`occurred_at|id`) via `app.core.pagination.encode_cursor` / `decode_cursor`. Don't expose offsets.

**Tests** — SQLite in-memory with `StaticPool`, fixtures in `tests/conftest.py` (`client`, `auth_headers`, `db_session`). Override `get_db` via `app.dependency_overrides`. Settings are mutated directly on the singleton before app import.

## App conventions (`app/`)

**Stack** — Next.js 16 App Router, React 19, Tailwind v4, shadcn/ui in `components/ui/`, lucide-react for icons. Build target is `standalone` (Dockerfile expects `node .next/standalone/server.js`).

**Routing** — auth-gated pages live under the `(app)` route group; `/login` is public. `proxy.ts` (Next middleware) redirects unauthenticated requests to `/login` based on the `auth_token` cookie.

**API client** — `lib/api-client.ts` returns a discriminated union: `{ok: true, data, status}` or `{ok: false, error, status}`. Never throws on HTTP errors — always check `.ok`. Use `authedClient(token)` for authenticated calls.

**Styling** — Tailwind v4 + CSS variables (`var(--color-brand)`, `oklch(...)` literals). Mobile-first; pages assume a `max-w-[430px]` mobile shell.

## Deployment

Single Hetzner VPS, Docker Compose, Cloudflare named tunnel for public exposure (no inbound ports). `landing/` deploys to Vercel separately. Backups, monitoring, and auto-updates are explicitly out of scope.
