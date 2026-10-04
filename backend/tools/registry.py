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


# ── Task tools — the unified `tasks` table (Phase 1, section 1) ──────────
def _tool_task(task: dict[str, Any]) -> dict[str, Any]:
    """
    Task payload for the model.

    `text` and `completed` are kept alongside the real fields because the
    legacy tool contract used them, and a rename would silently break every
    caller that already speaks that shape.
    """
    return {**task, "text": task["title"], "completed": task["status"] == "COMPLETED"}


def _create_task(title: str, description: Optional[str] = None,
                 priority: Optional[str] = None, due_date: Optional[str] = None,
                 estimated_minutes: Optional[int] = None, goal_id: Optional[str] = None,
                 parent_task_id: Optional[str] = None, tags: Any = None,
                 user_id: str = DEFAULT_USER_ID, **_: Any) -> ToolResult:
    from productivity import TaskError
    from productivity import tasks as T

    T.ensure_migrated(user_id)
    try:
        task = T.create_task(
            user_id, title=title, description=description, priority=priority,
            due_date=due_date, estimated_minutes=estimated_minutes,
            goal_id=goal_id, parent_task_id=parent_task_id, tags=tags,
        )
    except TaskError as exc:
        return ToolResult(ok=False, error="invalid_input", message=str(exc))
    return ToolResult(ok=True, data=_tool_task(task),
                      message=f"Task added: {task['title']} (#{task['seq']}).")


def _list_tasks(status: Optional[str] = None, goal_id: Optional[str] = None,
                user_id: str = DEFAULT_USER_ID, **_: Any) -> ToolResult:
    from productivity import TaskError
    from productivity import tasks as T

    T.ensure_migrated(user_id)
    filt = status
    if status in {"todo", "pending", "in_progress", "open"}:
        filt = "open"
    try:
        rows = T.list_tasks(user_id, status=filt, goal_id=goal_id)
    except TaskError as exc:
        return ToolResult(ok=False, error="invalid_input", message=str(exc))
    return ToolResult(ok=True, data=[_tool_task(t) for t in rows],
                      message=f"{len(rows)} task(s).")


def _complete_task(task_id: Any = None, user_id: str = DEFAULT_USER_ID,
                   **_: Any) -> ToolResult:
    from productivity import tasks as T

    T.ensure_migrated(user_id)
    if task_id in (None, ""):
        return ToolResult(ok=False, error="missing_arguments",
                          message="completeTask needs a task_id.")

    existing = T.get_task(user_id, task_id)
    if existing is None:
        return ToolResult(ok=False, error="not_found", message=f"No task with id {task_id}.")
    if existing["status"] == "COMPLETED":
        return ToolResult(ok=True, data=_tool_task(existing),
                          message="That task was already done.")

    task = T.complete_task(user_id, task_id)
    from krishna.events import TASK_COMPLETED, bus

    bus.emit(TASK_COMPLETED, task_id=task["id"], title=task["title"])
    return ToolResult(ok=True, data=_tool_task(task), message="Task completed.")


def _update_task(task_id: Any = None, user_id: str = DEFAULT_USER_ID,
                 **fields: Any) -> ToolResult:
    from productivity import TaskError
    from productivity import tasks as T

    T.ensure_migrated(user_id)
    if task_id in (None, ""):
        return ToolResult(ok=False, error="missing_arguments",
                          message="updateTask needs a task_id.")
    patch = {k: v for k, v in fields.items()
             if k in {"title", "description", "status", "priority", "due_date",
                      "estimated_minutes", "goal_id"} and v is not None}
    if not patch:
        return ToolResult(ok=False, error="invalid_input",
                          message="updateTask needs at least one field to change.")
    try:
        task = T.update_task(user_id, task_id, **patch)
    except TaskError as exc:
        return ToolResult(ok=False, error="invalid_input", message=str(exc))
    if task is None:
        return ToolResult(ok=False, error="not_found", message=f"No task with id {task_id}.")
    return ToolResult(ok=True, data=_tool_task(task),
                      message=f"Updated: {', '.join(sorted(patch))}.")


