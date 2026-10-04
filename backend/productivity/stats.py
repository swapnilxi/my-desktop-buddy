"""
Today's dashboard and the raw stats behind it (Phase 1, sections 5 & 7).

`today()` is one request that returns everything the Today screen shows, so
the frontend does not have to fan out to six endpoints and stitch them
together (and cannot end up showing a half-loaded day).
"""
from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any, Optional

from db import get_conn
from productivity import focus as F
from productivity import habits as H
from productivity import tasks as T
from productivity import timetracking as TT


def _time_context() -> dict[str, str]:
    from krishna.modes import time_context_for

    ctx = time_context_for()
    return {"id": ctx.id, "label": ctx.label, "greeting_hint": ctx.greeting_hint}


def priority_tasks(user_id: str, day: Optional[str] = None,
                   limit: int = 5) -> list[dict[str, Any]]:
    """
    What actually deserves attention today.

    Overdue and due-today work outranks everything else; after that it is
    priority, then how long the task has been sitting there.
    """
    today = day or date.today().isoformat()
    open_tasks = [
        t for t in T.list_tasks(user_id, status="open", include_subtasks=False)
    ]

    def rank(task: dict[str, Any]) -> tuple:
        due = (task.get("due_date") or "")[:10]
        overdue = bool(due) and due < today
        due_today = due == today
        return (
            0 if overdue else 1 if due_today else 2,
            {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}.get(task["priority"], 9),
            task.get("created_at") or "",
        )

    return sorted(open_tasks, key=rank)[:limit]


def due_reminders(user_id: str, day: Optional[str] = None) -> list[dict[str, Any]]:
    end = (day or date.today().isoformat()) + "T23:59:59"
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM reminders WHERE user_id = ? AND done = 0"
            " AND (remind_at IS NULL OR remind_at <= ?) ORDER BY COALESCE(remind_at, created_at)",
            (user_id, end),
        ).fetchall()
    return [dict(r) for r in rows]


def today(user_id: str, day: Optional[str] = None,
          include_gita: bool = True) -> dict[str, Any]:
    T.ensure_migrated(user_id)
    target = day or date.today().isoformat()
    start, end = TT.day_bounds(target)

    task_counts = T.counts(user_id)
    completed_today = T.completed_between(user_id, start, end)
    focus_summary = _focus_summary(user_id, start, end)
    time_summary = TT.summary(user_id, start, end)

    from productivity import goals as G

    active_goals = G.list_goals(user_id, status="ACTIVE")
    habit_list = H.list_habits(user_id)

    payload: dict[str, Any] = {
        "day": target,
        "time_context": _time_context(),
        "tasks": {
            "priority": priority_tasks(user_id, target),
            "counts": task_counts,
            "completed_today": [
                {"id": t["id"], "seq": t["seq"], "title": t["title"],
                 "completed_at": t["completed_at"]}
                for t in completed_today
            ],
            "completion_rate_today": (
                round(len(completed_today) * 100 / (len(completed_today) + task_counts["open"]), 1)
                if (len(completed_today) + task_counts["open"]) else None
            ),
        },
        "focus": {
            "active_session": F.active_session(user_id),
            **focus_summary,
        },
        "time": {
            "today_minutes": time_summary["total_minutes"],
            "by_category": time_summary["by_category"],
            "unallocated_minutes": time_summary["unallocated_minutes"],
        },
        "habits": {
            "items": habit_list,
            "done_today": sum(1 for h in habit_list if h["done_today"]),
            "total": len(habit_list),
        },
        "goals": [
            {"id": g["id"], "title": g["title"], "progress": g["progress"],
             "category": g["category"], "target_date": g["target_date"],
             "task_counts": g["task_counts"],
             "milestones_total": len(g["milestones"]),
             "milestones_done": sum(1 for m in g["milestones"] if m["completed"])}
            for g in active_goals
        ],
        "reminders": due_reminders(user_id, target),
        "plan": _saved_plan(user_id, target),
    }

    if include_gita:
        try:
            from gita.daily import get_daily_bundle

            payload["daily"] = get_daily_bundle(target)
        except Exception:
            # The Gita corpus is optional to the productivity screen — a
            # failure there must not blank out the user's day.
            payload["daily"] = None

    return payload


def _focus_summary(user_id: str, start_iso: str, end_iso: str) -> dict[str, Any]:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT COUNT(*) AS n, COALESCE(SUM(actual_secs), 0) AS secs"
            " FROM focus_sessions WHERE user_id = ? AND session_type = 'focus'"
            " AND started_at >= ? AND started_at < ? AND ended_at IS NOT NULL",
            (user_id, start_iso, end_iso),
        ).fetchone()
    return {
        "sessions_today": row["n"],
        "minutes_today": round((row["secs"] or 0) / 60, 1),
    }


def _saved_plan(user_id: str, day: str) -> Optional[dict[str, Any]]:
    from db import load_json

    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM daily_plans WHERE user_id = ? AND day = ?", (user_id, day)
        ).fetchone()
    if row is None:
        return None
    plan = dict(row)
    plan["blocks"] = load_json(plan.get("blocks"), [])
    return plan


def stats(user_id: str, days: int = 7) -> dict[str, Any]:
    """Rolling window stats — the numbers, without any narrative attached."""
    span = max(1, min(int(days), 90))
    end_date = date.today()
    start_date = end_date - timedelta(days=span - 1)
    start_iso, _ = TT.day_bounds(start_date.isoformat())
    _, end_iso = TT.day_bounds(end_date.isoformat())

    created = T.created_between(user_id, start_iso, end_iso)
    completed = T.completed_between(user_id, start_iso, end_iso)
    time_summary = TT.summary(user_id, start_iso, end_iso)
    sessions = F.list_sessions(user_id, since=start_iso, limit=500, session_type="focus")

    by_day: dict[str, dict[str, Any]] = {}
    for i in range(span):
        d = (start_date + timedelta(days=i)).isoformat()
        by_day[d] = {"day": d, "completed": 0, "focus_minutes": 0.0}
    for t in completed:
        key = str(t["completed_at"])[:10]
        if key in by_day:
            by_day[key]["completed"] += 1
    for s in sessions:
        key = str(s["started_at"])[:10]
        if key in by_day and s.get("actual_minutes"):
            by_day[key]["focus_minutes"] = round(
                by_day[key]["focus_minutes"] + s["actual_minutes"], 1
            )

    return {
        "window_days": span,
        "start": start_date.isoformat(),
        "end": end_date.isoformat(),
        "tasks_created": len(created),
        "tasks_completed": len(completed),
        "focus_sessions": len(sessions),
        "focus_minutes": round(sum(s.get("actual_minutes") or 0 for s in sessions), 1),
        "tracked_minutes": time_summary["total_minutes"],
        "by_category": time_summary["by_category"],
        "by_day": list(by_day.values()),
        "habits": H.consistency(user_id, start_date, end_date),
        "planned_vs_actual": TT.planned_vs_actual(user_id, start_iso, end_iso),
    }
