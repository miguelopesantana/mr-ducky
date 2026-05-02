from __future__ import annotations

import asyncio
import json
import os
from pathlib import Path
from typing import Optional

import websockets
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from .realtime import OPENAI_REALTIME_MODEL, build_session_payload
from .sessions import NegotiationContext, SessionStore
from .tools import ToolCall, execute_tool
from .transcript import TranscriptStore

load_dotenv()

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
    return {"ok": True, "policy": session.policy.snapshot(), "transcript_files": paths}


@app.get("/health")
def health() -> dict:
    return {"ok": True}


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
