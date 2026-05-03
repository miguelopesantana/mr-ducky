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

Always run `pnpm typecheck` (and `uv run ruff check .` on api) before declaring a JS / Python change done. Run from the workspace root that owns the change.

## Code practices

These apply across all workspaces. They override generic instincts.

**Components-first (frontend).** Pages compose small, named components — they don't define them inline. If a page (`.tsx`) goes past ~120 lines or contains more than two sibling sections, extract each section into its own file under `components/<feature>/`. More components = more dynamic, reusable, easy-to-understand code. Concretely:
- Pages should look like a list of `<MonthlyBudgetCard />`, `<WeeklySpendingCard />`, etc., not a 500-line JSX tree.
- Co-locate by feature: `components/dashboard/`, `components/transactions/`, `components/settings/`.
- A subcomponent only needs *one caller* to justify extraction — clarity ranks above DRY here.
- Keep helpers (`niceMax`, chart constants) inside the file that uses them. Don't promote to `lib/` until a second caller appears.

**Shared design primitives.** Tokens (`T`), `cardStyle`, and animation helpers (`fadeIn`, `barGrowH`, `barGrowV`, `budgetColor`) live in `app/lib/theme.ts`. Never re-declare a `const T = { ... }` inside a page or component — import from `@/lib/theme`. When you touch a file that still has a local `T`, replace it with the import.

**Comments.** Default to none. Only write a comment when *why* is non-obvious (a constraint, an invariant, a workaround). Never write a comment that re-states what the code already shows.

**Error handling.** Validate at boundaries (HTTP, user input, third-party APIs). Don't add try/catch around code that can't fail. In the app, `lib/api-client.ts` returns a discriminated union — handle `ok: false`, don't wrap calls in try/catch.

**No premature abstractions.** Three similar lines is better than a wrong abstraction. Wait for the third caller before generalizing.

**TypeScript.** Strict types, no `any`. Prefer `interface` for public component props (extensible) and `type` for unions / mapped types.

**File naming.** kebab-case for files (`monthly-budget-card.tsx`), PascalCase for the exported React component, camelCase for everything else.

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

**Data fetchers** — `lib/finance-data.ts` exposes typed `getDashboardData`, `getTransactionsData` etc. that wrap the api-client and reshape the response. Pages call these once and pass plain data into components.

**Styling** — Tailwind v4 + CSS variables (`var(--color-brand)`, `oklch(...)` literals). Mobile-first; pages assume a `max-w-[430px]` mobile shell. Animations are CSS keyframes defined in `app/globals.css` (`mr-fade-in-up`, `mr-bar-grow-h`, `mr-bar-grow-v`); apply via the helpers in `lib/theme.ts`.

**Component layout** —
- `components/ui/` — shadcn primitives (button, card, progress, badge, separator). Don't edit unless adding a new shadcn primitive.
- `components/layout/` — page chrome (header, bottom-nav, page-header, page-transition). Shared across all pages.
- `components/dashboard/`, `components/transactions/`, `components/settings/`, `components/chat/` — feature-scoped components. The dashboard split (`monthly-budget-card`, `weekly-spending-card`, `category-card`, `subscriptions-card`, plus shared `section-header`, `progress-bar`, `action-link`) is the reference pattern — mirror it when adding new pages.

**Reusable dashboard primitives** — when you see a button-with-chevron pattern, a labeled progress bar, or a section heading with a "see all" link, reuse `ActionLink`, `BudgetProgressBar`, `SectionHeader` from `components/dashboard/` rather than re-implementing.

## Negotiator conventions (`services/negotiator/`)

Self-contained voice agent. Has its own README — read it before touching audio, VAD, or the Twilio bridge.

**Two transports, two VAD configs — keep them split.** Browser `/demo` (PCM 24 kHz over WS) uses `server_vad`; Twilio Media Streams (μ-law 8 kHz) uses `semantic_vad`. The split lives in `app/realtime.py::_build_turn_detection`. We've collapsed it twice now and each time the phone path regresses to "agent replies to its own echo". The bridge's per-response audio-protection window in `app/main.py::_phone_bridge` (`POST_AUDIO_GRACE_S`) covers the in-flight response only — `semantic_vad` is what stops the model from waking on residual line echo after the grace expires. Both are needed; don't remove either. Full table + tuning notes in `services/negotiator/README.md` under "Audio & VAD — don't regress this".

## Skills / AI empowerment

These are the skills worth using on this repo. Invoke with `/<skill>`.

- **`/simplify`** — after any non-trivial change, run this to get a review for reuse, dead code, and clarity. Especially valuable when extracting components, since it catches duplicated styles and props that should be shared.
- **`/review`** — review a pull request or current branch. Use before pushing a meaningful refactor.
- **`/security-review`** — run on changes that touch auth, the api-client, JWT handling, or anything cookie-related.
- **`/init`** — only when adding a new top-level workspace; don't run on the existing tree.
- **`/loop <interval> <prompt>`** — recurring background work (e.g. polling a long build). Skip for one-offs.
- **`/schedule`** — schedule a remote agent for a future cleanup task. Useful when leaving a TODO behind ("remove flag X in 2 weeks").

Helpful agents (via the Agent tool, not `/`):

- `Explore` — broad codebase searches across more than 3 queries. Faster than serial `grep` for "find every place that does X".
- `Plan` — design step before non-trivial multi-file work. Pair with this CLAUDE.md so the plan respects the components-first rule.
- `claude-code-guide` — questions about Claude Code itself (hooks, settings, MCP servers).

Workflow defaults that make Claude useful here:

1. **Before editing a page**, list the components folder for that feature (`ls app/components/<feature>/`) so you reuse what exists rather than re-creating.
2. **Before declaring done**, run `pnpm typecheck` from `app/` (and `uv run pytest` / `uv run ruff check .` from `api/`).
3. **After extracting components**, run `/simplify` on the diff.
4. **When a page exceeds ~120 lines**, treat that as a hard signal to extract — don't add another section inline.

## Deployment

Single Hetzner VPS, Docker Compose, Cloudflare named tunnel for public exposure (no inbound ports). `landing/` deploys to Vercel separately. Backups, monitoring, and auto-updates are explicitly out of scope.
