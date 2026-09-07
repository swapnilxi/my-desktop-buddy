"""
Krishna routes — orchestrated chat, modes, persona, tools, events.

`POST /krishna/chat` is the main entry point and replaces the flat prompt
path for Krishna. The legacy `/chat` route is left untouched so the hamster
and panda buddies keep working exactly as before.
"""
from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from db import DEFAULT_USER_ID
from krishna import classify, list_modes, persona_summary
from krishna.events import EVENT_NAMES, bus
from krishna.motivation import celebration_signal, cue_for, failure_recovery_flow
from krishna.orchestrator import (
    NATIVE_TOOLS_ENABLED,
    create_session,
    delete_session,
    list_sessions,
    load_history,
    respond,
)
from krishna.presentation import Presentation
from tools import execute_tool, tool_catalog

router = APIRouter(prefix="/krishna", tags=["krishna"])


def _user(x_user_id: Optional[str]) -> str:
    return (x_user_id or DEFAULT_USER_ID).strip() or DEFAULT_USER_ID


class Msg(BaseModel):
    role: str
    content: str


class GitaContextRef(BaseModel):
    """One verse the user explicitly attached to the conversation (Add to Chat Context)."""

    chapter: int
    verse: int


class ChatRequest(BaseModel):
    message: str
    history: list[Msg] = Field(default_factory=list)
    mode: Optional[str] = None
    conversation_id: Optional[str] = None
    user_name: Optional[str] = None
    buddy_name: Optional[str] = None
    gita_context: list[GitaContextRef] = Field(default_factory=list)


@router.post("/chat")
async def krishna_chat(
    req: ChatRequest,
    x_user_id: Optional[str] = Header(None),
    x_gemini_key: Optional[str] = Header(None),
    x_deepseek_key: Optional[str] = Header(None),
    x_llm_provider: Optional[str] = Header(None),
    x_gemini_model: Optional[str] = Header(None),
    x_deepseek_model: Optional[str] = Header(None),
) -> dict[str, Any]:
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    client_keys: dict[str, str] = {}
    if x_gemini_key:
        client_keys["gemini_key"] = x_gemini_key.strip()
    if x_deepseek_key:
        client_keys["deepseek_key"] = x_deepseek_key.strip()

    client_models: dict[str, str] = {}
    if x_gemini_model:
        client_models["gemini_model"] = x_gemini_model.strip()
    if x_deepseek_model:
        client_models["deepseek_model"] = x_deepseek_model.strip()

    history = [m.model_dump() for m in req.history]
    # A client that tracks a session id no longer has to re-send the whole
    # transcript every turn — and voice callers cannot practically send one.
    if not history and req.conversation_id:
        history = load_history(_user(x_user_id), req.conversation_id)

    # Server-side cap regardless of what the client sends — the UI limits to 5
    # (Part 32), but the backend must not trust the client's cap alone.
    context_refs = [(r.chapter, r.verse) for r in req.gita_context][:5]

    try:
        reply = await respond(
            message=req.message,
            history=history,
            mode=req.mode,
            user_id=_user(x_user_id),
            user_name=req.user_name,
            buddy_name=req.buddy_name,
            conversation_id=req.conversation_id,
            client_provider=x_llm_provider,
            client_keys=client_keys or None,
            client_models=client_models or None,
            gita_context=context_refs or None,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"LLM error: {exc}")

    return reply.as_dict()


# ── Sessions (Part 1 of "New chat") ──────────────────────────────────────
class SessionRequest(BaseModel):
    title: Optional[str] = None
    mode: str = "friend"


@router.post("/sessions", status_code=201)
async def new_session(
    req: SessionRequest, x_user_id: Optional[str] = Header(None)
) -> dict[str, Any]:
    """
    Start a fresh conversation.

    Nothing is deleted — the previous session stays in history. This only
    means "start talking from a clean slate", which is what a New chat button
    should do.
    """
    return create_session(_user(x_user_id), title=req.title, mode=req.mode)


@router.get("/sessions")
async def sessions(
    limit: int = 20, x_user_id: Optional[str] = Header(None)
) -> dict[str, Any]:
    return {"sessions": list_sessions(_user(x_user_id), limit=limit)}