# ── Goal tools (Phase 1, section 2) ──────────────────────────────────────
def _create_goal(title: Optional[str] = None, name: Optional[str] = None,
                 description: Optional[str] = None, reason: Optional[str] = None,
                 category: Optional[str] = None, target_date: Optional[str] = None,
                 deadline: Optional[str] = None, milestones: Any = None,
                 user_id: str = DEFAULT_USER_ID, **_: Any) -> ToolResult:
    from productivity import GoalError
    from productivity import goals as G

    # `name`/`reason`/`deadline` are the argument names the earlier (disabled)
    # declaration used; accepting both keeps an older caller working.
    try:
        goal = G.create_goal(
            user_id, title=title or name or "", description=description or reason,
            category=category, target_date=target_date or deadline,
            milestones=list(milestones) if isinstance(milestones, (list, tuple)) else None,
        )
    except GoalError as exc:
        return ToolResult(ok=False, error="invalid_input", message=str(exc))
    return ToolResult(ok=True, data=goal, message=f"Goal created: {goal['title']}.")


def _update_goal(goal_id: Optional[str] = None, progress: Any = None,
                 status: Optional[str] = None, title: Optional[str] = None,
                 target_date: Optional[str] = None, description: Optional[str] = None,
                 user_id: str = DEFAULT_USER_ID, **_: Any) -> ToolResult:
    from productivity import GoalError
    from productivity import goals as G

    if not goal_id:
        return ToolResult(ok=False, error="missing_arguments",
                          message="updateGoal needs a goal_id.")
    patch = {k: v for k, v in
             {"progress": progress, "status": status, "title": title,
              "target_date": target_date, "description": description}.items()
             if v is not None}
    if not patch:
        return ToolResult(ok=False, error="invalid_input",
                          message="updateGoal needs at least one field to change.")
    try:
        goal = G.update_goal(user_id, goal_id, **patch)
    except GoalError as exc:
        return ToolResult(ok=False, error="invalid_input", message=str(exc))
    if goal is None:
        return ToolResult(ok=False, error="not_found",
                          message="No such goal for this user — nothing was updated.")
    return ToolResult(ok=True, data=goal,
                      message=f"{goal['title']} is now at {goal['progress']}%.")


def _link_task_to_goal(task_id: Any = None, goal_id: Optional[str] = None,
                       user_id: str = DEFAULT_USER_ID, **_: Any) -> ToolResult:
    from productivity import GoalError
    from productivity import goals as G

    if not task_id or not goal_id:
        return ToolResult(ok=False, error="missing_arguments",
                          message="linkTaskToGoal needs both task_id and goal_id.")
    try:
        task = G.link_task(user_id, task_id, goal_id)
    except GoalError as exc:
        return ToolResult(ok=False, error="invalid_input", message=str(exc))
    if task is None:
        return ToolResult(ok=False, error="not_found", message="No such task for this user.")
    return ToolResult(ok=True, data=_tool_task(task), message="Task linked to the goal.")


# ── Habit tools (Phase 1, section 3) ─────────────────────────────────────
def _log_habit(habit: Optional[str] = None, habit_id: Optional[str] = None,
               done: bool = True, day: Optional[str] = None, note: Optional[str] = None,
               user_id: str = DEFAULT_USER_ID, **_: Any) -> ToolResult:
    from productivity import HabitError
    from productivity import habits as H

    ref = habit_id or habit
    if not ref:
        return ToolResult(ok=False, error="missing_arguments",
                          message="logHabit needs a habit name or id.")
    try:
        result = H.log_habit(user_id, ref, day=day, done=done, note=note)
        created = False
        if result is None:
            # Logging a habit nobody created yet is a normal thing to say out
            # loud; creating it is more useful than refusing.
            H.create_habit(user_id, name=str(ref))
            result = H.log_habit(user_id, ref, day=day, done=done, note=note)
            created = True
    except HabitError as exc:
        return ToolResult(ok=False, error="invalid_input", message=str(exc))
    if result is None:
        return ToolResult(ok=False, error="not_found",
                          message=f"Could not log {ref!r} — nothing was recorded.")

    prefix = f"Created the habit “{result['name']}” and logged it. " if created else ""
    streak = (f"{result['streak']}-day streak." if result["streak"]
              else "Streak starts again from here.")
    return ToolResult(ok=True, data=result, message=f"{prefix}{streak}")


