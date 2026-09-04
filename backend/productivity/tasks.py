"""
Tasks — the single source of truth for work items (Phase 1, section 1).

Before this module the app had two task stores: `~/.hamsterdesk/todos.json`
(live, used by the UI and the tools) and an unused `tasks` table. Keeping both
would mean the Krishna tools and the To-Do tab could disagree about what the
user has to do, so the JSON store is migrated in exactly once and the table
wins from then on.

Backward compatibility is preserved through `seq`: the per-user integer id the
JSON store handed out. The legacy `/todos` endpoints and the existing frontend
still speak in integers, and `legacy_shape()` projects a row back into the
`{id, text, completed, created_at, completed_at}` payload they expect.

Every function takes a `user_id` and every query is scoped to it.
"""
from __future__ import annotations

import json
from datetime import datetime
from typing import Any, Optional, Union

from db import dump_json, ensure_user, get_conn, load_json, new_id, now_iso

STATUSES = ("TODO", "IN_PROGRESS", "COMPLETED", "CANCELLED")
PRIORITIES = ("LOW", "MEDIUM", "HIGH", "CRITICAL")
OPEN_STATUSES = ("TODO", "IN_PROGRESS")

_PRIORITY_RANK = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}

# Words people actually type, mapped onto the vocabulary.
_STATUS_ALIASES = {
    "todo": "TODO", "pending": "TODO", "open": "TODO", "not_started": "TODO",
    "in_progress": "IN_PROGRESS", "inprogress": "IN_PROGRESS", "doing": "IN_PROGRESS",
    "started": "IN_PROGRESS", "active": "IN_PROGRESS",
    "completed": "COMPLETED", "complete": "COMPLETED", "done": "COMPLETED",
    "cancelled": "CANCELLED", "canceled": "CANCELLED", "dropped": "CANCELLED",
}
_PRIORITY_ALIASES = {
    "low": "LOW", "medium": "MEDIUM", "normal": "MEDIUM", "med": "MEDIUM",
    "high": "HIGH", "urgent": "HIGH", "critical": "CRITICAL", "blocker": "CRITICAL",
}


class TaskError(ValueError):
    """Invalid task input — surfaced as a 400 / an ok:false tool result."""


# ── Normalisation ────────────────────────────────────────────────────────
def normalize_status(value: Optional[str], default: str = "TODO") -> str:
    if value is None or not str(value).strip():
        return default
    key = str(value).strip().lower().replace("-", "_").replace(" ", "_")
    resolved = _STATUS_ALIASES.get(key)
    if resolved is None:
        raise TaskError(f"Unknown status {value!r}. Use one of: {', '.join(STATUSES)}.")
    return resolved


def normalize_priority(value: Optional[str], default: str = "MEDIUM") -> str:
    if value is None or not str(value).strip():
        return default
    resolved = _PRIORITY_ALIASES.get(str(value).strip().lower())
    if resolved is None:
        raise TaskError(f"Unknown priority {value!r}. Use one of: {', '.join(PRIORITIES)}.")
    return resolved


def normalize_day(value: Optional[str]) -> Optional[str]:
    """Accept YYYY-MM-DD or a full ISO timestamp; store what was given."""
    if value is None or not str(value).strip():
        return None
    raw = str(value).strip()
    try:
        datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        raise TaskError(f"{raw!r} is not a valid date. Use YYYY-MM-DD.")
    return raw


