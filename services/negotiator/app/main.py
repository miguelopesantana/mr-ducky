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
    user_name="Pedro",
    operator_name="Vodafone",
    plan_name="Yorn 12",
    current_price_eur=12.00,
    tenure_years=4,
    friend_price_eur=8.00,
    target_price_eur=8.00,
    walk_away_threshold_eur=9.50,
    current_fidelity_remaining_months=0,
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
    session_id = sessions.create(ctx)

    # Capture the inbound CallSid so /sessions/:id/end can hang up cleanly.
    try:
        form = await request.form()
        call_sid = form.get("CallSid")
        from_num = form.get("From")
        if call_sid:
            sess = sessions.get(session_id)
            if sess is not None:
                sess.call_sid = call_sid
                if isinstance(from_num, str):
                    sess.to_number = from_num
    except Exception:
        pass

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


async def _phone_bridge(
    twilio_ws: WebSocket,
    openai_ws: "websockets.WebSocketClientProtocol",
    session,
    session_id: str,
    stream_sid: str,
) -> None:
    """Pump Twilio media → OpenAI input, OpenAI audio → Twilio media.

    Phone-line acoustic echo is the enemy: the agent's own voice leaks back
    into the inbound mic track, server-VAD interprets it as "user spoke",
    auto-creates a response, the agent replies to itself, repeat. We
    enforce half-duplex on the bridge: while the agent has a response
    in-flight (plus a grace window for the audio Twilio is still playing
    out and any trailing echo), we drop inbound media frames before they
    reach OpenAI, and we wipe OpenAI's input buffer when each response
    finishes so any leakage doesn't carry into the next turn.
    """
    import time as _time

    end_call_fired = asyncio.Event()
    # Echo of the agent's audio bouncing back through the phone line can
    # arrive several seconds after response.done, especially while Twilio is
    # still draining its playout buffer. 3 s catches both.
    POST_RESPONSE_GRACE_S = 3.0
    # Monotonic deadline; while now() < this, agent is "speaking" and we
    # mute the inbound side. +inf during active generation; a future
    # timestamp during the post-response grace window.
    state = {"agent_audio_until": 0.0}

    def is_agent_speaking() -> bool:
        return _time.monotonic() < state["agent_audio_until"]

    async def twilio_to_openai() -> None:
        try:
            while True:
                frame = await twilio_ws.receive_json()
                ev = frame.get("event")
                if ev == "media":
                    if is_agent_speaking():
                        continue  # half-duplex: don't feed echo to OpenAI
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
                    break
                # ignore "mark", "connected", anything else
        except WebSocketDisconnect:
            pass
        except Exception:
            pass

    async def openai_to_twilio() -> None:
        try:
            async for msg in openai_ws:
                try:
                    data = json.loads(msg)
                except (json.JSONDecodeError, TypeError):
                    continue

                et = data.get("type", "")

                if et == "response.created":
                    # Generation just started — block inbound audio
                    # indefinitely until response.done lifts the gate.
                    state["agent_audio_until"] = float("inf")
                    log.info("gate=closed (response.created) session=%s", session_id)

                elif et in ("response.done", "response.cancelled", "response.canceled"):
                    # Generation finished but Twilio is still playing the
                    # tail of the audio out to the user, and acoustic echo
                    # of that tail will arrive on the inbound track for a
                    # bit longer. Hold the gate for a grace window, then
                    # clear OpenAI's input buffer so any echo that slipped
                    # in during agent speech doesn't trigger a phantom
                    # turn.
                    state["agent_audio_until"] = (
                        _time.monotonic() + POST_RESPONSE_GRACE_S
                    )
                    log.info(
                        "gate=grace+%.1fs (%s) session=%s",
                        POST_RESPONSE_GRACE_S,
                        et,
                        session_id,
                    )
                    try:
                        await openai_ws.send(
                            json.dumps({"type": "input_audio_buffer.clear"})
                        )
                    except Exception:
                        pass

                elif et == "input_audio_buffer.committed":
                    # Server-VAD finished a user turn (we set
                    # create_response=False, so OpenAI does NOT auto-reply).
                    # Drive the response ourselves only if we're past the
                    # post-agent grace window — that way echo that slipped
                    # in just after response.done can't manufacture a phantom
                    # user turn that we'd then reply to.
                    if not is_agent_speaking():
                        log.info("user turn committed → response.create session=%s", session_id)
                        try:
                            await openai_ws.send(
                                json.dumps({"type": "response.create"})
                            )
                        except Exception:
                            pass
                    else:
                        log.info(
                            "user turn committed during gate (suppressed) session=%s",
                            session_id,
                        )

                elif et == "input_audio_buffer.speech_started":
                    log.info("speech_started session=%s gate_open=%s", session_id, not is_agent_speaking())

                if et in ("response.audio.delta", "response.output_audio.delta"):
                    delta = data.get("delta")
                    if delta:
                        await twilio_ws.send_json(
                            {
                                "event": "media",
                                "streamSid": stream_sid,
                                "media": {"payload": delta},
                            }
                        )

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
        except websockets.ConnectionClosed:
            pass
        except Exception:
            pass

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

    await asyncio.gather(
        twilio_to_openai(),
        openai_to_twilio(),
        hangup_after_end_call(),
        return_exceptions=True,
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

    await asyncio.gather(
        client_to_openai(), openai_to_client(), return_exceptions=True
    )


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
