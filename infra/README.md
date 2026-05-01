# infra

Docker Compose setup for the VPS (app + api + postgres + cloudflared).

## Local dev

```bash
cp .env.example .env
# fill in POSTGRES_PASSWORD, JWT_SECRET, ADMIN_USER_EMAIL, ADMIN_USER_PASSWORD_HASH

docker compose up --build
```

- Dashboard: http://localhost:3000
- API health: accessible from app container only (`docker compose exec app wget -qO- http://api:8000/health`)

**cloudflared** will exit immediately without a real `CF_TUNNEL_TOKEN` — this is expected locally.

## Generate a password hash

```bash
python -c "from passlib.context import CryptContext; print(CryptContext(['bcrypt']).hash('yourpassword'))"
```

Paste the output into `ADMIN_USER_PASSWORD_HASH` in `.env`.

## VPS deploy (Phase 4)

1. Provision a Hetzner VPS (Ubuntu 24.04 recommended).
2. Run `cloud-init.yaml` on first boot (or paste into user-data).
3. Create a named Cloudflare tunnel in the Cloudflare dashboard, copy the token into `.env`.
4. `docker compose up -d` — all services start, cloudflared routes the tunnel to `app:3000`.
