"""
Goals and milestones (Phase 1, section 2).

A goal is what a stack of tasks is *for*. Tasks carry a `goal_id`, so Madhav
can answer "how does today's work move the thing I actually care about" from
data rather than from a guess.

Progress is either explicit (the user sets a percentage) or derived from
milestones. Derived progress is recomputed on every milestone change, so a
goal's number never drifts away from its milestones.
"""
from __future__ import annotations

from typing import Any, Optional

from db import ensure_user, get_conn, new_id, now_iso
from productivity.tasks import TaskError, normalize_day

STATUSES = ("ACTIVE", "COMPLETED", "PAUSED", "ARCHIVED")

_STATUS_ALIASES = {
    "active": "ACTIVE", "in_progress": "ACTIVE", "ongoing": "ACTIVE",
    "completed": "COMPLETED", "complete": "COMPLETED", "done": "COMPLETED",
    "paused": "PAUSED", "on_hold": "PAUSED",
    "archived": "ARCHIVED", "cancelled": "ARCHIVED",
}


class GoalError(ValueError):
    """Invalid goal input."""


def normalize_status(value: Optional[str], default: str = "ACTIVE") -> str:
    if value is None or not str(value).strip():
        return default
    key = str(value).strip().lower().replace("-", "_").replace(" ", "_")
    resolved = _STATUS_ALIASES.get(key)
    if resolved is None:
        raise GoalError(f"Unknown status {value!r}. Use one of: {', '.join(STATUSES)}.")
    return resolved


def _progress(value: Any) -> int:
    try:
        n = int(round(float(value)))
    except (TypeError, ValueError):
        raise GoalError("progress must be a number between 0 and 100.")
    if not 0 <= n <= 100:
        raise GoalError("progress must be between 0 and 100.")
    return n


def _milestone_rows(conn: Any, goal_id: str) -> list[dict[str, Any]]:
    rows = conn.execute(
        "SELECT * FROM goal_milestones WHERE goal_id = ? ORDER BY position, created_at",
        (goal_id,),
    ).fetchall()
    return [
        {
            "id": r["id"], "title": r["title"], "target": r["target"],
            "completed": bool(r["completed"]), "due_date": r["due_date"],
            "completed_at": r["completed_at"], "position": r["position"],
        }
        for r in rows
    ]


def _shape(conn: Any, row: Any, include_tasks: bool = False) -> dict[str, Any]:
    goal = dict(row)
    goal["milestones"] = _milestone_rows(conn, row["id"])
    counts = conn.execute(
        "SELECT status, COUNT(*) AS n FROM tasks WHERE user_id = ? AND goal_id = ?"
        " GROUP BY status",
        (row["user_id"], row["id"]),
    ).fetchall()
    by_status = {c["status"]: c["n"] for c in counts}
    goal["task_counts"] = {
        "total": sum(by_status.values()),
        "completed": by_status.get("COMPLETED", 0),
        "open": by_status.get("TODO", 0) + by_status.get("IN_PROGRESS", 0),
    }
    if include_tasks:
        task_rows = conn.execute(
            "SELECT * FROM tasks WHERE user_id = ? AND goal_id = ? ORDER BY seq",
            (row["user_id"], row["id"]),
        ).fetchall()
        from productivity.tasks import row_to_task

        goal["tasks"] = [row_to_task(t) for t in task_rows]
    return goal