def _tags(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        parsed = load_json(value, [])
        if isinstance(parsed, list):
            return [str(t) for t in parsed]
        return [t.strip() for t in value.split(",") if t.strip()]
    if isinstance(value, (list, tuple)):
        return [str(t).strip() for t in value if str(t).strip()]
    raise TaskError("tags must be a list of strings.")


def _minutes(value: Any, field: str) -> Optional[int]:
    if value is None or value == "":
        return None
    try:
        n = int(value)
    except (TypeError, ValueError):
        raise TaskError(f"{field} must be a whole number of minutes.")
    if n < 0 or n > 60 * 24 * 7:
        raise TaskError(f"{field} must be between 0 minutes and one week.")
    return n


# ── Row shaping ──────────────────────────────────────────────────────────
def row_to_task(row: Any) -> dict[str, Any]:
    d = dict(row)
    d["tags"] = load_json(d.get("tags"), [])
    d["actual_minutes"] = d.get("actual_minutes") or 0
    return d


def legacy_shape(task: dict[str, Any]) -> dict[str, Any]:
    """
    Project a task into the legacy todo payload.

    The old frontend and the `/todos` router speak `{id:int, text, completed}`;
    `seq` is that integer id, preserved across the migration.
    """
    return {
        "id": task["seq"],
        "text": task["title"],
        "completed": task["status"] == "COMPLETED",
        "created_at": task["created_at"],
        "completed_at": task.get("completed_at"),
    }


# ── Lookup ───────────────────────────────────────────────────────────────
def _next_seq(conn: Any, user_id: str) -> int:
    return int(
        conn.execute(
            "SELECT COALESCE(MAX(seq), 0) + 1 FROM tasks WHERE user_id = ?", (user_id,)
        ).fetchone()[0]
    )


def get_task(user_id: str, ref: Union[str, int]) -> Optional[dict[str, Any]]:
    """Fetch one task by uuid or by its legacy integer `seq`. Scoped to the user."""
    with get_conn() as conn:
        row = _fetch(conn, user_id, ref)
    return row_to_task(row) if row is not None else None


def _fetch(conn: Any, user_id: str, ref: Union[str, int]) -> Any:
    seq: Optional[int] = None
    if isinstance(ref, bool):
        return None
    if isinstance(ref, int):
        seq = ref
    elif isinstance(ref, str) and ref.strip().isdigit():
        seq = int(ref.strip())

    if seq is not None:
        row = conn.execute(
            "SELECT * FROM tasks WHERE user_id = ? AND seq = ?", (user_id, seq)
        ).fetchone()
        if row is not None:
            return row
    return conn.execute(
        "SELECT * FROM tasks WHERE user_id = ? AND id = ?", (user_id, str(ref))
    ).fetchone()


# ── CRUD ─────────────────────────────────────────────────────────────────
def create_task(
    user_id: str,
    title: str,
    description: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    due_date: Optional[str] = None,
    estimated_minutes: Optional[int] = None,
    tags: Any = None,
    parent_task_id: Optional[str] = None,
    goal_id: Optional[str] = None,
) -> dict[str, Any]:
    clean_title = (title or "").strip()
    if not clean_title:
        raise TaskError("A task needs a title.")
    if len(clean_title) > 500:
        raise TaskError("Task titles are limited to 500 characters.")

    status_v = normalize_status(status)
    priority_v = normalize_priority(priority)
    due_v = normalize_day(due_date)
    est = _minutes(estimated_minutes, "estimated_minutes")
    tag_list = _tags(tags)

    ensure_user(user_id)
    ts = now_iso()
    task_id = new_id()

    with get_conn() as conn:
        parent = None
        if parent_task_id:
            parent_row = _fetch(conn, user_id, parent_task_id)
            if parent_row is None:
                raise TaskError("The parent task does not exist for this user.")
            if parent_row["parent_task_id"]:
                raise TaskError("Subtasks cannot have subtasks of their own.")
            parent = parent_row["id"]
        goal = None
        if goal_id:
            goal_row = conn.execute(
                "SELECT id FROM goals WHERE user_id = ? AND id = ?", (user_id, goal_id)
            ).fetchone()
            if goal_row is None:
                raise TaskError("That goal does not exist for this user.")
            goal = goal_row["id"]

        seq = _next_seq(conn, user_id)
        conn.execute(
            "INSERT INTO tasks (id, user_id, seq, title, description, priority, status,"
            " due_date, estimated_minutes, actual_minutes, tags, parent_task_id, goal_id,"
            " created_at, updated_at, completed_at)"
            " VALUES (?,?,?,?,?,?,?,?,?,0,?,?,?,?,?,?)",
            (task_id, user_id, seq, clean_title, description, priority_v, status_v,
             due_v, est, dump_json(tag_list), parent, goal, ts, ts,
             ts if status_v == "COMPLETED" else None),
        )
        row = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
    return row_to_task(row)


def list_tasks(
    user_id: str,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    goal_id: Optional[str] = None,
    parent_task_id: Optional[str] = None,
    include_subtasks: bool = True,
    due_before: Optional[str] = None,
    limit: int = 200,
) -> list[dict[str, Any]]:
    """
    Tasks for one user, ordered the way a person would want to see them:
    open work first, then priority, then due date.
    """
    sql = ["SELECT * FROM tasks WHERE user_id = ?"]
    args: list[Any] = [user_id]

    if status:
        if str(status).strip().lower() in {"open", "pending", "active"}:
            sql.append(f"AND status IN ({','.join('?' * len(OPEN_STATUSES))})")
            args.extend(OPEN_STATUSES)
        else:
            sql.append("AND status = ?")
            args.append(normalize_status(status))
    if priority:
        sql.append("AND priority = ?")
        args.append(normalize_priority(priority))
    if goal_id:
        sql.append("AND goal_id = ?")
        args.append(goal_id)
    if parent_task_id is not None:
        sql.append("AND parent_task_id = ?")
        args.append(parent_task_id)
    elif not include_subtasks:
        sql.append("AND parent_task_id IS NULL")
    if due_before:
        sql.append("AND due_date IS NOT NULL AND due_date <= ?")
        args.append(normalize_day(due_before))

    sql.append("ORDER BY seq")
    with get_conn() as conn:
        rows = conn.execute(" ".join(sql), args).fetchall()

    tasks = [row_to_task(r) for r in rows]
    tasks.sort(key=lambda t: (
        t["status"] == "COMPLETED" or t["status"] == "CANCELLED",
        _PRIORITY_RANK.get(t["priority"], 9),
        t["due_date"] or "9999",
        t["seq"] or 0,
    ))
    return tasks[: max(1, min(limit, 1000))]


def update_task(user_id: str, ref: Union[str, int], **fields: Any) -> Optional[dict[str, Any]]:
    """Patch a task. Unknown keys are rejected rather than silently ignored."""
    allowed = {
        "title", "description", "status", "priority", "due_date",
        "estimated_minutes", "actual_minutes", "tags", "goal_id", "parent_task_id",
    }
    unknown = set(fields) - allowed
    if unknown:
        raise TaskError(f"Cannot update: {', '.join(sorted(unknown))}.")

    with get_conn() as conn:
        row = _fetch(conn, user_id, ref)
        if row is None:
            return None

        sets: list[str] = []
        args: list[Any] = []

        if "title" in fields:
            title = (fields["title"] or "").strip()
            if not title:
                raise TaskError("A task needs a title.")
            sets.append("title = ?")
            args.append(title)
        if "description" in fields:
            sets.append("description = ?")
            args.append(fields["description"])
        if "priority" in fields:
            sets.append("priority = ?")
            args.append(normalize_priority(fields["priority"]))
        if "due_date" in fields:
            sets.append("due_date = ?")
            args.append(normalize_day(fields["due_date"]))
        if "estimated_minutes" in fields:
            sets.append("estimated_minutes = ?")
            args.append(_minutes(fields["estimated_minutes"], "estimated_minutes"))
        if "actual_minutes" in fields:
            sets.append("actual_minutes = ?")
            args.append(_minutes(fields["actual_minutes"], "actual_minutes") or 0)
        if "tags" in fields:
            sets.append("tags = ?")
            args.append(dump_json(_tags(fields["tags"])))
        if "goal_id" in fields:
            goal_id = fields["goal_id"]
            if goal_id:
                found = conn.execute(
                    "SELECT id FROM goals WHERE user_id = ? AND id = ?", (user_id, goal_id)
                ).fetchone()
                if found is None:
                    raise TaskError("That goal does not exist for this user.")
            sets.append("goal_id = ?")
            args.append(goal_id or None)
        if "parent_task_id" in fields:
            parent = fields["parent_task_id"]
            resolved = None
            if parent:
                parent_row = _fetch(conn, user_id, parent)
                if parent_row is None:
                    raise TaskError("The parent task does not exist for this user.")
                if parent_row["id"] == row["id"]:
                    raise TaskError("A task cannot be its own parent.")
                resolved = parent_row["id"]
            sets.append("parent_task_id = ?")
            args.append(resolved)
        if "status" in fields:
            status_v = normalize_status(fields["status"])
            sets.append("status = ?")
            args.append(status_v)
            if status_v == "COMPLETED":
                sets.append("completed_at = ?")
                args.append(row["completed_at"] or now_iso())
            else:
                sets.append("completed_at = NULL")

        if not sets:
            return row_to_task(row)

        sets.append("updated_at = ?")
        args.append(now_iso())
        args.append(row["id"])
        conn.execute(f"UPDATE tasks SET {', '.join(sets)} WHERE id = ?", args)
        updated = conn.execute("SELECT * FROM tasks WHERE id = ?", (row["id"],)).fetchone()
    return row_to_task(updated)


def complete_task(user_id: str, ref: Union[str, int]) -> Optional[dict[str, Any]]:
    """Idempotent: completing an already-completed task is a no-op, not a toggle."""
    task = get_task(user_id, ref)
    if task is None:
        return None
    if task["status"] == "COMPLETED":
        return task
    return update_task(user_id, task["id"], status="COMPLETED")


def reopen_task(user_id: str, ref: Union[str, int]) -> Optional[dict[str, Any]]:
    task = get_task(user_id, ref)
    if task is None:
        return None
    if task["status"] != "COMPLETED":
        return task
    return update_task(user_id, task["id"], status="TODO")


def toggle_task(user_id: str, ref: Union[str, int]) -> Optional[dict[str, Any]]:
    """What the legacy PATCH /todos/{id} means: flip done-ness."""
    task = get_task(user_id, ref)
    if task is None:
        return None
    return (reopen_task if task["status"] == "COMPLETED" else complete_task)(user_id, task["id"])


def delete_task(user_id: str, ref: Union[str, int]) -> bool:
    with get_conn() as conn:
        row = _fetch(conn, user_id, ref)
        if row is None:
            return False
        conn.execute("DELETE FROM tasks WHERE id = ? AND user_id = ?", (row["id"], user_id))
    return True


def subtasks(user_id: str, parent_ref: Union[str, int]) -> list[dict[str, Any]]:
    parent = get_task(user_id, parent_ref)
    if parent is None:
        return []
    return list_tasks(user_id, parent_task_id=parent["id"])


def add_actual_minutes(user_id: str, ref: Union[str, int], minutes: float) -> None:
    """Accumulate recorded work onto a task. Called when time is logged against it."""
    if minutes <= 0:
        return
    with get_conn() as conn:
        row = _fetch(conn, user_id, ref)
        if row is None:
            return
        conn.execute(
            "UPDATE tasks SET actual_minutes = COALESCE(actual_minutes, 0) + ?,"
            " updated_at = ? WHERE id = ?",
            (int(round(minutes)), now_iso(), row["id"]),
        )


# ── One-time migration from todos.json ───────────────────────────────────
MIGRATION_KEY = "todos_json_migrated_at"


def migrate_todos_json(user_id: str, force: bool = False) -> dict[str, Any]:
    """
    Import `~/.hamsterdesk/todos.json` into the tasks table, once.

    The guard is stored under the global settings scope rather than per user:
    the JSON store was never user-scoped, so importing it a second time for a
    second local user would duplicate everyone's tasks.

    The JSON file is left on disk untouched — it becomes a backup, not a
    second source of truth.
    """
    from db import GLOBAL_SCOPE, get_setting, set_setting

    already = get_setting(GLOBAL_SCOPE, MIGRATION_KEY)
    if already and not force:
        return {"migrated": 0, "skipped": True, "reason": "already_migrated",
                "migrated_at": already}

    from config_manager import TODOS_FILE

    path = TODOS_FILE
    if not path.exists():
        set_setting(GLOBAL_SCOPE, MIGRATION_KEY, now_iso())
        return {"migrated": 0, "skipped": True, "reason": "no_todos_file"}

    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as exc:
        # A corrupt file must not block startup, and must not be reported as
        # a successful migration.
        return {"migrated": 0, "skipped": True, "reason": f"unreadable: {exc}"}

    if not isinstance(raw, list):
        set_setting(GLOBAL_SCOPE, MIGRATION_KEY, now_iso())
        return {"migrated": 0, "skipped": True, "reason": "unexpected_format"}

    ensure_user(user_id)
    migrated = 0
    with get_conn() as conn:
        for item in raw:
            if not isinstance(item, dict):
                continue
            title = str(item.get("text") or "").strip()
            if not title:
                continue
            seq = item.get("id")
            try:
                seq = int(seq)
            except (TypeError, ValueError):
                seq = _next_seq(conn, user_id)
            taken = conn.execute(
                "SELECT 1 FROM tasks WHERE user_id = ? AND seq = ?", (user_id, seq)
            ).fetchone()
            if taken is not None:
                seq = _next_seq(conn, user_id)

            completed = bool(item.get("completed"))
            created = str(item.get("created_at") or now_iso())
            conn.execute(
                "INSERT INTO tasks (id, user_id, seq, title, description, priority, status,"
                " due_date, estimated_minutes, actual_minutes, tags, parent_task_id, goal_id,"
                " created_at, updated_at, completed_at)"
                " VALUES (?,?,?,?,NULL,'MEDIUM',?,NULL,NULL,0,'[]',NULL,NULL,?,?,?)",
                (new_id(), user_id, seq, title,
                 "COMPLETED" if completed else "TODO",
                 created, created,
                 item.get("completed_at") if completed else None),
            )
            migrated += 1

    set_setting(GLOBAL_SCOPE, MIGRATION_KEY, now_iso())
    return {"migrated": migrated, "skipped": False, "source": str(path)}


def ensure_migrated(user_id: str) -> None:
    """Cheap guard callers can put in front of any task read."""
    from db import GLOBAL_SCOPE, get_setting

    if get_setting(GLOBAL_SCOPE, MIGRATION_KEY):
        return
    try:
        migrate_todos_json(user_id)
    except Exception:  # never let a legacy import break a live request
        from observability import get_logger

        get_logger("productivity.tasks").warning("todos_migration.failed", exc_info=True)


def counts(user_id: str) -> dict[str, int]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT status, COUNT(*) AS n FROM tasks WHERE user_id = ? GROUP BY status",
            (user_id,),
        ).fetchall()
    by_status = {r["status"]: r["n"] for r in rows}
    total = sum(by_status.values())
    open_n = sum(by_status.get(s, 0) for s in OPEN_STATUSES)
    return {
        "total": total,
        "open": open_n,
        "completed": by_status.get("COMPLETED", 0),
        "cancelled": by_status.get("CANCELLED", 0),
        "in_progress": by_status.get("IN_PROGRESS", 0),
    }


def completed_between(user_id: str, start_iso: str, end_iso: str) -> list[dict[str, Any]]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM tasks WHERE user_id = ? AND status = 'COMPLETED'"
            " AND completed_at IS NOT NULL AND completed_at >= ? AND completed_at < ?"
            " ORDER BY completed_at",
            (user_id, start_iso, end_iso),
        ).fetchall()
    return [row_to_task(r) for r in rows]


def created_between(user_id: str, start_iso: str, end_iso: str) -> list[dict[str, Any]]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM tasks WHERE user_id = ? AND created_at >= ? AND created_at < ?"
            " ORDER BY created_at",
            (user_id, start_iso, end_iso),
        ).fetchall()
    return [row_to_task(r) for r in rows]
