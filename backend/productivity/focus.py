"""
Focus engine (Phase 1, section 4).

A focus session records what was *intended*, not just that a timer expired.
When a session ends the module returns a reflection prompt rather than a
congratulation — "the timer finished" and "you did the thing" are different
claims, and only the user can settle the second one.

Ending a session also writes a `time_entries` row, so every aggregate in the
app can read one table instead of unioning two.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from db import ensure_user, get_conn, new_id, now_iso

MODES = ("DEEP_WORK", "STUDY", "WRITING", "CODING", "ADMIN", "CREATIVE", "OTHER")
PRESET_MINUTES = (25, 45, 60)
MIN_MINUTES = 1
MAX_MINUTES = 240

_MODE_ALIASES = {
    "deep_work": "DEEP_WORK", "deep": "DEEP_WORK", "deepwork": "DEEP_WORK",
    "focus": "DEEP_WORK", "study": "STUDY", "studying": "STUDY", "learning": "STUDY",
    "writing": "WRITING", "write": "WRITING",
    "coding": "CODING", "code": "CODING", "dev": "CODING", "programming": "CODING",
    "admin": "ADMIN", "email": "ADMIN", "chores": "ADMIN",
    "creative": "CREATIVE", "design": "CREATIVE",
    "other": "OTHER", "": "OTHER",
}


class FocusError(ValueError):
    """Invalid focus session input."""


def normalize_mode(value: Optional[str]) -> str:
    key = (value or "OTHER").strip().lower().replace("-", "_").replace(" ", "_")
    resolved = _MODE_ALIASES.get(key)
    if resolved is None:
        if key.upper() in MODES:
            return key.upper()
        raise FocusError(f"Unknown mode {value!r}. Use one of: {', '.join(MODES)}.")
    return resolved


def _parse_ts(value: str) -> datetime:
    dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _shape(row: Any) -> dict[str, Any]:
    d = dict(row)
    d["completed"] = bool(d.get("completed"))
    d["planned_minutes"] = round((d.get("planned_secs") or 0) / 60, 1)
    d["actual_minutes"] = (
        round((d["actual_secs"]) / 60, 1) if d.get("actual_secs") is not None else None
    )
    if d.get("finished_intent") is not None:
        d["finished_intent"] = bool(d["finished_intent"])
    return d


def active_session(user_id: str) -> Optional[dict[str, Any]]:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM focus_sessions WHERE user_id = ? AND ended_at IS NULL"
            " ORDER BY started_at DESC LIMIT 1",
            (user_id,),
        ).fetchone()
    return _shape(row) if row is not None else None


def start_session(
    user_id: str,
    minutes: int = 25,
    activity: Optional[str] = None,
    mode: Optional[str] = None,
    task_id: Optional[str] = None,
    goal_id: Optional[str] = None,
    intended: Optional[str] = None,
    session_type: str = "focus",
) -> dict[str, Any]:
    try:
        mins = int(minutes)
    except (TypeError, ValueError):
        raise FocusError("minutes must be a number.")
    if not MIN_MINUTES <= mins <= MAX_MINUTES:
        raise FocusError(f"Focus sessions run between {MIN_MINUTES} and {MAX_MINUTES} minutes.")

    kind = (session_type or "focus").strip().lower()
    if kind not in {"focus", "break"}:
        raise FocusError("session_type must be 'focus' or 'break'.")
    mode_v = normalize_mode(mode)

    ensure_user(user_id)
    resolved_task = None
    resolved_goal = None
    with get_conn() as conn:
        open_row = conn.execute(
            "SELECT id FROM focus_sessions WHERE user_id = ? AND ended_at IS NULL",
            (user_id,),
        ).fetchone()
        if open_row is not None:
            raise FocusError(
                "A focus session is already running. End it before starting another."
            )
        if task_id:
            from productivity.tasks import _fetch

            task_row = _fetch(conn, user_id, task_id)
            if task_row is None:
                raise FocusError("That task does not exist for this user.")
            resolved_task = task_row["id"]
            resolved_goal = task_row["goal_id"]
        if goal_id:
            goal_row = conn.execute(
                "SELECT id FROM goals WHERE user_id = ? AND id = ?", (user_id, goal_id)
            ).fetchone()
            if goal_row is None:
                raise FocusError("That goal does not exist for this user.")
            resolved_goal = goal_row["id"]

        sid = new_id()
        conn.execute(
            "INSERT INTO focus_sessions (id, user_id, activity, category, planned_secs,"
            " session_type, task_id, goal_id, intended, started_at, completed)"
            " VALUES (?,?,?,?,?,?,?,?,?,?,0)",
            (sid, user_id, activity, mode_v, mins * 60, kind, resolved_task,
             resolved_goal, intended or activity, now_iso()),
        )
        row = conn.execute("SELECT * FROM focus_sessions WHERE id = ?", (sid,)).fetchone()
    return _shape(row)


def end_session(
    user_id: str,
    session_id: Optional[str] = None,
    completed: bool = True,
    reflection: Optional[str] = None,
    finished_intent: Optional[bool] = None,
    actual_seconds: Optional[int] = None,
) -> Optional[dict[str, Any]]:
    """
    Close a session and write the matching time entry.

    `completed` means the timer ran its length. `finished_intent` is the
    separate, honest question — did you finish what you sat down to do — and
    it stays None until the user answers it.
    """
    with get_conn() as conn:
        if session_id:
            row = conn.execute(
                "SELECT * FROM focus_sessions WHERE id = ? AND user_id = ?",
                (session_id, user_id),
            ).fetchone()
        else:
            row = conn.execute(
                "SELECT * FROM focus_sessions WHERE user_id = ? AND ended_at IS NULL"
                " ORDER BY started_at DESC LIMIT 1",
                (user_id,),
            ).fetchone()
        if row is None:
            return None
        if row["ended_at"]:
            return _shape(row)

        started = _parse_ts(row["started_at"])
        ended = datetime.now(timezone.utc)
        if actual_seconds is not None:
            try:
                elapsed = max(0, int(actual_seconds))
            except (TypeError, ValueError):
                raise FocusError("actual_seconds must be a whole number.")
        else:
            elapsed = max(0, int((ended - started).total_seconds()))
        # A wall-clock that ran long (laptop asleep, tab left open) should not
        # be recorded as heroic focus time.
        elapsed = min(elapsed, int(row["planned_secs"]) + 300)

        conn.execute(
            "UPDATE focus_sessions SET ended_at = ?, actual_secs = ?, completed = ?,"
            " reflection = COALESCE(?, reflection),"
            " finished_intent = COALESCE(?, finished_intent) WHERE id = ?",
            (ended.isoformat(), elapsed, 1 if completed else 0, reflection,
             None if finished_intent is None else (1 if finished_intent else 0),
             row["id"]),
        )
        if row["session_type"] == "focus" and elapsed > 0:
            conn.execute(
                "INSERT INTO time_entries (id, user_id, task_id, goal_id, category,"
                " description, source, started_at, ended_at, seconds, created_at)"
                " VALUES (?,?,?,?,?,?,'focus',?,?,?,?)",
                (new_id(), user_id, row["task_id"], row["goal_id"], row["category"],
                 row["activity"], row["started_at"], ended.isoformat(), elapsed, now_iso()),
            )
        updated = conn.execute(
            "SELECT * FROM focus_sessions WHERE id = ?", (row["id"],)
        ).fetchone()

    if row["session_type"] == "focus" and row["task_id"] and elapsed > 0:
        from productivity.tasks import add_actual_minutes

        add_actual_minutes(user_id, row["task_id"], elapsed / 60)

    return _shape(updated)


def reflection_prompt(session: dict[str, Any]) -> dict[str, Any]:
    """
    What Madhav asks after a session.

    Never asserts that the work went well — the timer ending is evidence of
    time spent and nothing else.
    """
    minutes = session.get("actual_minutes") or 0
    intended = session.get("intended") or session.get("activity")
    if session.get("session_type") == "break":
        return {
            "question": "Break's done. Ready to go again?",
            "options": ["Start another focus session", "Not yet"],
            "minutes": minutes,
        }
    subject = f" to “{intended}”" if intended else ""
    return {
        "question": (
            f"You gave that {minutes:g} focused minutes{subject}. "
            "Did you finish what you intended?"
        ),
        "options": ["Finished it", "Made progress", "Got stuck"],
        "minutes": minutes,
        "note": (
            "The timer finishing only records time spent — whether the work "
            "landed is yours to say."
        ),
    }


def record_reflection(user_id: str, session_id: str, finished_intent: Optional[bool] = None,
                      reflection: Optional[str] = None) -> Optional[dict[str, Any]]:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM focus_sessions WHERE id = ? AND user_id = ?",
            (session_id, user_id),
        ).fetchone()
        if row is None:
            return None
        conn.execute(
            "UPDATE focus_sessions SET reflection = COALESCE(?, reflection),"
            " finished_intent = COALESCE(?, finished_intent) WHERE id = ?",
            (reflection, None if finished_intent is None else (1 if finished_intent else 0),
             session_id),
        )
        updated = conn.execute(
            "SELECT * FROM focus_sessions WHERE id = ?", (session_id,)
        ).fetchone()
    return _shape(updated)


def list_sessions(user_id: str, since: Optional[str] = None, limit: int = 50,
                  session_type: Optional[str] = None) -> list[dict[str, Any]]:
    sql = "SELECT * FROM focus_sessions WHERE user_id = ?"
    args: list[Any] = [user_id]
    if since:
        sql += " AND started_at >= ?"
        args.append(since)
    if session_type:
        sql += " AND session_type = ?"
        args.append(session_type)
    sql += " ORDER BY started_at DESC LIMIT ?"
    args.append(max(1, min(limit, 500)))
    with get_conn() as conn:
        rows = conn.execute(sql, args).fetchall()
    return [_shape(r) for r in rows]