def create_goal(
    user_id: str,
    title: str,
    description: Optional[str] = None,
    category: Optional[str] = None,
    target_date: Optional[str] = None,
    status: Optional[str] = None,
    progress: Any = 0,
    milestones: Optional[list[Any]] = None,
) -> dict[str, Any]:
    clean = (title or "").strip()
    if not clean:
        raise GoalError("A goal needs a title.")
    if len(clean) > 300:
        raise GoalError("Goal titles are limited to 300 characters.")

    status_v = normalize_status(status)
    target = normalize_day(target_date) if target_date else None
    pct = _progress(progress or 0)

    ensure_user(user_id)
    ts = now_iso()
    goal_id = new_id()
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO goals (id, user_id, title, description, category, target_date,"
            " progress, status, created_at, updated_at, completed_at)"
            " VALUES (?,?,?,?,?,?,?,?,?,?,?)",
            (goal_id, user_id, clean, description, category, target, pct, status_v,
             ts, ts, ts if status_v == "COMPLETED" else None),
        )
        for position, m in enumerate(milestones or []):
            _insert_milestone(conn, user_id, goal_id, m, position)
        if milestones:
            _recompute_progress(conn, user_id, goal_id)
        row = conn.execute("SELECT * FROM goals WHERE id = ?", (goal_id,)).fetchone()
        return _shape(conn, row)


def _insert_milestone(conn: Any, user_id: str, goal_id: str, payload: Any,
                      position: int) -> str:
    if isinstance(payload, str):
        payload = {"title": payload}
    if not isinstance(payload, dict):
        raise GoalError("A milestone must be a title or an object with a title.")
    title = str(payload.get("title") or "").strip()
    if not title:
        raise GoalError("A milestone needs a title.")
    mid = new_id()
    completed = bool(payload.get("completed"))
    conn.execute(
        "INSERT INTO goal_milestones (id, goal_id, user_id, title, target, completed,"
        " due_date, position, completed_at, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
        (mid, goal_id, user_id, title, payload.get("target"), 1 if completed else 0,
         normalize_day(payload.get("due_date")) if payload.get("due_date") else None,
         payload.get("position", position), now_iso() if completed else None, now_iso()),
    )
    return mid


def _recompute_progress(conn: Any, user_id: str, goal_id: str) -> None:
    """Derive progress from milestones. Only called when milestones exist."""
    rows = conn.execute(
        "SELECT completed FROM goal_milestones WHERE goal_id = ?", (goal_id,)
    ).fetchall()
    if not rows:
        return
    done = sum(1 for r in rows if r["completed"])
    pct = int(round(done * 100 / len(rows)))
    conn.execute(
        "UPDATE goals SET progress = ?, updated_at = ? WHERE id = ? AND user_id = ?",
        (pct, now_iso(), goal_id, user_id),
    )


def list_goals(user_id: str, status: Optional[str] = None,
               include_tasks: bool = False) -> list[dict[str, Any]]:
    sql = "SELECT * FROM goals WHERE user_id = ?"
    args: list[Any] = [user_id]
    if status:
        sql += " AND status = ?"
        args.append(normalize_status(status))
    sql += " ORDER BY CASE status WHEN 'ACTIVE' THEN 0 WHEN 'PAUSED' THEN 1" \
           " WHEN 'COMPLETED' THEN 2 ELSE 3 END, COALESCE(target_date, '9999'), created_at"
    with get_conn() as conn:
        rows = conn.execute(sql, args).fetchall()
        return [_shape(conn, r, include_tasks=include_tasks) for r in rows]


def get_goal(user_id: str, goal_id: str, include_tasks: bool = True) -> Optional[dict[str, Any]]:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM goals WHERE user_id = ? AND id = ?", (user_id, goal_id)
        ).fetchone()
        return _shape(conn, row, include_tasks=include_tasks) if row is not None else None


