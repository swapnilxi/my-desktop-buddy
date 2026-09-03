"""
Chat orchestration — the pipeline every Krishna reply goes through.

    classify -> retrieve -> assemble prompt -> generate -> coordinate -> log

Retrieval is **deterministic by default**: the classifier decides what is
needed and this module fetches it directly, so a Gita citation cannot depend
on the model remembering to ask, and the whole path works offline (Part 69).

Native provider function calling is available for *actions* (create a task,
start a focus session) behind the KRISHNA_NATIVE_TOOLS flag. It is off by
default because it cannot be verified without live provider credentials; when
off, actions are still reachable through the explicit /tools/execute endpoint.
"""
from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from typing import Any, Optional

from db import DEFAULT_USER_ID, get_conn, new_id, now_iso
from krishna.events import (
    GITA_RETRIEVED,
    KRISHNA_MESSAGE_END,
    KRISHNA_MESSAGE_START,
    bus,
)
from krishna.intent import Classification, classify
from krishna.modes import resolve_mode
from krishna.motivation import celebration_signal, cue_for
from krishna.persona import build_system_prompt
from observability import RequestLog

NATIVE_TOOLS_ENABLED = os.getenv("KRISHNA_NATIVE_TOOLS", "").strip().lower() in {"1", "true", "yes"}
MAX_TOOL_ROUNDS = 2

# Action tools the model may invoke when native tool calling is on. Retrieval
# tools are deliberately excluded — those are already pre-fetched.
_ACTION_TOOLS = ("createTask", "listTasks", "completeTask", "startFocus", "endFocus", "saveMemory")

_THINK_TAG = re.compile(r"<think>.*?</think>", re.DOTALL | re.IGNORECASE)
_THINK_OPEN = re.compile(r"<think>.*$", re.DOTALL | re.IGNORECASE)
_STAGE_PREFIX = re.compile(r"^\s*(thought|thinking|action|observation|reasoning)\s*:\s*",
                           re.IGNORECASE | re.MULTILINE)
_STAGE_DIRECTION = re.compile(r"^\s*\*[^*\n]{0,80}\*\s*$", re.MULTILINE)


def clean_response(text: str) -> str:
    """Strip reasoning traces and stage directions (Part 2 output rules)."""
    if not text:
        return ""
    out = _THINK_TAG.sub("", text)
    out = _THINK_OPEN.sub("", out)
    out = _STAGE_PREFIX.sub("", out)
    out = _STAGE_DIRECTION.sub("", out)
    out = re.sub(r"\n{3,}", "\n\n", out)
    return out.strip()


@dataclass
class KrishnaReply:
    """Everything the frontend needs to present one reply (Parts 50, 63)."""

    response: str
    model: str
    mode: str
    intent: str
    emotion: str
    animation: str = "IDLE"
    chakra: str = "CALM"
    voice_mode: str = "NEUTRAL"
    mood: str = "speaking"
    particles: bool = False
    gita_used: list[dict[str, Any]] = field(default_factory=list)
    gita_invalid_message: Optional[str] = None
    tools_used: list[dict[str, Any]] = field(default_factory=list)
    memory_proposal: Optional[dict[str, Any]] = None
    memories_used: int = 0
    classification: dict[str, Any] = field(default_factory=dict)
    events: list[dict[str, Any]] = field(default_factory=list)
    safety_flags: list[str] = field(default_factory=list)
    request_id: str = ""

    def as_dict(self) -> dict[str, Any]:
        return {
            "response": self.response,
            "model": self.model,
            "mode": self.mode,
            "intent": self.intent,
            "emotion": self.emotion,
            "presentation": {
                "animation": self.animation,
                "chakra": self.chakra,
                "voiceMode": self.voice_mode,
                "particles": self.particles,
            },
            # kept for backward compatibility with the existing frontend
            "hamster_mood": self.mood,
            "gita_used": self.gita_used,
            "gita_invalid_message": self.gita_invalid_message,
            "tools_used": self.tools_used,
            "memory_proposal": self.memory_proposal,
            "memories_used": self.memories_used,
            "classification": self.classification,
            "events": self.events,
            "safety_flags": self.safety_flags,
            "request_id": self.request_id,
        }


