# mr-ducky — Phase 0 repo scaffold plan

## Context

Greenfield repo for **mr-ducky**, a privacy-focused personal finance butler being built for a hackathon. The repo currently contains only `README.md`. We want to land a complete repo skeleton (Phase 0) so subsequent work can fill in functionality without churn on layout/tooling.

Constraints (confirmed with user):

- **Hackathon scope** — favour simplicity over future-proofing.
- **Single Hetzner VPS, single user** — no per-tenant provisioning, no admin DB, no Resend, no Cloudflare DNS API, no billing.
- **URLs:** default Vercel URL for `landing/`; cloudflared-issued `*.trycloudflare.com` (or named tunnel) for the VPS-hosted app.
- **Mobile responsive web only** — no native mobile.
- **No backups/monitoring/update tooling** in this scaffold (the original "Phase 5" was explicitly cut).

Three runtime surfaces:

1. `landing/` — Next.js marketing page on Vercel (static-ish; no provisioning route).
2. `app/` — Next.js dashboard, runs in Docker on the VPS, talks only to `api`.
3. `api/` — FastAPI service, runs in Docker on the VPS, owns Postgres, GoCardless integration, and Claude calls.

## Final repo layout

```
mr-ducky/
├── landing/                    # Next.js 15 (App Router) → Vercel
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx            # marketing landing
│   │   └── globals.css
│   ├── public/
│   ├── package.json
│   ├── next.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── postcss.config.mjs
│   └── .env.example            # (empty for now — no provisioning secrets)
│
├── app/                        # Next.js 15 → Docker on VPS
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx            # dashboard shell
│   │   ├── login/page.tsx
│   │   └── globals.css
│   ├── lib/
│   │   └── api-client.ts       # base URL = process.env.NEXT_PUBLIC_API_URL (http://api:8000 in compose)
│   ├── public/
│   ├── Dockerfile              # multi-stage; `next build` → standalone output
│   ├── package.json
│   ├── next.config.ts          # output: 'standalone'
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── postcss.config.mjs
│   └── .env.example            # NEXT_PUBLIC_API_URL, AUTH_SECRET
│
├── api/                        # FastAPI → Docker on VPS
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py             # FastAPI() + CORS (allow app origin only)
│   │   ├── settings.py         # pydantic-settings
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py         # single-user login → JWT
│   │   │   ├── gocardless.py   # placeholder router
│   │   │   ├── transactions.py # placeholder router
│   │   │   └── chat.py         # placeholder router (Claude)
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── gocardless.py   # placeholder
│   │   │   └── claude.py       # placeholder; will use anthropic SDK + prompt caching
│   │   └── db/
│   │       ├── __init__.py
│   │       ├── base.py         # SQLAlchemy engine/session
│   │       ├── models.py       # User, Account, Transaction, ChatMessage
│   │       └── migrations/     # Alembic env + versions/
│   ├── tests/
│   │   └── test_health.py
│   ├── Dockerfile              # python:3.12-slim + uv
│   ├── pyproject.toml          # uv-managed; deps: fastapi, uvicorn, sqlalchemy, alembic,
│   │                           # pydantic-settings, psycopg[binary], httpx, anthropic, python-jose, passlib
│   ├── uv.lock                 # generated
│   └── .env.example            # DATABASE_URL, JWT_SECRET, ANTHROPIC_API_KEY,
│                               # GOCARDLESS_SECRET_ID, GOCARDLESS_SECRET_KEY,
│                               # ADMIN_USER_EMAIL, ADMIN_USER_PASSWORD_HASH
│
├── infra/
│   ├── docker-compose.yml      # app, api, postgres, cloudflared
│   ├── cloud-init.yaml         # one-shot VPS bootstrap (install docker, clone repo, compose up)
│   ├── .env.example            # POSTGRES_PASSWORD, CF_TUNNEL_TOKEN, + everything api needs
│   └── README.md               # how to provision the VPS by hand
│
├── .github/workflows/
│   └── ci.yml                  # lint + typecheck + test for landing, app, api
│
├── .gitignore
├── .editorconfig
├── pnpm-workspace.yaml         # workspaces: landing, app
├── package.json                # root: scripts to run lint/typecheck across JS workspaces
├── README.md                   # already exists — expand with quickstart
└── CLAUDE.md                   # repo conventions for future Claude sessions
```