def _create_habit(name: Optional[str] = None, emoji: Optional[str] = None,
                  frequency: Optional[str] = None,
                  user_id: str = DEFAULT_USER_ID, **_: Any) -> ToolResult:
    from productivity import HabitError
    from productivity import habits as H

    try:
        habit = H.create_habit(user_id, name=name or "", emoji=emoji, frequency=frequency)
    except HabitError as exc:
        return ToolResult(ok=False, error="invalid_input", message=str(exc))
    return ToolResult(ok=True, data=habit, message=f"Habit created: {habit['name']}.")


# ── Reminder tool (Phase 1, section 12) ──────────────────────────────────
def _create_reminder(text: Optional[str] = None, when: Optional[str] = None,
                     remind_at: Optional[str] = None, task_id: Optional[str] = None,
                     user_id: str = DEFAULT_USER_ID, **_: Any) -> ToolResult:
    from productivity import ReminderError
    from productivity import reminders as R

    try:
        reminder = R.create_reminder(user_id, text=text or "",
                                     remind_at=remind_at or when, task_id=task_id)
    except ReminderError as exc:
        return ToolResult(ok=False, error="invalid_input", message=str(exc))
    return ToolResult(
        ok=True, data=reminder,
        message=(
            "Reminder saved. Be clear with the user that it will appear on their "
            "Today screen when it is due — this build has no scheduler and cannot "
            "send them a notification."
        ),
    )


# ── Focus session tools (Part 18 logging, extended in Phase 1 section 4) ─
def _start_focus(minutes: int = 25, activity: Optional[str] = None,
                 session_type: str = "focus", mode: Optional[str] = None,
                 task_id: Optional[str] = None, goal_id: Optional[str] = None,
                 intended: Optional[str] = None, user_id: str = DEFAULT_USER_ID,
                 **_: Any) -> ToolResult:
    from productivity import FocusError
    from productivity import focus as F

    try:
        session = F.start_session(
            user_id, minutes=minutes, activity=activity, mode=mode,
            task_id=task_id, goal_id=goal_id, intended=intended,
            session_type=session_type,
        )
    except FocusError as exc:
        return ToolResult(ok=False, error="invalid_input", message=str(exc))

    from krishna.events import FOCUS_STARTED, bus

    bus.emit(FOCUS_STARTED, session_id=session["id"],
             minutes=session["planned_minutes"], activity=activity)
    return ToolResult(
        ok=True,
        data={"session_id": session["id"], "minutes": session["planned_minutes"],
              "activity": activity, "session_type": session["session_type"],
              "mode": session["category"], "task_id": session["task_id"]},
        message=f"{session['planned_minutes']:g}-minute {session['session_type']} session started.",
    )