# ── Presentation mapping (Part 63) ───────────────────────────────────────
def _presentation_for(c: Classification) -> dict[str, Any]:
    if c.intent == "celebration" or c.emotion == "celebrating":
        sig = celebration_signal("normal")
        return {"animation": sig["animation"], "chakra": sig["chakra"],
                "voice_mode": sig["voiceMode"], "mood": "happy",
                "particles": sig["particles"]}
    if c.urgency == "crisis":
        return {"animation": "IDLE", "chakra": "CALM", "voice_mode": "GENTLE",
                "mood": "listening", "particles": False}
    if c.mode == "focus":
        return {"animation": "FOCUSED", "chakra": "SLOW", "voice_mode": "SILENT",
                "mood": "focused", "particles": False}
    if c.mode == "meditation":
        return {"animation": "MEDITATING", "chakra": "BREATHE", "voice_mode": "SOFT",
                "mood": "idle", "particles": False}
    if c.emotion in {"sad", "anxious", "stressed", "tired"}:
        return {"animation": "IDLE", "chakra": "CALM", "voice_mode": "GENTLE",
                "mood": "speaking", "particles": False}
    if c.mode == "playful":
        return {"animation": "EXCITED", "chakra": "ACCELERATE", "voice_mode": "HAPPY",
                "mood": "excited", "particles": False}
    if c.needs_gita:
        return {"animation": "IDLE", "chakra": "GLOW", "voice_mode": "CALM",
                "mood": "speaking", "particles": False}
    return {"animation": "TALKING", "chakra": "CALM", "voice_mode": "NEUTRAL",
            "mood": "speaking", "particles": False}


# ── Retrieval ────────────────────────────────────────────────────────────
def _retrieve_gita(c: Classification, limit: int = 3) -> tuple[list[dict[str, Any]], Optional[str]]:
    """Fetch verses for this turn. Returns (results, invalid_reference_message)."""
    from gita import search

    if c.gita_reference is not None:
        ch, vs = c.gita_reference
        res = search(chapter=ch, verse=vs, limit=1)
    else:
        res = search(query=c.gita_query or "", limit=limit)

    if res.invalid_reference:
        return [], res.message

    enriched: list[dict[str, Any]] = []
    for r in res.results:
        from gita import get_verse

        lookup = get_verse(r.chapter, r.verse)
        item = r.model_dump()
        if lookup.found and lookup.verse is not None:
            item["commentaries"] = [
                {"author": cm.author, "text": cm.text, "source": cm.source_name}
                for cm in lookup.verse.commentaries
            ]
            item["applications"] = [a.text for a in lookup.verse.practical_application]
        enriched.append(item)
    return enriched, None


def _task_context() -> Optional[str]:
    from context import get_todos

    todos = get_todos()
    if not todos:
        return None
    pending = [t for t in todos if not t["completed"]]
    done = len(todos) - len(pending)
    lines = [f"  - {t['text']}" for t in pending[:10]]
    return (
        f"{len(pending)} pending, {done} completed.\n" + "\n".join(lines)
        if lines else f"All {done} task(s) complete."
    )


# ── Persistence ──────────────────────────────────────────────────────────
def _persist(user_id: str, conversation_id: Optional[str], user_msg: str,
             reply: str, c: Classification, tools: list[str]) -> str:
    from db import dump_json, ensure_user

    ensure_user(user_id)
    with get_conn() as conn:
        if conversation_id:
            exists = conn.execute(
                "SELECT id FROM conversations WHERE id = ? AND user_id = ?",
                (conversation_id, user_id),
            ).fetchone()
            if exists is None:
                conversation_id = None
        if not conversation_id:
            conversation_id = new_id()
            conn.execute(
                "INSERT INTO conversations (id, user_id, title, mode, created_at, updated_at)"
                " VALUES (?,?,?,?,?,?)",
                (conversation_id, user_id, user_msg[:60], c.mode, now_iso(), now_iso()),
            )
        for role, content in (("user", user_msg), ("assistant", reply)):
            conn.execute(
                "INSERT INTO messages (id, conversation_id, user_id, role, content,"
                " intent, emotion, mode, tools_used, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
                (new_id(), conversation_id, user_id, role, content,
                 c.intent if role == "user" else None,
                 c.emotion if role == "user" else None,
                 c.mode, dump_json(tools) if role == "assistant" else None, now_iso()),
            )
        conn.execute("UPDATE conversations SET updated_at = ? WHERE id = ?",
                     (now_iso(), conversation_id))
    return conversation_id


