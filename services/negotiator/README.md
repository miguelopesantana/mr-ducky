# mr-ducky · negotiator

Voice agent that calls a Portuguese telcom provider on the user's behalf and tries to negotiate a lower monthly price. **PT-PT, browser-based call for v0** (no Twilio yet — that's v1).

> "Olá, bom dia Sandra. Sou cliente há quatro anos e queria discutir o preço do meu tarifário. Tenho um amigo no mesmo plano que paga oito euros e eu pago doze. Estou a pensar mudar de operadora se não me conseguirem fazer melhor."

## Stack

- **FastAPI** — session / tool / transcript endpoints
- **OpenAI Realtime API** (`gpt-realtime`) — speech-to-speech, function calling, server-VAD turn detection
- **Browser WebRTC** — direct browser ↔ OpenAI audio path; backend only mints ephemeral tokens and runs tool calls
- **Server-side policy** in `app/policy.py` — load-bearing guardrails (walk-away floor, max 3 counters)

## Run

```bash
cd services/negotiator
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # then put your OPENAI_API_KEY in
uvicorn app.main:app --reload
```

Open http://localhost:8000/demo, set the negotiation parameters, click **Iniciar chamada**, and speak as if you were the operator picking up:

> "Bom dia, está a falar com a Sandra Correia da Vodafone."

The agent will respond as the customer, negotiate, and either close on a price or hang up.

## How it works

1. Browser POSTs `/sessions` with the negotiation context (current price, target, walk-away).
2. Backend builds the system prompt + tool definitions and mints an OpenAI Realtime ephemeral token via `POST /v1/realtime/sessions`.
3. Browser opens WebRTC straight to OpenAI Realtime with the ephemeral token. Audio flows browser ↔ OpenAI, no server proxy.
4. When the model emits a function call (e.g. `propose_counter(8.0, "amigo paga 8€")`), the browser forwards it to `/sessions/:id/tool`. The backend runs the policy check and returns guidance to the model via the data channel.
5. The model adapts its negotiation based on the policy response — e.g. it cannot `accept_offer` above the walk-away threshold; the server tells it to keep negotiating.

## Policy guardrails (the load-bearing part)

The prompt tells the model to negotiate well. The **policy** in `app/policy.py` is what stops it from caving when the model gets polite under pressure:

- `accept_offer(price)` is **rejected** if `price > walk_away_threshold_eur`. The model gets back `{accepted: false, guidance: "..."}` and a hint to push back.
- `propose_counter` is **capped at 3 rounds**. After that the guidance flips to "stop proposing — accept the best offer or end the call."
- The walk-away threshold and counter cap are server-side facts, not prompt instructions. Prompts drift; servers don't.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/sessions` | Start a negotiation; returns `{session_id, client_secret, model}` for the browser |
| POST | `/sessions/{id}/tool` | Browser forwards function calls; backend runs policy |
| POST | `/sessions/{id}/transcript` | Append a transcript line (role: user/assistant) |
| GET  | `/sessions/{id}/transcript` | Fetch the full transcript |
| GET  | `/sessions/{id}/state` | Fetch context + policy snapshot |
| POST | `/sessions/{id}/end` | Mark the session ended |
| GET  | `/demo` | Single-page WebRTC demo client |
| GET  | `/health` | Liveness check |

## Tests

```bash
pip install pytest
pytest tests/
```

Policy is unit-tested. The WebRTC + OpenAI loop is exercised manually via the demo page.

## Swapping voice provider

If `gpt-realtime` voice quality drifts toward Brazilian Portuguese during the demo (it can — the model is multilingual but PT-PT is not its strongest accent), swap to **ElevenLabs Conversational AI** (much stronger native PT-PT voices). Only `app/realtime.py` needs to change — the policy, tools, transcript layer, and demo HTML stay identical at the boundary. Hooks for ElevenLabs are not wired in v0.

## Going to a real phone (v1)

Currently the demo is browser-only — the user speaks into their laptop mic, plays the role of the operator. To call a real number, add Twilio outbound + Media Streams in front of the Realtime session:

- Twilio places the outbound call to the retentions line
- Media Streams pipes G.711 μ-law audio to a small WebSocket bridge
- Bridge transcodes to PCM16 and proxies to OpenAI Realtime over WebSocket
- Function calls still loop through this service's `/tool` endpoint

The browser demo proves the negotiation loop first; telephony comes after.

## Files

```
app/
  main.py              FastAPI: /sessions, /tool, /transcript
  realtime.py          Mints OpenAI ephemeral tokens; builds session config
  tools.py             Function defs exposed to the model + local executors
  policy.py            Walk-away, counter cap, accepted offer state
  transcript.py        In-memory append-only transcript log
  sessions.py          Session store + NegotiationContext model
  prompts/
    negotiator_pt_pt.md   System prompt (persona, tactics, rules) — PT-PT
    voice_directives.md   Sotaque, vocabulário, ritmo
  static/demo.html     Single-page WebRTC demo client
tests/
  test_policy.py       Policy guardrail unit tests
```

## Wiring into the rest of mr-ducky

Self-contained on purpose — no shared deps with the other services. Two integration paths:

1. **Embed the demo client** into `apps/app/` Next.js as a `/negotiate` page; talk to this service over `NEXT_PUBLIC_NEGOTIATOR_URL`.
2. **Call programmatically** from `services/api/` — POST to `/sessions` with the user's actual plan info from GoCardless, then surface the `session_id` and `client_secret` to the frontend.