@router.get("/sessions/{conversation_id}")
async def session_messages(
    conversation_id: str, limit: int = 50, x_user_id: Optional[str] = Header(None)
) -> dict[str, Any]:
    user = _user(x_user_id)
    messages = load_history(user, conversation_id, limit=limit)
    if not messages:
        found = [s for s in list_sessions(user, limit=100) if s["id"] == conversation_id]
        if not found:
            raise HTTPException(status_code=404, detail="No such session for this user.")
    return {"conversation_id": conversation_id, "messages": messages}


@router.delete("/sessions/{conversation_id}", status_code=204)
async def remove_session(
    conversation_id: str, x_user_id: Optional[str] = Header(None)
):
    if not delete_session(_user(x_user_id), conversation_id):
        raise HTTPException(status_code=404, detail="No such session for this user.")


class ClassifyRequest(BaseModel):
    message: str
    mode: Optional[str] = None
    history_len: int = 0


@router.post("/classify")
async def classify_message(req: ClassifyRequest) -> dict[str, Any]:
    """
    Expose the classifier (Part 50).

    Useful for debugging why a reply took the shape it did, and for the UI to
    show mode/emotion hints before the reply lands.
    """
    return classify(req.message, mode=req.mode, history_len=req.history_len).as_dict()


@router.get("/modes")
async def modes() -> dict[str, Any]:
    from krishna.modes import time_context_for

    ctx = time_context_for()
    return {"modes": list_modes(), "time_context": {"id": ctx.id, "label": ctx.label}}


@router.get("/persona")
async def persona() -> dict[str, Any]:
    return persona_summary()


class MotivationRequest(BaseModel):
    message: str = ""
    intent: str = "conversation"
    emotion: str = "neutral"


@router.post("/motivation")
async def motivation(req: MotivationRequest) -> dict[str, Any]:
    """Contextual motivation cue (Part 35) — direction, not canned text."""
    return cue_for(req.intent, req.emotion, req.message).as_dict()


@router.get("/celebrate")
async def celebrate(magnitude: str = "normal") -> Presentation:
    """
    `celebration_signal` now returns the shared `Presentation` model (Part 63/70)
    rather than a hand-built dict, so this is declared as the real return type
    instead of `dict[str, Any]` — otherwise FastAPI validates the response
    against a plain-dict schema and rejects the model instance outright.
    """
    if magnitude not in {"small", "normal", "milestone"}:
        raise HTTPException(status_code=400,
                            detail="magnitude must be small, normal or milestone")
    return celebration_signal(magnitude)


@router.get("/failure-recovery")
async def failure_recovery() -> dict[str, Any]:
    return failure_recovery_flow()


@router.get("/tools")
async def tools() -> dict[str, Any]:
    return {
        "tools": tool_catalog(),
        "native_tool_calling_enabled": NATIVE_TOOLS_ENABLED,
        "note": (
            "Retrieval is performed deterministically by the backend on every turn. "
            "Native provider function calling for action tools is opt-in via the "
            "KRISHNA_NATIVE_TOOLS environment variable."
        ),
    }


class ToolRequest(BaseModel):
    name: str
    arguments: dict[str, Any] = Field(default_factory=dict)


@router.post("/tools/execute")
async def run_tool(
    req: ToolRequest, x_user_id: Optional[str] = Header(None)
) -> dict[str, Any]:
    """
    Explicit tool execution.

    Returns the result envelope as-is, including failures — a failed tool is a
    200 with ok=false, so callers can report the truth rather than an HTTP error
    that hides which tool failed and why.
    """
    return execute_tool(req.name, req.arguments, user_id=_user(x_user_id)).as_dict()


@router.get("/events")
async def events(limit: int = 25, name: Optional[str] = None) -> dict[str, Any]:
    """Recent events plus the shared event vocabulary (Part 64)."""
    if name and name not in EVENT_NAMES:
        raise HTTPException(status_code=400, detail=f"Unknown event name: {name}")
    return {"event_names": list(EVENT_NAMES), "recent": bus.recent(limit=limit, name=name)}
