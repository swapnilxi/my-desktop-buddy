"""
Time tracking (Phase 1, section 5).

One table, `time_entries`, records every minute the app knows about — whether
it came from a focus session or from someone hitting start/stop manually. The
aggregates here are what the dashboard, the weekly review and the insights
engine all read, so none of them can disagree about how long something took.

`unallocated` is deliberately reported: time tracked against no task and no
goal is a real category, and pretending otherwise would inflate how neatly
the day was accounted for.
"""
from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from typing import Any, Optional

from db import ensure_user, get_conn, new_id, now_iso
from productivity.focus import FocusError, normalize_mode


def day_bounds(day: Optional[str] = None) -> tuple[str, str]:
    """UTC ISO bounds [start, end) for a calendar day, local-date based."""
    target = date.fromisoformat(day) if day else date.today()
    start = datetime.combine(target, time.min).astimezone(timezone.utc)
    end = datetime.combine(target + timedelta(days=1), time.min).astimezone(timezone.utc)
    return start.isoformat(), end.isoformat()


def week_bounds(day: Optional[str] = None) -> tuple[str, str, date, date]:
    """Monday-to-Sunday bounds containing `day`, plus the two dates."""
    target = date.fromisoformat(day) if day else date.today()
    monday = target - timedelta(days=target.weekday())
    sunday = monday + timedelta(days=6)
    start = datetime.combine(monday, time.min).astimezone(timezone.utc)
    end = datetime.combine(sunday + timedelta(days=1), time.min).astimezone(timezone.utc)
    return start.isoformat(), end.isoformat(), monday, sunday


def start_entry(user_id: str, task_id: Optional[str] = None, goal_id: Optional[str] = None,
                category: Optional[str] = None,
                description: Optional[str] = None) -> dict[str, Any]:
    ensure_user(user_id)
    resolved_task = None
    resolved_goal = None
    with get_conn() as conn:
        open_row = conn.execute(
            "SELECT id FROM time_entries WHERE user_id = ? AND ended_at IS NULL",
            (user_id,),
        ).fetchone()
        if open_row is not None:
            raise FocusError("A timer is already running. Stop it before starting another.")
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

        entry_id = new_id()
        conn.execute(
            "INSERT INTO time_entries (id, user_id, task_id, goal_id, category,"
            " description, source, started_at, ended_at, seconds, created_at)"
            " VALUES (?,?,?,?,?,?,'manual',?,NULL,NULL,?)",
            (entry_id, user_id, resolved_task, resolved_goal, normalize_mode(category),
             description, now_iso(), now_iso()),
        )
        row = conn.execute("SELECT * FROM time_entries WHERE id = ?", (entry_id,)).fetchone()
    return dict(row)


def stop_entry(user_id: str, entry_id: Optional[str] = None) -> Optional[dict[str, Any]]:
    with get_conn() as conn:
        if entry_id:
            row = conn.execute(
                "SELECT * FROM time_entries WHERE id = ? AND user_id = ?",
                (entry_id, user_id),
            ).fetchone()
        else:
            row = conn.execute(
                "SELECT * FROM time_entries WHERE user_id = ? AND ended_at IS NULL"
                " ORDER BY started_at DESC LIMIT 1",
                (user_id,),
            ).fetchone()
        if row is None:
            return None
        if row["ended_at"]:
            return dict(row)

        started = datetime.fromisoformat(str(row["started_at"]).replace("Z", "+00:00"))
        if not started.tzinfo:
            started = started.replace(tzinfo=timezone.utc)
        ended = datetime.now(timezone.utc)
        seconds = max(0, int((ended - started).total_seconds()))
        # 12 hours is the cap for a manual timer: past that the user forgot to
        # stop it, and recording it as work would poison every average.
        seconds = min(seconds, 12 * 3600)
        conn.execute(
            "UPDATE time_entries SET ended_at = ?, seconds = ? WHERE id = ?",
            (ended.isoformat(), seconds, row["id"]),
        )
        updated = conn.execute(
            "SELECT * FROM time_entries WHERE id = ?", (row["id"],)
        ).fetchone()

    if row["task_id"] and seconds > 0:
        from productivity.tasks import add_actual_minutes

        add_actual_minutes(user_id, row["task_id"], seconds / 60)
    return dict(updated)


def active_entry(user_id: str) -> Optional[dict[str, Any]]:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM time_entries WHERE user_id = ? AND ended_at IS NULL"
            " ORDER BY started_at DESC LIMIT 1",
            (user_id,),
        ).fetchone()
    return dict(row) if row is not None else None


