"""
Reminders (Phase 1, section 12 — `createReminder`).

There is no scheduler in this build, so a reminder here is **stored, not
pushed**. It surfaces on the Today screen once it is due, and the tool that
creates one says exactly that. Promising a notification the app cannot send
would be the tool lying about what it did.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from db import ensure_user, get_conn, new_id, now_iso


class ReminderError(ValueError):
    """Invalid reminder input."""


def _normalize_when(value: Optional[str]) -> Optional[str]:
    if value is None or not str(value).strip():
        return None
    raw = str(value).strip()
    try:
        datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        raise ReminderError(
            f"{raw!r} is not a date I can store. Use YYYY-MM-DD or a full "
            "YYYY-MM-DDTHH:MM timestamp."
        )
    return raw


def create_reminder(user_id: str, text: str, remind_at: Optional[str] = None,
                    task_id: Optional[str] = None) -> dict[str, Any]:
    clean = (text or "").strip()
    if not clean:
        raise ReminderError("A reminder needs something to say.")
    when = _normalize_when(remind_at)

    ensure_user(user_id)
    rid = new_id()
    with get_conn() as conn:
        resolved_task = None
        if task_id:
            from productivity.tasks import _fetch

            row = _fetch(conn, user_id, task_id)
            if row is None:
                raise ReminderError("That task does not exist for this user.")
            resolved_task = row["id"]
        conn.execute(
            "INSERT INTO reminders (id, user_id, text, remind_at, task_id, done, created_at)"
            " VALUES (?,?,?,?,?,0,?)",
            (rid, user_id, clean, when, resolved_task, now_iso()),
        )
        row = conn.execute("SELECT * FROM reminders WHERE id = ?", (rid,)).fetchone()
    return dict(row)


def list_reminders(user_id: str, include_done: bool = False) -> list[dict[str, Any]]:
    sql = "SELECT * FROM reminders WHERE user_id = ?"
    args: list[Any] = [user_id]
    if not include_done:
        sql += " AND done = 0"
    sql += " ORDER BY COALESCE(remind_at, created_at)"
    with get_conn() as conn:
        rows = conn.execute(sql, args).fetchall()
    return [dict(r) for r in rows]


def complete_reminder(user_id: str, reminder_id: str) -> bool:
    with get_conn() as conn:
        cur = conn.execute(
            "UPDATE reminders SET done = 1 WHERE id = ? AND user_id = ?",
            (reminder_id, user_id),
        )
        return bool(cur.rowcount)


def delete_reminder(user_id: str, reminder_id: str) -> bool:
    with get_conn() as conn:
        cur = conn.execute(
            "DELETE FROM reminders WHERE id = ? AND user_id = ?", (reminder_id, user_id)
        )
        return bool(cur.rowcount)
