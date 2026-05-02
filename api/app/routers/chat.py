"""Chat router: POST /chat (send message), GET/DELETE conversations, action confirm/reject."""
from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.core.errors import AppError, not_found
from app.core.routing import CamelRoute
from app.core.security import require_auth
from app.db.models import ChatMessage, Conversation, PendingAction
from app.deps import get_db, get_llm_client
from app.schemas.chat import (
    ActionConfirmation,
    ChatRequest,
    ChatResponse,
    ConversationDetail,
    ConversationList,
    ConversationSummary,
    PendingActionOut,
    StoredMessage,
    ToolTrace,
)
from app.services.chat.llm import LLMClient
from app.services.chat.orchestrator import expire_pending_action, run_turn
from app.services.chat.tools.writes import apply_action

router = APIRouter(
    dependencies=[Depends(require_auth)], route_class=CamelRoute
)


@router.post("", response_model=ChatResponse)
def send_message(
    body: ChatRequest,
    db: Session = Depends(get_db),
    llm: LLMClient = Depends(get_llm_client),
) -> ChatResponse:
    result = run_turn(
        db,
        llm,
        conversation_id=body.conversation_id,
        user_message=body.message,
    )
    return ChatResponse(
        message=result.message,
        conversation_id=result.conversation_id,
        traces=[
            ToolTrace(
                name=t.name,
                input=t.input,
                output=t.output,
                error=t.error,
                duration_ms=t.duration_ms,
            )
            for t in result.traces
        ],
        pending_actions=[
            PendingActionOut(
                id=a.id,
                tool=a.tool,
                summary=a.summary,
                args=a.args,
                expires_at=a.expires_at,
            )
            for a in result.pending_actions
        ],
    )


@router.get("/conversations", response_model=ConversationList)
def list_conversations(db: Session = Depends(get_db)) -> ConversationList:
    convs = (
        db.execute(select(Conversation).order_by(desc(Conversation.updated_at)))
        .scalars()
        .all()
    )
    items: list[ConversationSummary] = []
    for c in convs:
        last_user = (
            db.execute(
                select(ChatMessage.content)
                .where(
                    ChatMessage.conversation_id == c.id,
                    ChatMessage.role == "user",
                )
                .order_by(desc(ChatMessage.id))
                .limit(1)
            )
            .scalar_one_or_none()
        )
        items.append(
            ConversationSummary(
                id=c.id,
                title=c.title,
                updated_at=c.updated_at,
                last_user_message=last_user,
            )
        )
    return ConversationList(items=items)


@router.get("/conversations/{conversation_id}", response_model=ConversationDetail)
def get_conversation(
    conversation_id: str, db: Session = Depends(get_db)
) -> ConversationDetail:
    conv = db.get(Conversation, conversation_id)
    if conv is None:
        raise not_found("Conversation")
    msgs = (
        db.execute(
            select(ChatMessage)
            .where(ChatMessage.conversation_id == conv.id)
            .order_by(ChatMessage.id)
        )
        .scalars()
        .all()
    )
    return ConversationDetail(
        id=conv.id,
        title=conv.title,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        messages=[
            StoredMessage(
                id=m.id,
                role=m.role,
                content=m.content,
                tool_name=m.tool_name,
                pending_action_id=m.pending_action_id,
                created_at=m.created_at,
            )
            for m in msgs
        ],
    )


@router.delete(
    "/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT
)
def delete_conversation(conversation_id: str, db: Session = Depends(get_db)) -> None:
    conv = db.get(Conversation, conversation_id)
    if conv is None:
        raise not_found("Conversation")
    db.delete(conv)
    db.commit()


@router.post("/actions/{action_id}/confirm", response_model=ActionConfirmation)
def confirm_action(
    action_id: str, db: Session = Depends(get_db)
) -> ActionConfirmation:
    action = _load_action_or_404(db, action_id)
    if expire_pending_action(action):
        db.commit()
        raise AppError(
            code="ACTION_EXPIRED",
            message="This pending action has expired. Ask Mr Ducky again.",
            status_code=410,
        )
    if action.status != "pending":
        raise AppError(
            code="ACTION_NOT_PENDING",
            message=f"Action is already {action.status}",
            status_code=409,
        )

    try:
        result = apply_action(db, action.tool_name, action.args)
    except ValueError as exc:
        raise AppError(
            code="ACTION_FAILED",
            message=str(exc),
            status_code=409,
        ) from exc

    action.status = "confirmed"
    db.commit()
    return ActionConfirmation(id=action.id, status=action.status, result=result)


@router.post("/actions/{action_id}/reject", response_model=ActionConfirmation)
def reject_action(
    action_id: str, db: Session = Depends(get_db)
) -> ActionConfirmation:
    action = _load_action_or_404(db, action_id)
    if action.status == "pending":
        action.status = "rejected"
        db.commit()
    return ActionConfirmation(id=action.id, status=action.status)


def _load_action_or_404(db: Session, action_id: str) -> PendingAction:
    action = db.get(PendingAction, action_id)
    if action is None:
        raise not_found("Pending action")
    return action
