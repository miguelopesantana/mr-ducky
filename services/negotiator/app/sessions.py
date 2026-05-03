from __future__ import annotations

import secrets
from dataclasses import dataclass
from typing import Optional

from pydantic import BaseModel

from .policy import NegotiationPolicy


class NegotiationContext(BaseModel):
    user_name: str
    operator_name: str
    plan_name: str
    current_price_eur: float
    tenure_years: int
    friend_price_eur: float
    target_price_eur: float
    walk_away_threshold_eur: float
    # Months left on the current loyalty period. 0 = out of contract (max
    # leverage — can switch immediately). 6-12 = typical mid-contract: still
    # negotiable, but operators will try to anchor a NEW long fidelity onto
    # any price change. The agent uses this to refuse fidelity extensions
    # beyond the current term.
    current_fidelity_remaining_months: int = 0
    # Identity-verification data the operator typically asks for at the
    # start of the call. The agent is the customer Francisca Laureano (or whoever
    # user_name is) and has these ready to recite when prompted.
    nif: str = ""
    address: str = ""
    # Auto-captured from Twilio's `From` header on inbound calls. Not
    # sensitive — it's the caller's own number.
    caller_phone: str = ""


@dataclass
class Session:
    id: str
    context: NegotiationContext
    policy: NegotiationPolicy
    # Set when the session is bound to a Twilio outbound call. Used by the
    # WS bridge to hang up cleanly when end_call fires.
    call_sid: Optional[str] = None
    to_number: Optional[str] = None


class SessionStore:
    def __init__(self) -> None:
        self._sessions: dict[str, Session] = {}

    def create(self, context: NegotiationContext) -> str:
        session_id = secrets.token_urlsafe(12)
        policy = NegotiationPolicy(
            walk_away_threshold_eur=context.walk_away_threshold_eur,
            target_price_eur=context.target_price_eur,
        )
        self._sessions[session_id] = Session(
            id=session_id, context=context, policy=policy
        )
        return session_id

    def get(self, session_id: str) -> Optional[Session]:
        return self._sessions.get(session_id)

    def discard(self, session_id: str) -> None:
        self._sessions.pop(session_id, None)