# ── The pipeline ─────────────────────────────────────────────────────────
async def respond(
    message: str,
    history: Optional[list[dict[str, str]]] = None,
    mode: Optional[str] = None,
    user_id: str = DEFAULT_USER_ID,
    user_name: Optional[str] = None,
    buddy_name: Optional[str] = None,
    conversation_id: Optional[str] = None,
    client_provider: Optional[str] = None,
    client_keys: Optional[dict[str, str]] = None,
    client_models: Optional[dict[str, str]] = None,
    persist: bool = True,
) -> KrishnaReply:
    history = history or []
    rlog = RequestLog(route="/krishna/chat", user_id=user_id)

    c = classify(message, mode=mode, history_len=len(history))
    rlog.intent, rlog.emotion, rlog.mode = c.intent, c.emotion, c.mode

    bus.emit(KRISHNA_MESSAGE_START, intent=c.intent, mode=c.mode)
    emitted: list[dict[str, Any]] = []

    # ── Retrieval ────────────────────────────────────────────────────────
    gita_results: list[dict[str, Any]] = []
    gita_invalid: Optional[str] = None
    if c.needs_gita or c.gita_reference is not None:
        gita_results, gita_invalid = _retrieve_gita(c)
        rlog.gita_retrieved = len(gita_results)
        if gita_results:
            rlog.tool("searchGita")
            ev = bus.emit(GITA_RETRIEVED,
                          references=[r.get("reference") for r in gita_results])
            emitted.append(ev.as_dict())

    memories: list[dict[str, Any]] = []
    try:
        import memory as M

        memories = M.recall_for_prompt(user_id)
        rlog.memories_retrieved = len(memories)
    except Exception:
        memories = []

    cue = cue_for(c.intent, c.emotion, message).as_dict() if c.needs_motivation else None

    system_prompt = build_system_prompt(
        classification=c, mode=c.mode, user_name=user_name, buddy_name=buddy_name,
        memories=memories, gita_results=gita_results, gita_invalid_message=gita_invalid,
        motivation_cue=cue,
        task_context=_task_context() if c.needs_task else None,
    )
    rlog.prompt_chars = len(system_prompt)

    messages = [{"role": m["role"], "content": m["content"]} for m in history]
    messages.append({"role": "user", "content": message})

    # ── Generation ───────────────────────────────────────────────────────
    tools_used: list[dict[str, Any]] = []
    text = ""
    adapter = None
    try:
        use_native = NATIVE_TOOLS_ENABLED and (
            c.needs_task or c.needs_timer or c.intent == "memory_write"
        )
        if use_native:
            text, adapter, tools_used = await _generate_with_tool_loop(
                messages, system_prompt, user_id, client_provider, client_keys, client_models
            )
        else:
            from llm.router import generate_with_fallback

            text, adapter = await generate_with_fallback(
                messages=messages, system_prompt=system_prompt,
                client_provider=client_provider, client_keys=client_keys,
                client_models=client_models,
            )
    except Exception as exc:
        rlog.fail(exc)
        rlog.close()
        bus.emit(KRISHNA_MESSAGE_END, ok=False)
        raise

    text = clean_response(text)
    rlog.response_chars = len(text)
    if adapter is not None:
        rlog.model = adapter.get_model_name()
    for t in tools_used:
        rlog.tool(t["name"])

    # ── Consent prompt surfaced to the UI (Part 27) ──────────────────────
    memory_proposal: Optional[dict[str, Any]] = None
    for t in tools_used:
        result = t.get("result") or {}
        if t["name"] == "saveMemory" and result.get("error") == "consent_required":
            memory_proposal = result.get("data")

    pres = _presentation_for(c)
    reply = KrishnaReply(
        response=text, model=adapter.get_model_name() if adapter else "unknown",
        mode=c.mode, intent=c.intent, emotion=c.emotion,
        animation=pres["animation"], chakra=pres["chakra"],
        voice_mode=pres["voice_mode"], mood=pres["mood"], particles=pres["particles"],
        gita_used=[
            {"reference": r.get("reference"), "chapter": r.get("chapter"),
             "verse": r.get("verse"), "verified": r.get("verified", False),
             "source": r.get("source"), "source_name": r.get("source_name")}
            for r in gita_results
        ],
        gita_invalid_message=gita_invalid,
        tools_used=tools_used, memory_proposal=memory_proposal,
        memories_used=len(memories), classification=c.as_dict(),
        safety_flags=c.safety_flags, request_id=rlog.request_id,
    )

    ev = bus.emit(KRISHNA_MESSAGE_END, ok=True, intent=c.intent)
    emitted.append(ev.as_dict())
    reply.events = emitted

    if persist:
        try:
            _persist(user_id, conversation_id, message, text, c,
                     [t["name"] for t in tools_used])
        except Exception:
            from observability import get_logger

            get_logger("orchestrator").warning("persist.failed", exc_info=True)

    rlog.close()
    return reply