def update_goal(user_id: str, goal_id: str, **fields: Any) -> Optional[dict[str, Any]]:
    allowed = {"title", "description", "category", "target_date", "progress", "status"}
    unknown = set(fields) - allowed
    if unknown:
        raise GoalError(f"Cannot update: {', '.join(sorted(unknown))}.")

    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM goals WHERE user_id = ? AND id = ?", (user_id, goal_id)
        ).fetchone()
        if row is None:
            return None

        sets: list[str] = []
        args: list[Any] = []
        if "title" in fields:
            title = (fields["title"] or "").strip()
            if not title:
                raise GoalError("A goal needs a title.")
            sets.append("title = ?")
            args.append(title)
        for key in ("description", "category"):
            if key in fields:
                sets.append(f"{key} = ?")
                args.append(fields[key])
        if "target_date" in fields:
            sets.append("target_date = ?")
            args.append(normalize_day(fields["target_date"]) if fields["target_date"] else None)
        if "progress" in fields and fields["progress"] is not None:
            sets.append("progress = ?")
            args.append(_progress(fields["progress"]))
        if "status" in fields:
            status_v = normalize_status(fields["status"])
            sets.append("status = ?")
            args.append(status_v)
            if status_v == "COMPLETED":
                sets.append("completed_at = ?")
                args.append(row["completed_at"] or now_iso())
                if "progress" not in fields:
                    sets.append("progress = 100")
            else:
                sets.append("completed_at = NULL")

        if sets:
            sets.append("updated_at = ?")
            args.extend([now_iso(), goal_id, user_id])
            conn.execute(
                f"UPDATE goals SET {', '.join(sets)} WHERE id = ? AND user_id = ?", args
            )
        updated = conn.execute("SELECT * FROM goals WHERE id = ?", (goal_id,)).fetchone()
        return _shape(conn, updated)


def delete_goal(user_id: str, goal_id: str) -> bool:
    with get_conn() as conn:
        cur = conn.execute(
            "DELETE FROM goals WHERE user_id = ? AND id = ?", (user_id, goal_id)
        )
        if cur.rowcount:
            # Tasks survive their goal; they simply stop being attached to one.
            conn.execute(
                "UPDATE tasks SET goal_id = NULL WHERE user_id = ? AND goal_id = ?",
                (user_id, goal_id),
            )
            return True
    return False


# ── Milestones ───────────────────────────────────────────────────────────
def add_milestone(user_id: str, goal_id: str, milestone: Any) -> Optional[dict[str, Any]]:
    with get_conn() as conn:
        goal = conn.execute(
            "SELECT id FROM goals WHERE user_id = ? AND id = ?", (user_id, goal_id)
        ).fetchone()
        if goal is None:
            return None
        position = conn.execute(
            "SELECT COALESCE(MAX(position), -1) + 1 FROM goal_milestones WHERE goal_id = ?",
            (goal_id,),
        ).fetchone()[0]
        _insert_milestone(conn, user_id, goal_id, milestone, position)
        _recompute_progress(conn, user_id, goal_id)
        row = conn.execute("SELECT * FROM goals WHERE id = ?", (goal_id,)).fetchone()
        return _shape(conn, row)


def set_milestone_completed(user_id: str, goal_id: str, milestone_id: str,
                            completed: bool = True) -> Optional[dict[str, Any]]:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM goal_milestones WHERE id = ? AND goal_id = ? AND user_id = ?",
            (milestone_id, goal_id, user_id),
        ).fetchone()
        if row is None:
            return None
        conn.execute(
            "UPDATE goal_milestones SET completed = ?, completed_at = ? WHERE id = ?",
            (1 if completed else 0, now_iso() if completed else None, milestone_id),
        )
        _recompute_progress(conn, user_id, goal_id)
        goal = conn.execute("SELECT * FROM goals WHERE id = ?", (goal_id,)).fetchone()
        return _shape(conn, goal)


def delete_milestone(user_id: str, goal_id: str, milestone_id: str) -> bool:
    with get_conn() as conn:
        cur = conn.execute(
            "DELETE FROM goal_milestones WHERE id = ? AND goal_id = ? AND user_id = ?",
            (milestone_id, goal_id, user_id),
        )
        if not cur.rowcount:
            return False
        _recompute_progress(conn, user_id, goal_id)
    return True


def link_task(user_id: str, task_ref: Any, goal_id: str) -> Optional[dict[str, Any]]:
    """Attach an existing task to a goal. Returns the updated task."""
    from productivity.tasks import update_task

    try:
        return update_task(user_id, task_ref, goal_id=goal_id)
    except TaskError as exc:
        raise GoalError(str(exc))
