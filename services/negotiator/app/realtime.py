from __future__ import annotations

import os
from pathlib import Path

import httpx

from .sessions import NegotiationContext
from .tools import OPENAI_TOOL_DEFS

OPENAI_REALTIME_MODEL = os.getenv("OPENAI_REALTIME_MODEL", "gpt-realtime")
OPENAI_REALTIME_VOICE = os.getenv("OPENAI_REALTIME_VOICE", "marin")
OPENAI_TRANSCRIBE_MODEL = os.getenv("OPENAI_TRANSCRIBE_MODEL", "gpt-4o-transcribe")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")

PROMPT_DIR = Path(__file__).parent / "prompts"


def _read_prompt(name: str) -> str:
    return (PROMPT_DIR / name).read_text(encoding="utf-8")


def build_transcription_prompt(ctx: NegotiationContext) -> str:
    """Minimal vocabulary bias for the input transcription model.

    Whisper-style transcribers hallucinate plausible sentences on silence,
    breath, and speaker echo — and a long, on-topic vocabulary prompt
    *makes that worse*: it primes the model to invent telco-flavoured
    sentences from noise (we saw "Boa tarde, é possível alterar o meu
    tarifário X?" emitted with zero human input). Keep only the proper
    nouns we genuinely need disambiguated; drop the heavy jargon list.
    """
    return (
        "Conversa em Português Europeu (PT-PT). "
        f"Operadora: {ctx.operator_name}. "
        f"Tarifário: {ctx.plan_name}. "
        f"Cliente: {ctx.user_name}."
    )


def build_instructions(ctx: NegotiationContext) -> str:
    base = _read_prompt("negotiator_pt_pt.md")
    voice = _read_prompt("voice_directives.md")

    fid = ctx.current_fidelity_remaining_months
    if fid <= 0:
        fid_line = (
            "- Fidelização restante: **0 meses (fora de contrato)** — "
            "podes ameaçar a portabilidade imediatamente, sem custos.\n"
        )
    else:
        fid_line = (
            f"- Fidelização restante: **{fid} meses**. "
            "Se mudares antes do fim do contrato pagas penalização — "
            "por isso a alavanca de portabilidade é mais fraca, mas ainda "
            "podes ameaçar mudar quando o contrato terminar. **Recusa qualquer "
            f"NOVA fidelização que ultrapasse os {fid} meses que ainda tens.**\n"
        )

    context_block = (
        "\n\n## Contexto da chamada\n"
        f"- Nome do utilizador (titular): {ctx.user_name}\n"
        f"- NIF: {ctx.nif or '(não disponível)'}\n"
        f"- Morada de facturação: {ctx.address or '(não disponível)'}\n"
        f"- Telefone da conta: {ctx.caller_phone or '(o número desta chamada)'}\n"
        f"- Operador: {ctx.operator_name}\n"
        f"- Tarifário actual: {ctx.plan_name} a "
        f"{ctx.current_price_eur:.2f}€/mês\n"
        f"- Anos como cliente: {ctx.tenure_years}\n"
        f"- Amigo no mesmo plano paga: {ctx.friend_price_eur:.2f}€\n"
        f"- Preço alvo: {ctx.target_price_eur:.2f}€\n"
        f"- Limite máximo aceitável (walk-away): "
        f"{ctx.walk_away_threshold_eur:.2f}€\n"
        f"{fid_line}"
        "Se o operador pedir NIF / morada / telefone para validar a "
        "identidade, fornece-os com naturalidade.\n"
    )

    return base + "\n\n---\n\n" + voice + context_block


def _build_turn_detection(audio_format: str) -> dict:
    """Same server_vad config as the browser demo for both transports.

    The phone path used to override these knobs to fight echo / line
    noise but that broke the conversational feel. Single shared config
    now: stream audio to OpenAI, let it handle turn detection, get out
    of the way.
    """
    return {
        "type": "server_vad",
        "threshold": 0.72,
        "silence_duration_ms": 800,
        "prefix_padding_ms": 300,
        "interrupt_response": True,
        "create_response": True,
    }


def build_session_payload(ctx: NegotiationContext, *, audio_format: str = "pcm") -> dict:
    """Body for POST /v1/realtime/client_secrets (Realtime GA shape).

    The same `session` object is used for `session.update` events over
    WebSocket transport.

    `audio_format` selects the wire format. "pcm" → 24 kHz PCM16 (browser
    WebRTC / WS path). "g711_ulaw" → 8 kHz μ-law (Twilio Media Streams
    path; passes straight through with no transcoding).
    """
    if audio_format == "g711_ulaw":
        in_fmt = {"type": "audio/pcmu"}
        out_fmt = {"type": "audio/pcmu"}
    else:
        in_fmt = {"type": "audio/pcm", "rate": 24000}
        out_fmt = {"type": "audio/pcm", "rate": 24000}

    return {
        "session": {
            "type": "realtime",
            "model": OPENAI_REALTIME_MODEL,
            "output_modalities": ["audio"],
            "instructions": build_instructions(ctx),
            # Cap each response to ~10–15 s of speech. Without this, the
            # model occasionally generates 30+ s monologues that pile up
            # context and slow down later turns. Phone calls especially
            # suffer because audio context grows fast.
            "max_output_tokens": 250,
            "audio": {
                "input": {
                    "format": in_fmt,
                    # NOTE: input transcription deliberately DISABLED.
                    #
                    # The optional transcription sub-service (gpt-4o-transcribe
                    # or whisper-1) is independent of the main gpt-realtime
                    # model — gpt-realtime processes user audio directly to
                    # decide what to say, it does NOT read the transcription
                    # text. So removing transcription does not affect the
                    # agent's understanding at all.
                    #
                    # What it DOES remove: phantom "user said X" lines that
                    # appeared on silence/breath/echo (classic Whisper
                    # hallucination). Even with no prompt the transcriber
                    # was inventing on-topic sentences from noise, polluting
                    # the transcript pane and confusing the demo operator
                    # into thinking the agent had received fake input.
                    #
                    # The mic visualizer still shows when the user is talking,
                    # and the agent's voice replies confirm it heard them.
                    # If we ever need user transcripts back, do it server-side
                    # post-call from the recorded audio rather than realtime.
                    "turn_detection": _build_turn_detection(audio_format),
                },
                "output": {
                    "format": out_fmt,
                    "voice": OPENAI_REALTIME_VOICE,
                },
            },
            "tools": OPENAI_TOOL_DEFS,
            "tool_choice": "auto",
        }
    }


async def mint_ephemeral_session(payload: dict) -> dict:
    """Create a Realtime client secret (GA) and return ephemeral creds."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not set")
    url = f"{OPENAI_BASE_URL}/realtime/client_secrets"
    async with httpx.AsyncClient(timeout=20.0) as client:
        r = await client.post(
            url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
        if r.status_code >= 400:
            raise RuntimeError(f"OpenAI {r.status_code}: {r.text}")
        data = r.json()
    value = data.get("value")
    expires_at = data.get("expires_at")
    model = (data.get("session") or {}).get("model", OPENAI_REALTIME_MODEL)
    if not value:
        raise RuntimeError(f"Missing 'value' in OpenAI response: {data}")
    return {
        "client_secret": value,
        "expires_at": expires_at,
        "model": model,
    }
