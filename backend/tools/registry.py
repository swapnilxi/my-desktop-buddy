"""
Tool registry and executor (Part 66).

Every tool returns a `ToolResult` with an explicit `ok` flag. Nothing here
ever returns a cheerful message for work that did not happen — a tool that
is declared but not yet wired reports `ok=False` with the reason, so the
model is told the action failed and cannot claim otherwise.

`enabled=False` tools are still declared to the model, because hiding them
would make Krishna answer "I can't do that at all" when the truthful answer
is "that isn't built yet".
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Callable, Optional

from db import DEFAULT_USER_ID, get_conn, new_id, now_iso
from observability import get_logger

log = get_logger("tools")


@dataclass
class ToolResult:
    ok: bool
    data: Any = None
    message: Optional[str] = None
    error: Optional[str] = None

    def as_dict(self) -> dict[str, Any]:
        out: dict[str, Any] = {"ok": self.ok}
        if self.data is not None:
            out["data"] = self.data
        if self.message:
            out["message"] = self.message
        if self.error:
            out["error"] = self.error
        return out


@dataclass
class ToolSpec:
    name: str
    description: str
    parameters: dict[str, Any]
    handler: Optional[Callable[..., ToolResult]] = None
    enabled: bool = True
    phase: int = 1
    required: list[str] = field(default_factory=list)

    def declaration(self) -> dict[str, Any]:
        desc = self.description
        if not self.enabled:
            desc += " (NOT YET AVAILABLE — calling this will fail; tell the user it isn't built yet.)"
        return {
            "name": self.name,
            "description": desc,
            "parameters": {
                "type": "object",
                "properties": self.parameters,
                "required": self.required,
            },
        }


def _str(desc: str) -> dict[str, Any]:
    return {"type": "string", "description": desc}


def _int(desc: str) -> dict[str, Any]:
    return {"type": "integer", "description": desc}


def _bool(desc: str) -> dict[str, Any]:
    return {"type": "boolean", "description": desc}


# ── Gita tools (Parts 7, 34) ─────────────────────────────────────────────
def _search_gita(query: str = "", chapter: Optional[int] = None, verse: Optional[int] = None,
                 theme: Optional[str] = None, language: str = "en", limit: int = 3,
                 **_: Any) -> ToolResult:
    from gita import search

    res = search(query=query, chapter=chapter, verse=verse, theme=theme,
                 language=language, limit=max(1, min(limit, 8)))
    payload = res.model_dump()
    if res.invalid_reference:
        return ToolResult(ok=False, error="invalid_reference", message=res.message, data=payload)
    if not res.results:
        return ToolResult(ok=True, data=payload, message=res.message or "No matching verse found.")
    return ToolResult(ok=True, data=payload)


def _get_gita_verse(chapter: int, verse: int, **_: Any) -> ToolResult:
    from gita import get_verse

    lookup = get_verse(chapter, verse)
    if lookup.invalid_reference:
        return ToolResult(ok=False, error="invalid_reference", message=lookup.message)
    if not lookup.found:
        return ToolResult(ok=False, error="not_in_knowledge_base", message=lookup.message)
    return ToolResult(ok=True, data=lookup.verse.model_dump())


# ── Memory tools (Part 27) ───────────────────────────────────────────────
def _save_memory(category: str, key: str, value: str, user_confirmed: bool = False,
                 user_id: str = DEFAULT_USER_ID, **_: Any) -> ToolResult:
    import memory as M

    try:
        if not user_confirmed:
            proposal = M.propose_memory(category=category, key=key, value=value, source="conversation")
            return ToolResult(
                ok=False, error="consent_required", data=proposal.as_dict(),
                message=(
                    "Not stored yet — ask the user whether to remember this, and tell "
                    "them you have not saved it."
                ),
            )
        res = M.save_memory(user_id=user_id, category=category, key=key, value=value,
                            user_confirmed=True, allow_sensitive=False)
    except ValueError as exc:
        return ToolResult(ok=False, error="invalid_input", message=str(exc))

    if not res.get("saved"):
        return ToolResult(ok=False, error=res.get("reason"), message=res.get("message"), data=res)

    from krishna.events import MEMORY_SAVED, bus

    bus.emit(MEMORY_SAVED, category=category, key=key)
    return ToolResult(ok=True, data=res["memory"], message="Memory saved.")


def _get_memory(query: Optional[str] = None, category: Optional[str] = None,
                user_id: str = DEFAULT_USER_ID, **_: Any) -> ToolResult:
    import memory as M

    try:
        rows = M.list_memories(user_id, category=category, include_sensitive=False)
    except ValueError as exc:
        return ToolResult(ok=False, error="invalid_input", message=str(exc))
    if query:
        q = query.lower()
        rows = [r for r in rows if q in r["key"].lower() or q in r["value"].lower()]
    if M.is_memory_paused(user_id):
        return ToolResult(ok=True, data=[], message="Memory is paused, so nothing was recalled.")
    return ToolResult(ok=True, data=rows, message=f"{len(rows)} memory item(s).")


def _delete_memory(memory_id: str, user_id: str = DEFAULT_USER_ID, **_: Any) -> ToolResult:
    import memory as M

    if M.delete_memory(user_id, memory_id):
        from krishna.events import MEMORY_DELETED, bus

        bus.emit(MEMORY_DELETED, memory_id=memory_id)
        return ToolResult(ok=True, message="Memory deleted.")
    return ToolResult(ok=False, error="not_found",
                      message="No such memory for this user — nothing was deleted.")


# ── Task tools — delegate to the EXISTING todo store, no second system ───
def _create_task(title: str, **_: Any) -> ToolResult:
    from context import add_todo

    title = (title or "").strip()
    if not title:
        return ToolResult(ok=False, error="invalid_input", message="A task needs a title.")
    todo = add_todo(title)
    return ToolResult(ok=True, data=todo, message=f"Task added: {todo['text']}")


def _list_tasks(status: Optional[str] = None, **_: Any) -> ToolResult:
    from context import get_todos

    todos = get_todos()
    if status == "completed":
        todos = [t for t in todos if t["completed"]]
    elif status in {"todo", "pending", "in_progress"}:
        todos = [t for t in todos if not t["completed"]]
    return ToolResult(ok=True, data=todos, message=f"{len(todos)} task(s).")


def _complete_task(task_id: int, **_: Any) -> ToolResult:
    from context import get_todos, toggle_todo

    try:
        tid = int(task_id)
    except (TypeError, ValueError):
        return ToolResult(ok=False, error="invalid_input", message="task_id must be a number.")

    existing = next((t for t in get_todos() if t["id"] == tid), None)
    if existing is None:
        return ToolResult(ok=False, error="not_found", message=f"No task with id {tid}.")
    if existing["completed"]:
        return ToolResult(ok=True, data=existing, message="That task was already done.")

    todo = toggle_todo(tid)
    from krishna.events import TASK_COMPLETED, bus

    bus.emit(TASK_COMPLETED, task_id=tid, title=todo["text"] if todo else None)
    return ToolResult(ok=True, data=todo, message="Task completed.")


# ── Focus session tools (Part 18 logging) ────────────────────────────────
def _start_focus(minutes: int = 25, activity: Optional[str] = None,
                 session_type: str = "focus", user_id: str = DEFAULT_USER_ID,
                 **_: Any) -> ToolResult:
    try:
        mins = int(minutes)
    except (TypeError, ValueError):
        return ToolResult(ok=False, error="invalid_input", message="minutes must be a number.")
    if not 1 <= mins <= 240:
        return ToolResult(ok=False, error="invalid_input",
                          message="Focus sessions run between 1 and 240 minutes.")

    from db import ensure_user

    ensure_user(user_id)
    sid = new_id()
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO focus_sessions (id, user_id, activity, planned_secs,"
            " session_type, started_at, completed) VALUES (?,?,?,?,?,?,0)",
            (sid, user_id, activity, mins * 60, session_type, now_iso()),
        )
    from krishna.events import FOCUS_STARTED, bus

    bus.emit(FOCUS_STARTED, session_id=sid, minutes=mins, activity=activity)
    return ToolResult(
        ok=True,
        data={"session_id": sid, "minutes": mins, "activity": activity, "session_type": session_type},
        message=f"{mins}-minute {session_type} session started.",
    )


def _end_focus(session_id: Optional[str] = None, completed: bool = True,
               user_id: str = DEFAULT_USER_ID, **_: Any) -> ToolResult:
    with get_conn() as conn:
        if session_id:
            row = conn.execute(
                "SELECT * FROM focus_sessions WHERE id = ? AND user_id = ?", (session_id, user_id)
            ).fetchone()
        else:
            row = conn.execute(
                "SELECT * FROM focus_sessions WHERE user_id = ? AND ended_at IS NULL"
                " ORDER BY started_at DESC LIMIT 1", (user_id,)
            ).fetchone()
        if row is None:
            return ToolResult(ok=False, error="not_found", message="No open focus session found.")

        from datetime import datetime

        started = datetime.fromisoformat(row["started_at"])
        ended = datetime.now(started.tzinfo)
        actual = max(0, int((ended - started).total_seconds()))
        conn.execute(
            "UPDATE focus_sessions SET ended_at = ?, actual_secs = ?, completed = ? WHERE id = ?",
            (ended.isoformat(), actual, 1 if completed else 0, row["id"]),
        )

    from krishna.events import FOCUS_COMPLETED, bus

    bus.emit(FOCUS_COMPLETED, session_id=row["id"], seconds=actual, completed=completed)
    return ToolResult(
        ok=True,
        data={"session_id": row["id"], "seconds": actual, "minutes": round(actual / 60, 1),
              "completed": completed},
        message=f"Session logged: {round(actual / 60, 1)} minutes.",
    )


# ── Daily summary (Parts 9, 10, 11) ──────────────────────────────────────
def _get_daily_summary(day: Optional[str] = None, user_id: str = DEFAULT_USER_ID,
                       **_: Any) -> ToolResult:
    from context import get_todos
    from gita.daily import get_daily_bundle

    bundle = get_daily_bundle(day)
    todos = get_todos()
    pending = [t for t in todos if not t["completed"]]

    with get_conn() as conn:
        row = conn.execute(
            "SELECT COALESCE(SUM(actual_secs), 0) AS secs, COUNT(*) AS n"
            " FROM focus_sessions WHERE user_id = ? AND session_type = 'focus'"
            " AND started_at >= date('now', 'start of day')",
            (user_id,),
        ).fetchone()

    return ToolResult(ok=True, data={
        "day": bundle["day"],
        "verse": bundle["verse"],
        "word": bundle["word"],
        "teaching": bundle["teaching"],
        "tasks": {"total": len(todos), "pending": len(pending),
                  "completed": len(todos) - len(pending),
                  "pending_titles": [t["text"] for t in pending[:8]]},
        "focus_today": {"sessions": row["n"], "minutes": round((row["secs"] or 0) / 60, 1)},
    })


def _not_available(tool_name: str, phase: int) -> Callable[..., ToolResult]:
    def handler(**_: Any) -> ToolResult:
        return ToolResult(
            ok=False, error="not_implemented",
            message=(
                f"{tool_name} is not built yet (planned for phase {phase}). "
                "Tell the user honestly that this feature isn't available — do not "
                "claim the action was done."
            ),
        )

    return handler


# ── The registry ─────────────────────────────────────────────────────────
_SPECS: list[ToolSpec] = [
    ToolSpec(
        "searchGita",
        "Search the Bhagavad Gita knowledge base by topic, feeling, theme or reference. "
        "Call this BEFORE mentioning any verse. Returns only verses that exist in the "
        "knowledge base, each with its source.",
        {
            "query": _str("What to search for — a topic, feeling or phrase"),
            "chapter": _int("Optional chapter (1-18)"),
            "verse": _int("Optional verse number"),
            "theme": _str("Optional theme filter, e.g. 'equanimity'"),
            "language": _str("Translation language, default 'en'"),
            "limit": _int("Max results, 1-8 (default 3)"),
        },
        handler=_search_gita,
    ),
    ToolSpec(
        "getGitaVerse",
        "Fetch one exact verse by chapter and verse, with Sanskrit, transliteration, "
        "translations, commentaries and sources. Reports invalid references rather than "
        "inventing a verse.",
        {"chapter": _int("Chapter 1-18"), "verse": _int("Verse number")},
        handler=_get_gita_verse, required=["chapter", "verse"],
    ),
    ToolSpec(
        "saveMemory",
        "Remember something about the user. Call with user_confirmed=false first to get "
        "a consent prompt; only call with user_confirmed=true after the user has agreed.",
        {
            "category": _str("One of PROFILE, PREFERENCE, GOAL, PROJECT, WORK, LEARNING, "
                             "HABIT, TASK, DECISION, CONVERSATION_CONTEXT"),
            "key": _str("Short stable identifier, e.g. 'interview_prep'"),
            "value": _str("The fact to remember"),
            "user_confirmed": _bool("True only if the user explicitly agreed to store this"),
        },
        handler=_save_memory, required=["category", "key", "value"],
    ),
    ToolSpec(
        "getMemory",
        "Recall what is stored about the user. Sensitive items are never returned here.",
        {"query": _str("Optional text filter"), "category": _str("Optional category filter")},
        handler=_get_memory,
    ),
    ToolSpec(
        "deleteMemory", "Delete one stored memory by its id.",
        {"memory_id": _str("The memory id to delete")},
        handler=_delete_memory, required=["memory_id"],
    ),
    ToolSpec(
        "createTask", "Add a task to the user's to-do list.",
        {"title": _str("What needs doing")},
        handler=_create_task, required=["title"],
    ),
    ToolSpec(
        "listTasks", "List the user's tasks.",
        {"status": _str("Filter: 'todo' or 'completed'")},
        handler=_list_tasks,
    ),
    ToolSpec(
        "completeTask", "Mark a task complete by its numeric id.",
        {"task_id": _int("The task id")},
        handler=_complete_task, required=["task_id"],
    ),
    ToolSpec(
        "startFocus", "Start and log a focus session.",
        {
            "minutes": _int("Length in minutes, 1-240 (default 25)"),
            "activity": _str("What they'll work on"),
            "session_type": _str("'focus' or 'break'"),
        },
        handler=_start_focus,
    ),
    ToolSpec(
        "endFocus", "End the current focus session and record the time spent.",
        {"session_id": _str("Optional session id; defaults to the open one"),
         "completed": _bool("Whether the session ran to completion")},
        handler=_end_focus,
    ),
    ToolSpec(
        "getDailySummary",
        "Today's verse, word of the day, teaching, task counts and focus time.",
        {"day": _str("Optional YYYY-MM-DD, defaults to today")},
        handler=_get_daily_summary,
    ),
    # Declared so Krishna can answer honestly about them, but disabled.
    ToolSpec("createGoal", "Create a long-term goal with milestones.",
             {"name": _str("Goal name"), "reason": _str("Why it matters"),
              "deadline": _str("Target date")},
             handler=_not_available("createGoal", 2), enabled=False, phase=2),
    ToolSpec("updateGoal", "Update progress on a goal.",
             {"goal_id": _str("Goal id"), "progress": _int("Percent 0-100")},
             handler=_not_available("updateGoal", 2), enabled=False, phase=2),
    ToolSpec("logHabit", "Log a habit for today.",
             {"habit": _str("Habit name"), "done": _bool("Whether it was done")},
             handler=_not_available("logHabit", 2), enabled=False, phase=2),
    ToolSpec("createReminder", "Schedule a reminder.",
             {"text": _str("What to remind about"), "when": _str("When to fire")},
             handler=_not_available("createReminder", 3), enabled=False, phase=3),
    ToolSpec("searchWeb", "Search the web for current information.",
             {"query": _str("Search query")},
             handler=_not_available("searchWeb", 5), enabled=False, phase=5),
]

REGISTRY: dict[str, ToolSpec] = {s.name: s for s in _SPECS}


def tool_catalog(include_disabled: bool = True) -> list[dict[str, Any]]:
    return [
        {"name": s.name, "description": s.description, "enabled": s.enabled,
         "phase": s.phase, "parameters": list(s.parameters.keys())}
        for s in REGISTRY.values()
        if include_disabled or s.enabled
    ]


def gemini_declarations(include_disabled: bool = True) -> list[dict[str, Any]]:
    """Function declarations in Gemini's expected shape."""
    return [
        s.declaration() for s in REGISTRY.values() if include_disabled or s.enabled
    ]