async def _generate_with_tool_loop(
    messages: list[dict[str, str]],
    system_prompt: str,
    user_id: str,
    client_provider: Optional[str],
    client_keys: Optional[dict[str, str]],
    client_models: Optional[dict[str, str]],
) -> tuple[str, Any, list[dict[str, Any]]]:
    """
    Native tool-calling loop, bounded to MAX_TOOL_ROUNDS.

    Only action tools are offered; retrieval is already done. Every result is
    fed back verbatim — including failures — so the model is never in a
    position to report success for a tool that returned ok=False.
    """
    from llm.router import generate_turn_with_fallback
    from tools import REGISTRY, execute_tool

    tool_decls = [
        REGISTRY[name].declaration() for name in _ACTION_TOOLS if name in REGISTRY
    ]
    used: list[dict[str, Any]] = []
    prior: list[dict[str, Any]] = []
    adapter = None
    text = ""

    for _ in range(MAX_TOOL_ROUNDS):
        turn, adapter = await generate_turn_with_fallback(
            messages=messages, system_prompt=system_prompt, tools=tool_decls,
            client_provider=client_provider, client_keys=client_keys,
            client_models=client_models, tool_results=prior or None,
        )
        if not turn.tool_calls:
            text = turn.text
            break

        for call in turn.tool_calls:
            result = execute_tool(call.name, call.arguments, user_id=user_id)
            record = {"name": call.name, "arguments": call.arguments,
                      "result": result.as_dict()}
            used.append(record)
            prior.append(record)
        text = turn.text
    else:
        # Ran out of rounds while still calling tools — get a final answer
        # with the results in hand and no tools on the table.
        from llm.router import generate_with_fallback

        text, adapter = await generate_with_fallback(
            messages=messages,
            system_prompt=system_prompt + "\n\nTOOL RESULTS\n" + _summarize_tools(used),
            client_provider=client_provider, client_keys=client_keys,
            client_models=client_models,
        )

    return text, adapter, used


def _summarize_tools(used: list[dict[str, Any]]) -> str:
    lines = []
    for u in used:
        r = u.get("result") or {}
        status = "SUCCEEDED" if r.get("ok") else f"FAILED ({r.get('error')})"
        lines.append(f"  - {u['name']}: {status} — {r.get('message') or ''}")
    lines.append("Report only what actually succeeded.")
    return "\n".join(lines)