### Why these tooling choices

- **pnpm workspaces** for `landing/` and `app/` — cheap to set up, makes shared scripts and future `packages/ui` easy.
- **uv** for Python — fast, single-tool, plays well with Docker layer caching.
- **Next.js 15 App Router + Tailwind + shadcn/ui** for both JS apps — same stack so context-switching is minimal.
- **Postgres 16** via the official image; **`pgvector`** *not* added now (add only if Claude RAG needs it).
- **cloudflared** in compose with a named tunnel — token comes from `.env`; no inbound ports on the VPS.
- **Single-user auth**: bcrypt password hash baked into `.env`, exchanged for a JWT by `/auth/login`. No magic links / OAuth for v1.

### `infra/docker-compose.yml` services (sketch)

```yaml
services:
  postgres:
    image: postgres:16-alpine
    env: POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
    volumes: pgdata:/var/lib/postgresql/data
    healthcheck: pg_isready

  api:
    build: ../api
    env_file: .env
    depends_on: postgres (healthy)
    # no ports — only reachable from app via compose network

  app:
    build: ../app
    env: NEXT_PUBLIC_API_URL=http://api:8000
    depends_on: api

  cloudflared:
    image: cloudflare/cloudflared:latest
    command: tunnel --no-autoupdate run --token ${CF_TUNNEL_TOKEN}
    # tunnel routes <name>.<your>.cloudflareaccess.com → app:3000
```

## Phased delivery (post-scaffold)

- **Phase 0 — this plan:** repo scaffold, empty-but-runnable services, CI green.
- **Phase 1:** local dev via `docker compose up` — login works against single hardcoded user, app shell renders, api `/health` returns OK, Alembic baseline migration creates tables.
- **Phase 2:** GoCardless sandbox — bank link flow, requisition callback, transaction sync into Postgres, list view in app.
- **Phase 3:** Claude chat over the user's transactions, with prompt caching on the system prompt + transaction context.
- **Phase 4:** Manual Hetzner deploy — provision VPS, run `cloud-init.yaml`, configure named tunnel in Cloudflare dashboard, point `app/` at the tunnel hostname, demo end-to-end.

(Phase 5 — backups, monitoring, auto-updates — explicitly out of scope.)

## Files to be created in Phase 0 (scaffold-only PR)

Create directories and config files listed above. Stub all route/service modules so each app builds and the test suite has at least one passing test:

- `landing/app/page.tsx` — single hero section.
- `app/app/page.tsx` — "logged out" placeholder; `app/app/login/page.tsx` — form posting to `/auth/login`.
- `api/app/main.py` — `GET /health → {"status": "ok"}`; routers mounted but empty.
- `api/tests/test_health.py` — asserts 200 on `/health`.
- `infra/docker-compose.yml` — bring up all four services; `infra/cloud-init.yaml` — sketch only, real values filled at deploy time.
- `.github/workflows/ci.yml` — matrix job: pnpm install + lint/typecheck for `landing` and `app`; uv sync + ruff + pytest for `api`.
- `CLAUDE.md` — short conventions doc (commands, package managers, where things live).

No business logic in this phase. Everything compiles, lints, and tests green; nothing yet talks to GoCardless, Claude, or Cloudflare.

## Verification

End-to-end checks once Phase 0 lands:

1. `pnpm install && pnpm -r build` succeeds at the root.
2. `cd api && uv sync && uv run pytest` passes (just the health test).
3. `cd infra && docker compose up --build` brings up all four containers; `cloudflared` will fail without a real token (expected — document that in `infra/README.md`).
4. `curl http://localhost:8000/health` → `{"status":"ok"}` (after temporarily exposing api port for local check, or `docker compose exec app wget -qO- http://api:8000/health`).
5. CI on the PR is green.

## Open items not blocking Phase 0

- Exact Cloudflare tunnel name — pick at deploy time (Phase 4).
- Whether to add `pgvector` for Claude RAG — defer until Phase 3 shows it's needed.
