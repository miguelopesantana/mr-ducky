from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Optional


@dataclass
class TwilioConfig:
    account_sid: str
    auth_token: str
    from_number: str
    public_base_url: str

    @property
    def public_wss_base(self) -> str:
        # PUBLIC_BASE_URL is https://...; Twilio's <Stream url=...> needs wss://
        if self.public_base_url.startswith("https://"):
            return "wss://" + self.public_base_url[len("https://"):]
        if self.public_base_url.startswith("http://"):
            return "ws://" + self.public_base_url[len("http://"):]
        return self.public_base_url


def load_twilio_config() -> Optional[TwilioConfig]:
    sid = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
    tok = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
    frm = os.getenv("TWILIO_FROM_NUMBER", "").strip()
    pub = os.getenv("PUBLIC_BASE_URL", "").strip().rstrip("/")
    if not (sid and tok and frm and pub):
        return None
    return TwilioConfig(
        account_sid=sid,
        auth_token=tok,
        from_number=frm,
        public_base_url=pub,
    )


def place_outbound_call(cfg: TwilioConfig, *, to_number: str, session_id: str) -> str:
    """Place an outbound call via Twilio REST. Returns the Call SID.

    Twilio fetches `{public_base_url}/voice/twiml/{session_id}` for TwiML,
    which tells it to open a Media Stream WS to our `/voice/stream/{id}`.
    """
    from twilio.rest import Client

    client = Client(cfg.account_sid, cfg.auth_token)
    twiml_url = f"{cfg.public_base_url}/voice/twiml/{session_id}"
    call = client.calls.create(
        to=to_number,
        from_=cfg.from_number,
        url=twiml_url,
        method="POST",
        # status_callback could be wired later for richer state tracking.
    )
    return call.sid


def hangup_call(cfg: TwilioConfig, call_sid: str) -> None:
    """Best-effort hangup via REST. Closing the WS also ends the call when
    we used <Connect>, so this is mostly a belt-and-suspenders fallback."""
    if not call_sid:
        return
    try:
        from twilio.rest import Client

        Client(cfg.account_sid, cfg.auth_token).calls(call_sid).update(
            status="completed"
        )
    except Exception:
        pass


def build_stream_twiml(cfg: TwilioConfig, session_id: str) -> str:
    """TwiML that opens a Media Stream to our WS for the duration of the call.

    `<Connect>` (vs `<Start>`) keeps the call alive until the stream ends.
    When our WS closes and there is no following TwiML verb, Twilio
    terminates the call — that's how the agent hangs up.
    """
    stream_url = f"{cfg.public_wss_base}/voice/stream/{session_id}"
    return (
        '<?xml version="1.0" encoding="UTF-8"?>'
        "<Response>"
        "<Connect>"
        f'<Stream url="{stream_url}" />'
        "</Connect>"
        "</Response>"
    )