def openai_declarations(include_disabled: bool = True) -> list[dict[str, Any]]:
    """Function declarations in the OpenAI/DeepSeek tools shape."""
    return [
        {"type": "function", "function": s.declaration()}
        for s in REGISTRY.values()
        if include_disabled or s.enabled
    ]


def execute_tool(name: str, arguments: Optional[dict[str, Any]] = None,
                 user_id: str = DEFAULT_USER_ID) -> ToolResult:
    """
    Run a tool by name. Never raises — a failure comes back as ok=False so
    the model is told the truth about what happened.
    """
    spec = REGISTRY.get(name)
    if spec is None:
        return ToolResult(ok=False, error="unknown_tool",
                          message=f"There is no tool called {name!r}.")
    if spec.handler is None:
        return ToolResult(ok=False, error="not_implemented",
                          message=f"{name} has no implementation.")

    args = dict(arguments or {})
    missing = [r for r in spec.required if args.get(r) in (None, "")]
    if missing:
        return ToolResult(ok=False, error="missing_arguments",
                          message=f"{name} needs: {', '.join(missing)}.")

    args.setdefault("user_id", user_id)
    try:
        result = spec.handler(**args)
    except TypeError as exc:
        return ToolResult(ok=False, error="bad_arguments", message=f"{name}: {exc}")
    except Exception as exc:
        log.error("tool.failed", extra={"fields": {"tool": name, "error": str(exc)}})
        return ToolResult(ok=False, error="tool_error",
                          message=f"{name} failed: {exc}")

    log.info("tool.executed", extra={"fields": {"tool": name, "ok": result.ok,
                                                "error": result.error}})
    return result
