from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional

MAX_COUNTERS = 3


@dataclass
class NegotiationPolicy:
    """Server-side guardrails for the negotiation.

    The model can propose and accept offers via tool calls, but every
    proposal/acceptance is gated through this object. The walk-away
    threshold and counter cap live here, not in the prompt — prompts
    drift, servers don't.
    """

    walk_away_threshold_eur: float
    target_price_eur: float
    counter_rounds: int = 0
    best_offer_seen: Optional[float] = None
    last_counter: Optional[float] = None
    accepted_offer: Optional[dict] = None
    final_outcome: Optional[str] = None
    escalations: list[dict] = field(default_factory=list)

    def evaluate_counter(
        self, *, price_eur: float, justification: str
    ) -> dict[str, Any]:
        self.counter_rounds += 1
        self.last_counter = price_eur
        if self.counter_rounds > MAX_COUNTERS:
            return {
                "counter_round": self.counter_rounds,
                "max_counters": MAX_COUNTERS,
                "guidance": (
                    f"Já fizeste {self.counter_rounds} contra-propostas "
                    f"(máximo {MAX_COUNTERS}). Não voltes a propor — ou "
                    "aceitas a melhor oferta vista, ou termina com end_call."
                ),
            }
        return {
            "counter_round": self.counter_rounds,
            "max_counters": MAX_COUNTERS,
            "guidance": (
                "Contra-proposta registada. Apresenta-a ao operador agora, "
                "sem hesitar no valor. Justifica com a razão indicada."
            ),
        }

    def register_operator_offer(self, *, price_eur: float) -> dict[str, Any]:
        if self.best_offer_seen is None or price_eur < self.best_offer_seen:
            self.best_offer_seen = price_eur
        above_walk_away = price_eur > self.walk_away_threshold_eur
        at_or_below_target = price_eur <= self.target_price_eur
        if at_or_below_target:
            guidance = (
                f"{price_eur:.2f}€ está no target ou abaixo. Aceita já — "
                "chama accept_offer a seguir."
            )
        elif above_walk_away:
            guidance = (
                f"{price_eur:.2f}€ está acima do walk-away "
                f"({self.walk_away_threshold_eur:.2f}€). Recusa e força nova "
                "oferta — não chames accept_offer com este valor."
            )
        else:
            guidance = (
                f"{price_eur:.2f}€ está abaixo do walk-away. Decide pela "
                "árvore: contra-propor uma vez ou aceitar."
            )
        return {
            "registered": True,
            "best_offer_seen": self.best_offer_seen,
            "above_walk_away": above_walk_away,
            "guidance": guidance,
        }

    def evaluate_accept(
        self, *, price_eur: float, terms_summary: str
    ) -> dict[str, Any]:
        if self.best_offer_seen is None or price_eur < self.best_offer_seen:
            self.best_offer_seen = price_eur
        if price_eur > self.walk_away_threshold_eur:
            return {
                "accepted": False,
                "walk_away_threshold_eur": self.walk_away_threshold_eur,
                "guidance": (
                    f"{price_eur:.2f}€ está acima do walk-away "
                    f"({self.walk_away_threshold_eur:.2f}€). Recusa "
                    "educadamente. Lembra o que o teu amigo paga, ou pede "
                    "para falar com a equipa de retenção."
                ),
            }
        self.accepted_offer = {
            "price_eur": price_eur,
            "terms_summary": terms_summary,
        }
        self.final_outcome = "agreement"
        # Stronger nudge: if the agent is hesitating between accepting a
        # good offer and chasing a few more cents, the guidance should
        # make it explicit that this is a closed deal, do not reopen it.
        if price_eur <= self.target_price_eur:
            tier = (
                "Excelente — atingiste o target. Aceita já em voz alta, "
                "agradece, e chama end_call(outcome='agreement'). "
                "NÃO voltes a contrapropor."
            )
        else:
            tier = (
                f"Oferta abaixo do walk-away ({self.walk_away_threshold_eur:.2f}€) "
                f"e bem dentro do aceitável. Fecha agora — chasing mais uns "
                "cêntimos arrisca perder o acordo. Aceita em voz alta e "
                "chama end_call(outcome='agreement')."
            )
        return {"accepted": True, "guidance": tier}

    def escalate(self, *, reason: str) -> dict[str, Any]:
        self.escalations.append({"reason": reason})
        return {
            "escalated": True,
            "guidance": (
                "Diz ao operador que vais passar o telefone ao titular. "
                "Não inventes dados pessoais."
            ),
        }

    def finalize(
        self,
        outcome: str,
        final_price_eur: Optional[float] = None,
        notes: str = "",
    ) -> dict[str, Any]:
        self.final_outcome = outcome
        return {
            "finalized": True,
            "outcome": outcome,
            "final_price_eur": final_price_eur,
            "notes": notes,
        }

    def snapshot(self) -> dict[str, Any]:
        return {
            "walk_away_threshold_eur": self.walk_away_threshold_eur,
            "target_price_eur": self.target_price_eur,
            "counter_rounds": self.counter_rounds,
            "best_offer_seen": self.best_offer_seen,
            "last_counter": self.last_counter,
            "accepted_offer": self.accepted_offer,
            "final_outcome": self.final_outcome,
            "escalations": self.escalations,
        }