def _end_focus(session_id: Optional[str] = None, completed: bool = True,
               reflection: Optional[str] = None, finished_intent: Optional[bool] = None,
               user_id: str = DEFAULT_USER_ID, **_: Any) -> ToolResult:
    from productivity import FocusError
    from productivity import focus as F

    try:
        session = F.end_session(user_id, session_id=session_id, completed=completed,
                                reflection=reflection, finished_intent=finished_intent)
    except FocusError as exc:
        return ToolResult(ok=False, error="invalid_input", message=str(exc))
    if session is None:
        return ToolResult(ok=False, error="not_found", message="No open focus session found.")

    from krishna.events import FOCUS_COMPLETED, bus

    minutes = session.get("actual_minutes") or 0
    bus.emit(FOCUS_COMPLETED, session_id=session["id"],
             seconds=session.get("actual_secs"), completed=completed)
    return ToolResult(
        ok=True,
        data={"session_id": session["id"], "seconds": session.get("actual_secs"),
              "minutes": minutes, "completed": session["completed"],
              "reflection_prompt": F.reflection_prompt(session)},
        message=(
            f"Session logged: {minutes:g} minutes. That records time spent, not that "
            "the work is done — ask them how it actually went."
        ),
    )


# ── Planning, review and insight tools (sections 6, 8, 9) ────────────────
def _plan_my_day(available_minutes: Optional[int] = None, save: bool = False,
                 user_id: str = DEFAULT_USER_ID, **_: Any) -> ToolResult:
    from productivity import TaskError
    from productivity import planning as P

    try:
        plan = P.build_plan(user_id, available_minutes=available_minutes)
    except TaskError as exc:
        return ToolResult(ok=False, error="invalid_input", message=str(exc))
    if save:
        P.save_plan(user_id, plan["day"], plan["blocks"])
    if plan["empty"]:
        return ToolResult(ok=True, data=plan,
                          message="There are no open tasks to plan around today.")
    return ToolResult(
        ok=True, data=plan,
        message=(
            f"{plan['planned_minutes']} of {plan['available_minutes']} minutes "
            f"scheduled, {plan['buffer_minutes']} left as buffer."
        ),
    )


def _weekly_review(day: Optional[str] = None, user_id: str = DEFAULT_USER_ID,
                   **_: Any) -> ToolResult:
    from productivity import review as RV

    data = RV.weekly_review(user_id, day)
    if not data["has_data"]:
        return ToolResult(
            ok=True, data=data,
            message=("Nothing was recorded this week. Say that plainly rather than "
                     "producing a review."),
        )
    return ToolResult(ok=True, data=data, message=(
        f"{data['tasks_completed']} task(s) completed, {data['focus_hours']} focus hours."
    ))


def _get_insights(days: int = 30, user_id: str = DEFAULT_USER_ID, **_: Any) -> ToolResult:
    from productivity import insights as I

    try:
        data = I.generate(user_id, days=days)
    except ValueError as exc:
        return ToolResult(ok=False, error="invalid_input", message=str(exc))
    if not data["insights"]:
        return ToolResult(ok=True, data=data, message=data["message"])
    return ToolResult(ok=True, data=data,
                      message=f"{len(data['insights'])} data-backed observation(s).")


def _log_time(minutes: float = 0, task_id: Optional[str] = None,
              category: Optional[str] = None, description: Optional[str] = None,
              user_id: str = DEFAULT_USER_ID, **_: Any) -> ToolResult:
    from productivity import FocusError
    from productivity import timetracking as TT

    try:
        entry = TT.log_entry(user_id, minutes=minutes, task_id=task_id,
                             category=category, description=description)
    except FocusError as exc:
        return ToolResult(ok=False, error="invalid_input", message=str(exc))
    return ToolResult(ok=True, data=entry,
                      message=f"Logged {round(entry['seconds'] / 60, 1)} minutes.")


