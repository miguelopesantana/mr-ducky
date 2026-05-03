from __future__ import annotations

import asyncio
import json
import os
from pathlib import Path
from typing import Optional

import logging
import traceback

import websockets
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from .realtime import OPENAI_REALTIME_MODEL, build_session_payload
from .sessions import NegotiationContext, SessionStore
from .tools import ToolCall, execute_tool
from .transcript import TranscriptStore
from .twilio_voice import (
    build_stream_twiml,
    hangup_call,
    load_twilio_config,
    place_outbound_call,
)

load_dotenv()

log = logging.getLogger("negotiator.voice")
logging.basicConfig(level=logging.INFO)

APP_DIR = Path(__file__).parent
STATIC_DIR = APP_DIR / "static"

app = FastAPI(title="mr-ducky negotiator", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

sessions = SessionStore()
transcripts = TranscriptStore()

# Defaults used by /voice/incoming when there is no preceding /sessions or
# /calls request to carry the negotiation parameters. The /demo page can
# update this server-side via POST /inbound-config so an inbound call to the
# Twilio number uses the right name, plan, target etc.
_inbound_default = NegotiationContext(
    user_name="Clara Pato",
    operator_name="Vodafone",
    plan_name="Yorn 12",
    current_price_eur=12.00,
    tenure_years=4,
    friend_price_eur=8.00,
    target_price_eur=8.00,
    walk_away_threshold_eur=9.50,
    current_fidelity_remaining_months=0,
    nif="287654321",
    address="Rua das Flores, 12, 3º Esq, 1200-195 Lisboa",
)


class StartSessionRequest(BaseModel):
    user_name: str = "Pedro"
    operator_name: str = "Vodafone"
    plan_name: str = "Yorn 12"
    current_price_eur: float = 12.00
    tenure_years: int = 4
    friend_price_eur: float = 8.00
    target_price_eur: float = 8.00
    walk_away_threshold_eur: float = 9.50
    current_fidelity_remaining_months: int = 0
    nif: str = ""
    address: str = ""


class StartSessionResponse(BaseModel):
    session_id: str
    model: str


@app.post("/sessions", response_model=StartSessionResponse)
async def start_session(req: StartSessionRequest) -> StartSessionResponse:
    """Allocate a server-side session. The browser then opens a WebSocket
    to /ws/realtime/{session_id} which the backend proxies to OpenAI."""
    ctx = NegotiationContext(**req.model_dump())
    session_id = sessions.create(ctx)
    return StartSessionResponse(session_id=session_id, model=OPENAI_REALTIME_MODEL)


class ToolCallRequest(BaseModel):
    name: str
    arguments: dict
    call_id: str


@app.post("/sessions/{session_id}/tool")
def handle_tool(session_id: str, req: ToolCallRequest) -> dict:
    session = sessions.get(session_id)
    if session is None:
        raise HTTPException(404, "Unknown session")
    result = execute_tool(
        ToolCall(name=req.name, arguments=req.arguments, call_id=req.call_id),
        context=session.context,
        policy=session.policy,
    )
    transcripts.append(session_id, role="tool", text=f"{req.name} -> {result}")
    return {"call_id": req.call_id, "output": result}


class TranscriptAppendRequest(BaseModel):
    role: str
    text: str


@app.post("/sessions/{session_id}/transcript")
def append_transcript(session_id: str, req: TranscriptAppendRequest) -> dict:
    if sessions.get(session_id) is None:
        raise HTTPException(404, "Unknown session")
    transcripts.append(session_id, role=req.role, text=req.text)
    return {"ok": True}


@app.get("/sessions/{session_id}/transcript")
def get_transcript(session_id: str) -> dict:
    if sessions.get(session_id) is None:
        raise HTTPException(404, "Unknown session")
    return {"entries": transcripts.get(session_id)}


@app.get("/sessions/{session_id}/state")
def get_state(session_id: str) -> dict:
    session = sessions.get(session_id)
    if session is None:
        raise HTTPException(404, "Unknown session")
    return {
        "context": session.context.model_dump(),
        "policy": session.policy.snapshot(),
    }


@app.post("/sessions/{session_id}/end")
def end_session(session_id: str, outcome: str = "ended") -> dict:
    session = sessions.get(session_id)
    if session is None:
        raise HTTPException(404, "Unknown session")
    session.policy.finalize(outcome)
    paths = transcripts.save_to_disk(session_id, outcome=outcome)
    # If this session is bound to a Twilio call, hang it up too. Closing the
    # WS would already do this, but the user clicking "Desligar" should
    # terminate the call even if the bridge has stopped pumping for any
    # reason.
    if session.call_sid:
        cfg = load_twilio_config()
        if cfg is not None:
            hangup_call(cfg, session.call_sid)
    return {"ok": True, "policy": session.policy.snapshot(), "transcript_files": paths}


@app.get("/health")
def health() -> dict:
    return {"ok": True}


# --- Phone (Twilio) path --------------------------------------------------


class StartCallRequest(StartSessionRequest):
    to_number: str  # E.164, e.g. "+351912345678"


class StartCallResponse(BaseModel):
    session_id: str
    call_sid: str
    to_number: str
    model: str


@app.post("/calls", response_model=StartCallResponse)
async def start_call(req: StartCallRequest) -> StartCallResponse:
    """Place an outbound Twilio call bound to a fresh negotiator session.

    Twilio dials `to_number`, the user picks up, Twilio fetches
    /voice/twiml/{session_id}, opens a Media Stream WS to /voice/stream/{id},
    and the agent starts negotiating.
    """
    cfg = load_twilio_config()
    if cfg is None:
        raise HTTPException(
            503,
            "Twilio not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, "
            "TWILIO_FROM_NUMBER and PUBLIC_BASE_URL in .env.",
        )

    ctx_data = req.model_dump(exclude={"to_number"})
    ctx = NegotiationContext(**ctx_data)
    session_id = sessions.create(ctx)

    try:
        call_sid = place_outbound_call(
            cfg, to_number=req.to_number, session_id=session_id
        )
    except Exception as exc:
        sessions.discard(session_id)
        raise HTTPException(502, f"Twilio call failed: {exc}") from exc

    sess = sessions.get(session_id)
    if sess is not None:
        sess.call_sid = call_sid
        sess.to_number = req.to_number

    return StartCallResponse(
        session_id=session_id,
        call_sid=call_sid,
        to_number=req.to_number,
        model=OPENAI_REALTIME_MODEL,
    )


@app.get("/inbound-config")
def get_inbound_config() -> dict:
    return _inbound_default.model_dump()


@app.post("/inbound-config")
def set_inbound_config(req: StartSessionRequest) -> dict:
    """Update the negotiation context used by /voice/incoming. Called by
    the /demo page so an inbound call to the Twilio number uses the user's
    chosen name / plan / target / walk-away."""
    global _inbound_default
    _inbound_default = NegotiationContext(**req.model_dump())
    return {"ok": True, "context": _inbound_default.model_dump()}


@app.api_route("/voice/incoming", methods=["GET", "POST"])
async def voice_incoming(request: Request) -> Response:
    """Inbound call entry point.

    Configure your Twilio number's "A call comes in" webhook to POST here.
    We create a fresh negotiator session using the current inbound defaults
    (settable from /demo) and return TwiML that opens a Media Stream back
    to /voice/stream/{id}.
    """
    cfg = load_twilio_config()
    if cfg is None:
        raise HTTPException(503, "Twilio not configured")

    ctx = _inbound_default.model_copy()

    # Capture the inbound CallSid so /sessions/:id/end can hang up cleanly,
    # and pull the caller's number off Twilio's `From` header so the agent
    # can recite it when the operator asks (it's the caller's own phone, so
    # not sensitive — and it spares a verification round-trip).
    call_sid: Optional[str] = None
    from_num: Optional[str] = None
    try:
        form = await request.form()
        cs = form.get("CallSid")
        fr = form.get("From")
        call_sid = cs if isinstance(cs, str) else None
        from_num = fr if isinstance(fr, str) else None
    except Exception:
        pass

    if from_num:
        ctx.caller_phone = from_num

    session_id = sessions.create(ctx)
    if call_sid:
        sess = sessions.get(session_id)
        if sess is not None:
            sess.call_sid = call_sid
            sess.to_number = from_num

    xml = build_stream_twiml(cfg, session_id)
    return Response(content=xml, media_type="application/xml")


@app.post("/voice/twiml/{session_id}")
async def voice_twiml(session_id: str, request: Request) -> Response:
    """Twilio fetches this when the dialed party picks up. We respond with
    TwiML that opens a Media Stream WebSocket back to this service."""
    cfg = load_twilio_config()
    if cfg is None:
        raise HTTPException(503, "Twilio not configured")
    if sessions.get(session_id) is None:
        raise HTTPException(404, "Unknown session")
    xml = build_stream_twiml(cfg, session_id)
    return Response(content=xml, media_type="application/xml")


@app.websocket("/voice/stream/{session_id}")
async def voice_stream(twilio_ws: WebSocket, session_id: str) -> None:
    """Twilio Media Streams ↔ OpenAI Realtime bridge.

    Both sides talk G.711 μ-law 8 kHz so audio passes through as base64
    with no transcoding. Tool calls are intercepted server-side and run
    through the same policy layer as the browser path.
    """
    session = sessions.get(session_id)
    if session is None:
        await twilio_ws.close(code=1008, reason="unknown session")
        return
    await twilio_ws.accept()

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        await twilio_ws.close(code=1011, reason="OPENAI_API_KEY not set")
        return

    cfg = load_twilio_config()  # for hangup fallback

    log.info("voice_stream WS accepted session=%s", session_id)

    # Wait for the Twilio "start" frame so we learn the streamSid we need
    # to address outbound media frames to. Twilio sends "connected" first,
    # then "start"; subsequent media frames begin after.
    stream_sid: Optional[str] = None
    try:
        while stream_sid is None:
            frame = await twilio_ws.receive_json()
            ev = frame.get("event")
            log.info("twilio frame event=%s session=%s", ev, session_id)
            if ev == "start":
                stream_sid = frame.get("start", {}).get("streamSid") or frame.get(
                    "streamSid"
                )
                break
            if ev in (None, "connected"):
                continue
            if ev == "stop":
                return
    except WebSocketDisconnect:
        log.warning("twilio WS disconnected before start frame session=%s", session_id)
        return
    except Exception:
        log.exception("error waiting for Twilio start frame session=%s", session_id)
        return

    log.info("twilio start ok streamSid=%s session=%s", stream_sid, session_id)

    openai_url = f"wss://api.openai.com/v1/realtime?model={OPENAI_REALTIME_MODEL}"
    headers = {"Authorization": f"Bearer {api_key}"}

    try:
        async with websockets.connect(
            openai_url, additional_headers=headers, max_size=2**24
        ) as openai_ws:
            session_cfg = build_session_payload(
                session.context, audio_format="g711_ulaw"
            )["session"]
            await openai_ws.send(
                json.dumps({"type": "session.update", "session": session_cfg})
            )

            # Kick off the agent: call get_user_context to orient, then wait
            # for the human to speak. Mirrors the browser demo flow.
            await openai_ws.send(
                json.dumps(
                    {
                        "type": "response.create",
                        "response": {
                            "instructions": (
                                "Chama get_user_context primeiro para te orientares. "
                                "Depois aguarda que o operador (a pessoa do outro "
                                "lado da linha) atenda e se apresente. Quando o "
                                "ouvires, **confirma primeiro que o estás a ouvir "
                                "bem** com uma frase curta (ex: \"Olá [nome], estou "
                                "a ouvi-lo bem, obrigado.\") e só depois abre a "
                                "conversa como cliente. Não fales antes de ouvires "
                                "o operador."
                            )
                        },
                    }
                )
            )

            log.info("openai connected, bridging session=%s", session_id)
            await _phone_bridge(twilio_ws, openai_ws, session, session_id, stream_sid)
    except websockets.InvalidStatus as exc:
        body = ""
        try:
            body = exc.response.body.decode("utf-8", "replace")[:400]
        except Exception:
            pass
        log.error(
            "openai handshake failed status=%s body=%s session=%s",
            getattr(exc.response, "status_code", "?"),
            body,
            session_id,
        )
        try:
            await twilio_ws.close(
                code=1011, reason=f"OpenAI {exc.response.status_code}"
            )
        except Exception:
            pass
    except Exception:
        log.exception("bridge error session=%s", session_id)
        try:
            await twilio_ws.close(code=1011, reason="bridge error")
        except Exception:
            pass
    finally:
        try:
            transcripts.save_to_disk(session_id, outcome="phone_call_ended")
        except Exception:
            pass
        # Belt-and-suspenders: explicitly hang up. Closing the WS already
        # tells Twilio to end the call (we used <Connect>), but if the call
        # is somehow still active we'll terminate it via REST.
        if cfg is not None and session.call_sid:
            hangup_call(cfg, session.call_sid)
        try:
            await twilio_ws.close()
        except Exception:
            pass


async def _race_until_first_done(*coros) -> None:
    """Run coroutines concurrently; cancel the rest as soon as one finishes.

    `asyncio.gather` waits for ALL coroutines, which is wrong for our
    bridge: when Twilio (or the browser) hangs up, the inbound-pump
    coroutine exits — but the OpenAI-pump is still blocked inside
    `async for msg in openai_ws` and gather never returns. The OpenAI
    Realtime session then hangs around until OpenAI's own 60-min cap
    fires `session_expired`, polluting the log and burning a slot in
    any per-account concurrent-session quota. Cancel-on-first-done
    unwinds all sides cleanly, the websocket context managers run their
    close handshakes, and the OpenAI session is released immediately.
    """
    tasks = [asyncio.create_task(c) for c in coros]
    try:
        _done, pending = await asyncio.wait(
            tasks, return_when=asyncio.FIRST_COMPLETED
        )
        for t in pending:
            t.cancel()
        if pending:
            await asyncio.gather(*pending, return_exceptions=True)
    except asyncio.CancelledError:
        for t in tasks:
            t.cancel()
        raise


def _log_rate_limits(data: dict, session_id: str) -> None:
    """Log `rate_limits.updated` with severity scaled to remaining budget.

    The Realtime API emits this on every turn. At healthy budgets the
    log is silent — at <20% remaining it warns, at <5% it screams.
    The reason this matters: gpt-realtime tier 1 is 40k tokens/min, and
    every turn re-sends the entire conversation as input audio (~100
    tok/s). By minute ~5 a single turn alone can exceed the bucket and
    the next response.created fires with no audio at all (silent agent).
    Loud logs make that cause obvious instead of "model just stopped".
    """
    for lim in data.get("rate_limits") or []:
        name = lim.get("name", "?")
        remaining = lim.get("remaining", 0)
        limit = lim.get("limit", 0) or 1
        reset = lim.get("reset_seconds", 0)
        pct = remaining / limit * 100
        msg = (
            f"rate_limit name={name} remaining={remaining}/{limit} "
            f"({pct:.0f}%) reset_in={reset:.1f}s session={session_id}"
        )
        if remaining < limit * 0.05:
            log.error("TOKEN BUDGET CRITICAL — %s", msg)
        elif remaining < limit * 0.2:
            log.warning("token budget low — %s", msg)


def _log_response_done(
    data: dict, session_id: str, audio_chunks: int, response_kind: str
) -> None:
    """Log per-response status, usage, and emitted audio chunks.

    The headline catch is **true silent responses**: status=completed,
    no audio emitted, AND no function call in the response output. That
    combination is what the Realtime API returns when it can't fit the
    audio output inside the current per-minute token budget — agent goes
    quiet on the call.

    Tool-call responses also have audio_chunks=0 (the model emits the
    function-call JSON only — the spoken reply lands in the *next*
    response after the tool result is returned). We previously flagged
    those as EMPTY too; now we identify them via response.output[*].type
    == "function_call" and log them as info with the tool name.
    """
    resp = data.get("response") or {}
    status = resp.get("status", "?")
    reason = (resp.get("status_details") or {}).get("reason")
    usage = resp.get("usage") or {}
    in_tok = usage.get("input_tokens", 0)
    out_tok = usage.get("output_tokens", 0)
    in_details = usage.get("input_token_details") or {}
    out_details = usage.get("output_token_details") or {}

    output_items = resp.get("output") or []
    fn_calls = [it.get("name", "?") for it in output_items if it.get("type") == "function_call"]

    summary = (
        f"{response_kind} status={status}"
        + (f" reason={reason}" if reason else "")
        + (f" tool_calls={fn_calls}" if fn_calls else "")
        + f" in={in_tok}(audio={in_details.get('audio_tokens', 0)},"
        + f"cached={in_details.get('cached_tokens', 0)})"
        + f" out={out_tok}(audio={out_details.get('audio_tokens', 0)})"
        + f" audio_chunks={audio_chunks} session={session_id}"
    )

    if (
        response_kind == "response.done"
        and status == "completed"
        and audio_chunks == 0
        and not fn_calls
    ):
        log.error("EMPTY RESPONSE (no audio emitted, likely rate-limited) — %s", summary)
    elif status not in ("completed", "cancelled", "canceled", "?"):
        log.warning(summary)
    else:
        log.info(summary)


async def _phone_bridge(
    twilio_ws: WebSocket,
    openai_ws: "websockets.WebSocketClientProtocol",
    session,
    session_id: str,
    stream_sid: str,
) -> None:
    """Pump Twilio media → OpenAI input, OpenAI audio → Twilio media.

    Phone-call protection model:

      1. The very first response (opening pitch) is fully uninterruptible
         — we don't forward user audio to OpenAI until the first
         response.done arrives.

      2. Each subsequent response is protected *for as long as OpenAI is
         still emitting audio for it* + a small grace for Twilio's playout
         tail. We track this via response.output_audio.delta /
         response.output_audio.done events instead of a fixed timer
         because, as the conversation grows and OpenAI gets slower,
         a fixed 800 ms window stops covering the actual response
         duration and the user starts cancelling replies mid-phrase.

    Outside both protection windows the bridge is a plain passthrough.
    `speech_started` flushes Twilio's playout buffer and OpenAI's
    `interrupt_response: true` cancels the in-flight response — natural
    GPT-live barge-in.
    """
    import time as _time

    end_call_fired = asyncio.Event()
    initial_response_done = asyncio.Event()
    # Tail-drain window after OpenAI stops emitting audio. Twilio still has
    # ~hundreds of ms buffered in its playout, and the operator's handset
    # adds its own echo tail. 0.5 s was too tight: residual echo slipped
    # through and semantic_vad on the OpenAI side had to fight it. 1.2 s
    # gives the line time to settle without making turn-around feel sluggish.
    POST_AUDIO_GRACE_S = 1.2
    # While the model is actively generating audio, this is float("inf").
    # When response.output_audio.done fires we set it to a future timestamp
    # (now + grace) to cover Twilio's playout buffer. While this timestamp
    # is in the future, user audio is dropped.
    # `audio_chunks_in_current_response` is reset on response.created and
    # incremented on every audio.delta. On response.done == 0 means the
    # model emitted no audio for this turn (silent agent).
    state = {"audio_protected_until": 0.0, "audio_chunks_in_current_response": 0}

    def in_response_protection() -> bool:
        return _time.monotonic() < state["audio_protected_until"]

    async def twilio_to_openai() -> None:
        try:
            while True:
                frame = await twilio_ws.receive_json()
                ev = frame.get("event")
                if ev == "media":
                    if not initial_response_done.is_set():
                        # Suppress inbound during the opening pitch.
                        continue
                    if in_response_protection():
                        # Don't let the first 800 ms of the agent's reply
                        # be cancelled by echo or by the user finishing
                        # their tail-end syllable.
                        continue
                    payload = frame.get("media", {}).get("payload")
                    if payload:
                        await openai_ws.send(
                            json.dumps(
                                {
                                    "type": "input_audio_buffer.append",
                                    "audio": payload,
                                }
                            )
                        )
                elif ev == "stop":
                    log.info("twilio stop session=%s", session_id)
                    break
        except WebSocketDisconnect:
            log.info("twilio WS disconnected session=%s", session_id)
        except Exception:
            log.exception("twilio_to_openai error session=%s", session_id)

    async def openai_to_twilio() -> None:
        try:
            async for msg in openai_ws:
                try:
                    data = json.loads(msg)
                except (json.JSONDecodeError, TypeError):
                    continue

                et = data.get("type", "")

                if et == "error":
                    log.error("openai error session=%s payload=%s", session_id, data)

                elif et == "response.failed":
                    log.error(
                        "response.failed session=%s payload=%s", session_id, data
                    )

                elif et == "rate_limits.updated":
                    _log_rate_limits(data, session_id)

                elif et == "response.created":
                    # Audio protection extends through generation; flip
                    # the gate to "always protected" until output_audio.done
                    # explicitly winds it down.
                    state["audio_protected_until"] = float("inf")
                    state["audio_chunks_in_current_response"] = 0
                    log.info("response.created session=%s", session_id)

                elif et in ("response.audio.done", "response.output_audio.done"):
                    # OpenAI finished emitting audio for this response.
                    # Twilio still has a tail in its playout buffer; hold
                    # the gate for a small grace window to let it drain
                    # before we accept new user audio.
                    state["audio_protected_until"] = (
                        _time.monotonic() + POST_AUDIO_GRACE_S
                    )
                    log.info(
                        "audio.done → grace+%.1fs session=%s",
                        POST_AUDIO_GRACE_S,
                        session_id,
                    )

                elif et in ("response.done", "response.cancelled", "response.canceled"):
                    _log_response_done(
                        data,
                        session_id,
                        state["audio_chunks_in_current_response"],
                        et,
                    )
                    if not initial_response_done.is_set():
                        initial_response_done.set()
                        log.info(
                            "initial pitch finished — barge-in enabled session=%s",
                            session_id,
                        )

                if et in ("response.audio.delta", "response.output_audio.delta"):
                    delta = data.get("delta")
                    if delta:
                        state["audio_chunks_in_current_response"] += 1
                        await twilio_ws.send_json(
                            {
                                "event": "media",
                                "streamSid": stream_sid,
                                "media": {"payload": delta},
                            }
                        )

                elif et == "input_audio_buffer.speech_started":
                    # Natural barge-in. Only reachable AFTER the initial
                    # response finishes (we don't forward user audio
                    # before that, so OpenAI never sees anything to fire
                    # speech_started on).
                    log.info("speech_started session=%s", session_id)
                    try:
                        await twilio_ws.send_json(
                            {"event": "clear", "streamSid": stream_sid}
                        )
                    except Exception:
                        pass

                elif et == "response.function_call_arguments.done":
                    fired = await _handle_phone_tool_call(
                        data, openai_ws, session, session_id
                    )
                    if fired:
                        end_call_fired.set()

                elif et in (
                    "response.audio_transcript.done",
                    "response.output_audio_transcript.done",
                ):
                    text = data.get("transcript") or ""
                    if text:
                        transcripts.append(session_id, role="assistant", text=text)

                elif et == "conversation.item.input_audio_transcription.completed":
                    text = data.get("transcript") or ""
                    if text:
                        transcripts.append(session_id, role="user", text=text)
        except websockets.ConnectionClosed as exc:
            log.info(
                "openai WS closed code=%s reason=%s session=%s",
                getattr(exc, "code", "?"),
                getattr(exc, "reason", "?"),
                session_id,
            )
        except Exception:
            log.exception("openai_to_twilio error session=%s", session_id)

    async def hangup_after_end_call() -> None:
        await end_call_fired.wait()
        # Drain time: the agent's goodbye is queued on Twilio's playout. The
        # prompt has it speak the bye BEFORE calling end_call, so by now most
        # audio is already on the wire — give it ~2.5s to finish playing.
        await asyncio.sleep(2.5)
        try:
            await twilio_ws.close(code=1000, reason="agent end_call")
        except Exception:
            pass

    await _race_until_first_done(
        twilio_to_openai(),
        openai_to_twilio(),
        hangup_after_end_call(),
    )


async def _handle_phone_tool_call(
    data: dict,
    openai_ws: "websockets.WebSocketClientProtocol",
    session,
    session_id: str,
) -> bool:
    """Run a tool through the policy. Returns True iff this was end_call."""
    name = data.get("name", "")
    call_id = data.get("call_id", "")
    try:
        args = json.loads(data.get("arguments") or "{}")
    except json.JSONDecodeError:
        args = {}

    result = execute_tool(
        ToolCall(name=name, arguments=args, call_id=call_id),
        context=session.context,
        policy=session.policy,
    )
    transcripts.append(session_id, role="tool", text=f"{name} -> {result}")

    await openai_ws.send(
        json.dumps(
            {
                "type": "conversation.item.create",
                "item": {
                    "type": "function_call_output",
                    "call_id": call_id,
                    "output": json.dumps(result),
                },
            }
        )
    )
    if name != "end_call":
        await openai_ws.send(json.dumps({"type": "response.create"}))

    return name == "end_call"


@app.websocket("/ws/realtime/{session_id}")
async def ws_realtime(client_ws: WebSocket, session_id: str) -> None:
    """Browser WebSocket bridge to OpenAI Realtime.

    The browser sends `input_audio_buffer.append` events with PCM16 audio
    and receives `response.output_audio.delta` events back. Function calls
    are intercepted server-side: the policy runs here, the result is sent
    back to OpenAI, and a synthetic `negotiator.tool_result` event is also
    pushed to the browser for display.
    """
    session = sessions.get(session_id)
    if session is None:
        await client_ws.close(code=1008, reason="unknown session")
        return
    await client_ws.accept()

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        await client_ws.send_json(
            {"type": "error", "error": {"message": "OPENAI_API_KEY not set"}}
        )
        await client_ws.close()
        return

    openai_url = f"wss://api.openai.com/v1/realtime?model={OPENAI_REALTIME_MODEL}"
    headers = {"Authorization": f"Bearer {api_key}"}

    try:
        async with websockets.connect(
            openai_url,
            additional_headers=headers,
            max_size=2**24,
        ) as openai_ws:
            session_cfg = build_session_payload(session.context)["session"]
            await openai_ws.send(
                json.dumps({"type": "session.update", "session": session_cfg})
            )

            await _bridge(client_ws, openai_ws, session, session_id)
    except websockets.InvalidStatus as exc:
        await _safe_send_err(
            client_ws, f"OpenAI handshake failed: {exc.response.status_code}"
        )
    except Exception as exc:
        await _safe_send_err(client_ws, f"WS proxy error: {exc}")
    finally:
        try:
            transcripts.save_to_disk(session_id, outcome="ws_closed")
        except Exception:
            pass
        try:
            await client_ws.close()
        except Exception:
            pass


async def _safe_send_err(ws: WebSocket, msg: str) -> None:
    try:
        await ws.send_json({"type": "error", "error": {"message": msg}})
    except Exception:
        pass


async def _bridge(
    client_ws: WebSocket,
    openai_ws: "websockets.WebSocketClientProtocol",
    session,
    session_id: str,
) -> None:
    async def client_to_openai() -> None:
        try:
            while True:
                msg = await client_ws.receive_text()
                await openai_ws.send(msg)
        except WebSocketDisconnect:
            pass

    state = {"audio_chunks_in_current_response": 0}

    async def openai_to_client() -> None:
        try:
            async for msg in openai_ws:
                try:
                    data = json.loads(msg)
                except (json.JSONDecodeError, TypeError):
                    await client_ws.send_text(
                        msg if isinstance(msg, str) else msg.decode("utf-8", "replace")
                    )
                    continue

                # Forward to client verbatim.
                await client_ws.send_text(json.dumps(data))

                event_type = data.get("type", "")

                if event_type == "rate_limits.updated":
                    _log_rate_limits(data, session_id)

                elif event_type == "response.created":
                    state["audio_chunks_in_current_response"] = 0

                elif event_type in (
                    "response.audio.delta",
                    "response.output_audio.delta",
                ):
                    if data.get("delta"):
                        state["audio_chunks_in_current_response"] += 1

                elif event_type in (
                    "response.done",
                    "response.cancelled",
                    "response.canceled",
                ):
                    _log_response_done(
                        data,
                        session_id,
                        state["audio_chunks_in_current_response"],
                        event_type,
                    )

                elif event_type == "error" or event_type == "response.failed":
                    log.error(
                        "openai %s session=%s payload=%s",
                        event_type,
                        session_id,
                        data,
                    )

                # Server-side tool execution.
                if event_type == "response.function_call_arguments.done":
                    await _handle_tool_call(data, openai_ws, client_ws, session, session_id)

                # Persist transcripts server-side too.
                elif event_type in (
                    "response.audio_transcript.done",
                    "response.output_audio_transcript.done",
                ):
                    text = data.get("transcript") or ""
                    if text:
                        transcripts.append(session_id, role="assistant", text=text)
                elif event_type == "conversation.item.input_audio_transcription.completed":
                    text = data.get("transcript") or ""
                    if text:
                        transcripts.append(session_id, role="user", text=text)
        except websockets.ConnectionClosed:
            pass

    await _race_until_first_done(client_to_openai(), openai_to_client())


async def _handle_tool_call(
    data: dict,
    openai_ws,
    client_ws: WebSocket,
    session,
    session_id: str,
) -> None:
    name = data.get("name", "")
    call_id = data.get("call_id", "")
    try:
        args = json.loads(data.get("arguments") or "{}")
    except json.JSONDecodeError:
        args = {}

    result = execute_tool(
        ToolCall(name=name, arguments=args, call_id=call_id),
        context=session.context,
        policy=session.policy,
    )
    transcripts.append(session_id, role="tool", text=f"{name} -> {result}")

    # Synthetic event so the browser can display the policy verdict.
    try:
        await client_ws.send_text(
            json.dumps(
                {
                    "type": "negotiator.tool_result",
                    "name": name,
                    "call_id": call_id,
                    "output": result,
                }
            )
        )
    except Exception:
        pass

    # Send result back to OpenAI.
    await openai_ws.send(
        json.dumps(
            {
                "type": "conversation.item.create",
                "item": {
                    "type": "function_call_output",
                    "call_id": call_id,
                    "output": json.dumps(result),
                },
            }
        )
    )

    # Don't trigger another response after end_call — otherwise the model
    # narrates a robotic post-call summary ("a chamada ficou concluída
    # com..."). The actual goodbye must be spoken BEFORE end_call; the UI
    # shows the outcome card from the negotiator.tool_result above.
    if name != "end_call":
        await openai_ws.send(json.dumps({"type": "response.create"}))


if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

    @app.get("/demo")
    def demo() -> FileResponse:
        return FileResponse(STATIC_DIR / "demo.html")

    @app.get("/")
    def index() -> FileResponse:
        return FileResponse(STATIC_DIR / "demo.html")