def log_entry(user_id: str, minutes: float, task_id: Optional[str] = None,
              goal_id: Optional[str] = None, category: Optional[str] = None,
              description: Optional[str] = None,
              started_at: Optional[str] = None) -> dict[str, Any]:
    """Record time after the fact — the 'I worked on this for 40 minutes' case."""
    try:
        mins = float(minutes)
    except (TypeError, ValueError):
        raise FocusError("minutes must be a number.")
    if not 0 < mins <= 12 * 60:
        raise FocusError("Logged time must be between 0 minutes and 12 hours.")

    ensure_user(user_id)
    seconds = int(mins * 60)
    start = started_at or now_iso()
    started_dt = datetime.fromisoformat(str(start).replace("Z", "+00:00"))
    if not started_dt.tzinfo:
        started_dt = started_dt.replace(tzinfo=timezone.utc)

    resolved_task = None
    resolved_goal = goal_id
    with get_conn() as conn:
        if task_id:
            from productivity.tasks import _fetch

            task_row = _fetch(conn, user_id, task_id)
            if task_row is None:
                raise FocusError("That task does not exist for this user.")
            resolved_task = task_row["id"]
            resolved_goal = goal_id or task_row["goal_id"]
        entry_id = new_id()
        conn.execute(
            "INSERT INTO time_entries (id, user_id, task_id, goal_id, category,"
            " description, source, started_at, ended_at, seconds, created_at)"
            " VALUES (?,?,?,?,?,?,'manual',?,?,?,?)",
            (entry_id, user_id, resolved_task, resolved_goal, normalize_mode(category),
             description, started_dt.isoformat(),
             (started_dt + timedelta(seconds=seconds)).isoformat(), seconds, now_iso()),
        )
        row = conn.execute("SELECT * FROM time_entries WHERE id = ?", (entry_id,)).fetchone()

    if resolved_task:
        from productivity.tasks import add_actual_minutes

        add_actual_minutes(user_id, resolved_task, mins)
    return dict(row)


def delete_entry(user_id: str, entry_id: str) -> bool:
    with get_conn() as conn:
        cur = conn.execute(
            "DELETE FROM time_entries WHERE id = ? AND user_id = ?", (entry_id, user_id)
        )
        return bool(cur.rowcount)


# ── Aggregates ───────────────────────────────────────────────────────────
def _rows_between(user_id: str, start_iso: str, end_iso: str) -> list[dict[str, Any]]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM time_entries WHERE user_id = ? AND started_at >= ?"
            " AND started_at < ? AND seconds IS NOT NULL ORDER BY started_at",
            (user_id, start_iso, end_iso),
        ).fetchall()
    return [dict(r) for r in rows]


def summary(user_id: str, start_iso: str, end_iso: str) -> dict[str, Any]:
    """Minutes in the window, split by category, task and goal."""
    rows = _rows_between(user_id, start_iso, end_iso)
    total = sum(r["seconds"] or 0 for r in rows)

    by_category: dict[str, int] = {}
    by_task: dict[str, int] = {}
    by_goal: dict[str, int] = {}
    unallocated = 0
    for r in rows:
        secs = r["seconds"] or 0
        by_category[r["category"] or "OTHER"] = by_category.get(r["category"] or "OTHER", 0) + secs
        if r["task_id"]:
            by_task[r["task_id"]] = by_task.get(r["task_id"], 0) + secs
        if r["goal_id"]:
            by_goal[r["goal_id"]] = by_goal.get(r["goal_id"], 0) + secs
        if not r["task_id"] and not r["goal_id"]:
            unallocated += secs

    def as_minutes(mapping: dict[str, int]) -> list[dict[str, Any]]:
        return [
            {"key": k, "minutes": round(v / 60, 1)}
            for k, v in sorted(mapping.items(), key=lambda kv: -kv[1])
        ]

    return {
        "total_minutes": round(total / 60, 1),
        "entries": len(rows),
        "by_category": as_minutes(by_category),
        "by_task": as_minutes(by_task),
        "by_goal": as_minutes(by_goal),
        "unallocated_minutes": round(unallocated / 60, 1),
    }


def today_summary(user_id: str, day: Optional[str] = None) -> dict[str, Any]:
    start, end = day_bounds(day)
    return summary(user_id, start, end)


def week_summary(user_id: str, day: Optional[str] = None) -> dict[str, Any]:
    start, end, monday, sunday = week_bounds(day)
    out = summary(user_id, start, end)
    out["week_start"] = monday.isoformat()
    out["week_end"] = sunday.isoformat()
    return out


def planned_vs_actual(user_id: str, start_iso: str, end_iso: str) -> dict[str, Any]:
    """
    Estimated versus recorded minutes on tasks completed in the window.

    Returns None for the ratio when nothing in the window carried an estimate —
    an estimation insight without estimates would be invented.
    """
    from productivity.tasks import completed_between

    tasks = completed_between(user_id, start_iso, end_iso)
    estimated = [t for t in tasks if t.get("estimated_minutes")]
    planned_total = sum(t["estimated_minutes"] for t in estimated)
    actual_total = sum(t.get("actual_minutes") or 0 for t in estimated)

    return {
        "tasks_with_estimates": len(estimated),
        "planned_minutes": planned_total,
        "actual_minutes": actual_total,
        "ratio": round(actual_total / planned_total, 2) if planned_total else None,
        "sample": [
            {"title": t["title"], "estimated_minutes": t["estimated_minutes"],
             "actual_minutes": t.get("actual_minutes") or 0}
            for t in estimated[:10]
        ],
    }