# ── Daily summary (Parts 9, 10, 11 + Phase 1 productivity numbers) ──────
def _get_daily_summary(day: Optional[str] = None, user_id: str = DEFAULT_USER_ID,
                       **_: Any) -> ToolResult:
    from gita.daily import get_daily_bundle
    from productivity import stats as S
    from productivity import tasks as T

    T.ensure_migrated(user_id)
    bundle = get_daily_bundle(day)
    counts = T.counts(user_id)
    pending = T.list_tasks(user_id, status="open", include_subtasks=False)

    from productivity import timetracking as TT

    start, end = TT.day_bounds(day)
    focus = S._focus_summary(user_id, start, end)

    return ToolResult(ok=True, data={
        "day": bundle["day"],
        "verse": bundle["verse"],
        "word": bundle["word"],
        "teaching": bundle["teaching"],
        "tasks": {"total": counts["total"], "pending": counts["open"],
                  "completed": counts["completed"],
                  "pending_titles": [t["title"] for t in pending[:8]]},
        "focus_today": {"sessions": focus["sessions_today"],
                        "minutes": focus["minutes_today"]},
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
    # ── Tasks (Phase 1, section 1) ──────────────────────────────────────
    ToolSpec(
        "createTask",
        "Add a task. Use priority and estimated_minutes when the user gives you "
        "something to go on — never invent a deadline they did not mention.",
        {
            "title": _str("What needs doing"),
            "description": _str("Optional detail"),
            "priority": _str("LOW, MEDIUM, HIGH or CRITICAL"),
            "due_date": _str("Optional YYYY-MM-DD — only if the user said one"),
            "estimated_minutes": _int("Optional estimate in minutes"),
            "goal_id": _str("Optional goal this task serves"),
            "parent_task_id": _str("Optional parent task id, to make this a subtask"),
        },
        handler=_create_task, required=["title"],
    ),
    ToolSpec(
        "listTasks", "List the user's tasks, newest priorities first.",
        {"status": _str("Filter: 'open', 'todo', 'in_progress', 'completed' or 'cancelled'"),
         "goal_id": _str("Optional: only tasks serving this goal")},
        handler=_list_tasks,
    ),
    ToolSpec(
        "completeTask", "Mark a task complete. Idempotent — never toggles it back.",
        {"task_id": _str("The task id, or the number shown next to it in a list")},
        handler=_complete_task, required=["task_id"],
    ),
    ToolSpec(
        "updateTask",
        "Change a task: its priority, due date, estimate, status or title. This is "
        "how you make a task smaller when someone is stuck on it.",
        {
            "task_id": _str("The task id, or the number shown in a list"),
            "title": _str("New title"),
            "status": _str("TODO, IN_PROGRESS, COMPLETED or CANCELLED"),
            "priority": _str("LOW, MEDIUM, HIGH or CRITICAL"),
            "due_date": _str("YYYY-MM-DD"),
            "estimated_minutes": _int("Estimate in minutes"),
            "goal_id": _str("Attach the task to this goal"),
        },
        handler=_update_task, required=["task_id"],
    ),
    # ── Goals (Phase 1, section 2) ──────────────────────────────────────
    ToolSpec(
        "createGoal",
        "Create a long-term goal, optionally with milestones. Use this when the "
        "user names something bigger than a single task.",
        {
            "title": _str("What the goal is"),
            "description": _str("Why it matters to them"),
            "category": _str("Optional grouping, e.g. 'career', 'health'"),
            "target_date": _str("Optional YYYY-MM-DD"),
            "milestones": {
                "type": "array", "items": {"type": "string"},
                "description": "Optional list of milestone titles",
            },
        },
        handler=_create_goal, required=["title"],
    ),
    ToolSpec(
        "updateGoal", "Update a goal's progress, status, title or target date.",
        {"goal_id": _str("Goal id"), "progress": _int("Percent 0-100"),
         "status": _str("ACTIVE, COMPLETED, PAUSED or ARCHIVED"),
         "title": _str("New title"), "target_date": _str("YYYY-MM-DD")},
        handler=_update_goal, required=["goal_id"],
    ),
    ToolSpec(
        "linkTaskToGoal", "Attach an existing task to a goal it serves.",
        {"task_id": _str("Task id or list number"), "goal_id": _str("Goal id")},
        handler=_link_task_to_goal, required=["task_id", "goal_id"],
    ),
    # ── Habits (Phase 1, section 3) ─────────────────────────────────────
    ToolSpec(
        "logHabit",
        "Log a habit for a day. If the habit does not exist yet it is created. "
        "Never shame a broken streak — report the number and move on.",
        {"habit": _str("Habit name (or habit_id)"),
         "done": _bool("Whether it was done — default true"),
         "day": _str("Optional YYYY-MM-DD, defaults to today"),
         "note": _str("Optional note")},
        handler=_log_habit, required=["habit"],
    ),
    ToolSpec(
        "createHabit", "Create a habit to track.",
        {"name": _str("The habit"), "emoji": _str("Optional emoji"),
         "frequency": _str("'daily' or 'weekly'")},
        handler=_create_habit, required=["name"],
    ),
    # ── Focus and time (Phase 1, sections 4, 5) ─────────────────────────
    ToolSpec(
        "startFocus",
        "Start and log a focus session. Link it to a task when there is one — that "
        "is what makes the time show up against their work.",
        {
            "minutes": _int("Length in minutes, 1-240 (default 25)"),
            "activity": _str("What they'll work on"),
            "mode": _str("DEEP_WORK, STUDY, WRITING, CODING, ADMIN, CREATIVE or OTHER"),
            "task_id": _str("Optional task this session is for"),
            "goal_id": _str("Optional goal this session serves"),
            "intended": _str("What they intend to have finished by the end"),
            "session_type": _str("'focus' or 'break'"),
        },
        handler=_start_focus,
    ),
    ToolSpec(
        "endFocus",
        "End the current focus session and record the time spent. The result "
        "includes a reflection question — the timer ending does not mean the work "
        "is done, and you must not claim that it does.",
        {"session_id": _str("Optional session id; defaults to the open one"),
         "completed": _bool("Whether the timer ran to completion"),
         "finished_intent": _bool("Only if the user said whether they finished"),
         "reflection": _str("What the user said about how it went")},
        handler=_end_focus,
    ),
    ToolSpec(
        "logTime", "Record time already spent on something.",
        {"minutes": _int("How many minutes"),
         "task_id": _str("Optional task it was spent on"),
         "category": _str("DEEP_WORK, STUDY, WRITING, CODING, ADMIN, CREATIVE, OTHER"),
         "description": _str("What the time went to")},
        handler=_log_time, required=["minutes"],
    ),
    # ── Planning, review, insight (Phase 1, sections 6, 8, 9) ───────────
    ToolSpec(
        "planMyDay",
        "Build a realistic plan for today from their open tasks, deadlines, goals "
        "and habits. Pass available_minutes when the user tells you how much time "
        "they have. The plan deliberately leaves buffer — do not fill it in.",
        {"available_minutes": _int("Minutes the user actually has today"),
         "save": _bool("Save the plan to their Today screen")},
        handler=_plan_my_day,
    ),
    ToolSpec(
        "getWeeklyReview",
        "This week's numbers and the observations derived from them. Every "
        "observation is computed from data — do not add any of your own.",
        {"day": _str("Any day inside the week; defaults to this week")},
        handler=_weekly_review,
    ),
    ToolSpec(
        "getInsights",
        "Data-backed patterns about how the user works. Returns 'not enough data' "
        "when there isn't enough — say exactly that rather than guessing.",
        {"days": _int("Window in days, default 30")},
        handler=_get_insights,
    ),
    ToolSpec(
        "createReminder",
        "Save a reminder. It appears on the user's Today screen when due — this "
        "build has no scheduler, so do NOT promise a notification.",
        {"text": _str("What to remind about"),
         "when": _str("YYYY-MM-DD or YYYY-MM-DDTHH:MM"),
         "task_id": _str("Optional task it relates to")},
        handler=_create_reminder, required=["text"],
    ),
    ToolSpec(
        "getDailySummary",
        "Today's verse, word of the day, teaching, task counts and focus time.",
        {"day": _str("Optional YYYY-MM-DD, defaults to today")},
        handler=_get_daily_summary,
    ),
    # Declared so Krishna can answer honestly about it, but disabled.
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
