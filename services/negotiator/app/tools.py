from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .policy import NegotiationPolicy
from .sessions import NegotiationContext


@dataclass
class ToolCall:
    name: str
    arguments: dict
    call_id: str


OPENAI_TOOL_DEFS: list[dict] = [
    {
        "type": "function",
        "name": "get_user_context",
        "description": (
            "Devolve o contexto do utilizador: tarifário, preço actual, anos "
            "como cliente, preço-alvo e walk-away. Chama isto no início da "
            "chamada para te orientares."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
    {
        "type": "function",
        "name": "propose_counter",
        "description": (
            "Regista uma contra-proposta antes de a dizeres em voz alta. O "
            "servidor responde com guidance se o valor é razoável. Não chames "
            "mais de 3 vezes."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "price_eur": {
                    "type": "number",
                    "description": "Preço mensal proposto em euros.",
                },
                "justification": {
                    "type": "string",
                    "description": (
                        "Razão curta (ex: 'amigo paga 8€', "
                        "'concorrência da NOS')."
                    ),
                },
            },
            "required": ["price_eur", "justification"],
        },
    },
    {
        "type": "function",
        "name": "register_operator_offer",
        "description": (
            "Regista o valor concreto que o operador acabou de apresentar, "
            "ANTES de decidires o que fazer com ele. Chama isto sempre que o "
            "operador disser um preço — mesmo que esteja acima do walk-away "
            "e nem penses em aceitar. Serve para o sistema saber qual foi a "
            "melhor oferta vista. Não substitui accept_offer."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "price_eur": {
                    "type": "number",
                    "description": (
                        "Preço mensal em euros que o operador propôs."
                    ),
                },
            },
            "required": ["price_eur"],
        },
    },
    {
        "type": "function",
        "name": "accept_offer",
        "description": (
            "Aceita formalmente uma oferta do operador. O servidor recusa se "
            "o preço estiver acima do walk-away — nesse caso continuas a "
            "negociar."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "price_eur": {"type": "number"},
                "terms_summary": {
                    "type": "string",
                    "description": (
                        "Resumo dos termos: fidelização, canais incluídos, "
                        "etc."
                    ),
                },
            },
            "required": ["price_eur", "terms_summary"],
        },
    },
    {
        "type": "function",
        "name": "escalate_to_user",
        "description": (
            "Sinaliza que precisas que o utilizador humano tome conta da "
            "chamada (ex: pediram verificação por SMS, password, ou outro "
            "dado que não tens)."
        ),
        "parameters": {
            "type": "object",
            "properties": {"reason": {"type": "string"}},
            "required": ["reason"],
        },
    },
    {
        "type": "function",
        "name": "end_call",
        "description": "Termina a chamada com um resultado estruturado.",
        "parameters": {
            "type": "object",
            "properties": {
                "outcome": {
                    "type": "string",
                    "enum": [
                        "agreement",
                        "no_agreement",
                        "callback_scheduled",
                        "escalated",
                    ],
                },
                "final_price_eur": {"type": "number"},
                "notes": {"type": "string"},
            },
            "required": ["outcome"],
        },
    },
]


def execute_tool(
    call: ToolCall,
    *,
    context: NegotiationContext,
    policy: NegotiationPolicy,
) -> dict[str, Any]:
    name = call.name
    args = call.arguments or {}

    if name == "get_user_context":
        return {
            "user_name": context.user_name,
            "operator_name": context.operator_name,
            "plan_name": context.plan_name,
            "current_price_eur": context.current_price_eur,
            "tenure_years": context.tenure_years,
            "friend_price_eur": context.friend_price_eur,
            "target_price_eur": context.target_price_eur,
            "walk_away_threshold_eur": context.walk_away_threshold_eur,
            "current_fidelity_remaining_months": context.current_fidelity_remaining_months,
        }
    if name == "propose_counter":
        return policy.evaluate_counter(
            price_eur=float(args.get("price_eur", 0)),
            justification=str(args.get("justification", "")),
        )
    if name == "register_operator_offer":
        return policy.register_operator_offer(
            price_eur=float(args.get("price_eur", 0)),
        )
    if name == "accept_offer":
        return policy.evaluate_accept(
            price_eur=float(args.get("price_eur", 0)),
            terms_summary=str(args.get("terms_summary", "")),
        )
    if name == "escalate_to_user":
        return policy.escalate(reason=str(args.get("reason", "")))
    if name == "end_call":
        final_price = args.get("final_price_eur")
        return policy.finalize(
            outcome=str(args.get("outcome", "ended")),
            final_price_eur=(
                float(final_price) if final_price is not None else None
            ),
            notes=str(args.get("notes", "")),
        )
    return {"error": f"unknown tool: {name}"}
