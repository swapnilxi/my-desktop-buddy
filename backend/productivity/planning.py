"""
Plan My Day (Phase 1, section 6).

The plan is built from data the app already has — open tasks, their
priorities and deadlines, the goals they serve, habits not yet done, and how
much time is actually left in the day — and it deliberately does not fill
every minute:

  * at most `SCHEDULE_FRACTION` of the available time is scheduled,
  * a break follows every long focus block,
  * work that does not fit is returned as `unscheduled` rather than crammed in.

Where the day's hours cannot be known (the user did not say, and it is late),
the plan says how much time it assumed instead of pretending to know.
"""
from __future__ import annotations

from datetime import date, datetime, time, timedelta
from typing import Any, Optional

from db import dump_json, get_conn, load_json, new_id, now_iso
from productivity import habits as H
from productivity import tasks as T

# Never schedule the whole day: the rest is buffer for overrun, interruptions
# and the things that were never on the list.
SCHEDULE_FRACTION = 0.75
DEFAULT_DAY_END_HOUR = 21
MAX_AVAILABLE_MINUTES = 10 * 60
QUICK_TASK_MINUTES = 20
LONG_BLOCK_MINUTES = 45
SHORT_BREAK = 5
LONG_BREAK = 10

# Used only when a task carries no estimate. Reported as an assumption, never
# presented as something the user said.
_DEFAULT_ESTIMATE = {"CRITICAL": 60, "HIGH": 60, "MEDIUM": 45, "LOW": 30}


def available_minutes_now(day: Optional[str] = None,
                          end_hour: int = DEFAULT_DAY_END_HOUR) -> int:
    """Working minutes left today, from now until the evening cut-off."""
    target = date.fromisoformat(day) if day else date.today()
    now = datetime.now()
    if target > now.date():
        return MAX_AVAILABLE_MINUTES
    if target < now.date():
        return 0
    end = datetime.combine(target, time(hour=end_hour))
    remaining = int((end - now).total_seconds() // 60)
    return max(0, min(remaining, MAX_AVAILABLE_MINUTES))


def _estimate_for(task: dict[str, Any]) -> tuple[int, bool]:
    """(minutes, was_assumed)"""
    if task.get("estimated_minutes"):
        return int(task["estimated_minutes"]), False
    return _DEFAULT_ESTIMATE.get(task.get("priority", "MEDIUM"), 45), True


def build_plan(
    user_id: str,
    day: Optional[str] = None,
    available_minutes: Optional[int] = None,
    include_habits: bool = True,
    max_focus_blocks: int = 4,
) -> dict[str, Any]:
    T.ensure_migrated(user_id)
    target = day or date.today().isoformat()

    assumed_time = available_minutes is None
    if available_minutes is None:
        budget = available_minutes_now(target)
    else:
        try:
            budget = int(available_minutes)
        except (TypeError, ValueError):
            raise T.TaskError("available_minutes must be a whole number.")
        if not 0 <= budget <= MAX_AVAILABLE_MINUTES:
            raise T.TaskError(
                f"available_minutes must be between 0 and {MAX_AVAILABLE_MINUTES}."
            )

    from productivity.stats import priority_tasks

    candidates = priority_tasks(user_id, target, limit=40)
    schedulable = int(budget * SCHEDULE_FRACTION)

    from productivity import goals as G

    goal_titles = {g["id"]: g["title"] for g in G.list_goals(user_id)}

    blocks: list[dict[str, Any]] = []
    unscheduled: list[dict[str, Any]] = []
    assumptions: list[str] = []
    used = 0
    focus_blocks = 0

    quick: list[dict[str, Any]] = []
    for task in candidates:
        minutes, assumed = _estimate_for(task)
        if minutes <= QUICK_TASK_MINUTES:
            quick.append({**task, "_minutes": minutes, "_assumed": assumed})
            continue
        if focus_blocks >= max_focus_blocks or used + minutes > schedulable:
            unscheduled.append({
                "id": task["id"], "seq": task["seq"], "title": task["title"],
                "priority": task["priority"], "estimated_minutes": minutes,
                "due_date": task["due_date"],
            })
            continue

        if assumed:
            assumptions.append(f"“{task['title']}” has no estimate — assumed {minutes} min.")
        blocks.append({
            "type": "focus",
            "title": task["title"],
            "minutes": minutes,
            "task_id": task["id"],
            "seq": task["seq"],
            "priority": task["priority"],
            "goal_id": task.get("goal_id"),
            "goal_title": goal_titles.get(task.get("goal_id")),
            "due_date": task.get("due_date"),
            "estimate_assumed": assumed,
        })
        used += minutes
        focus_blocks += 1

        rest = LONG_BREAK if minutes >= LONG_BLOCK_MINUTES else SHORT_BREAK
        if used + rest <= schedulable:
            blocks.append({"type": "break", "title": "Break", "minutes": rest})
            used += rest

    if quick:
        batch_minutes = sum(q["_minutes"] for q in quick)
        if used + batch_minutes <= schedulable:
            blocks.append({
                "type": "quick",
                "title": "Quick tasks",
                "minutes": batch_minutes,
                "items": [
                    {"id": q["id"], "seq": q["seq"], "title": q["title"],
                     "minutes": q["_minutes"]}
                    for q in quick
                ],
            })
            used += batch_minutes
        else:
            unscheduled.extend([
                {"id": q["id"], "seq": q["seq"], "title": q["title"],
                 "priority": q["priority"], "estimated_minutes": q["_minutes"],
                 "due_date": q["due_date"]}
                for q in quick
            ])

    habit_blocks: list[dict[str, Any]] = []
    if include_habits:
        for habit in H.list_habits(user_id):
            if not habit["done_today"]:
                habit_blocks.append({
                    "type": "habit",
                    "title": f"{habit['emoji'] + ' ' if habit['emoji'] else ''}{habit['name']}",
                    "habit_id": habit["id"],
                    "minutes": None,
                    "streak": habit["streak"],
                })

    notes: list[str] = []
    if assumed_time:
        notes.append(
            f"Assumed about {budget} minutes are left today (until "
            f"{DEFAULT_DAY_END_HOUR}:00). Tell me your real number and I'll redo this."
        )
    notes.append(
        f"{used} of {budget} minutes scheduled — the rest is deliberate buffer "
        "for overrun and the things that were never on the list."
    )
    if unscheduled:
        notes.append(
            f"{len(unscheduled)} task(s) did not fit today. They are still on the list."
        )
    notes.extend(assumptions)

    first_focus = next((b for b in blocks if b["type"] == "focus"), None)
    suggestion = None
    if first_focus:
        offer = min(45, first_focus["minutes"])
        suggestion = {
            "task_id": first_focus["task_id"],
            "title": first_focus["title"],
            "minutes": offer,
            "ask": (
                f"“{first_focus['title']}” is the one that matters most. "
                f"Want to give it the first {offer} minutes?"
            ),
        }

    return {
        "day": target,
        "available_minutes": budget,
        "available_minutes_assumed": assumed_time,
        "schedulable_minutes": schedulable,
        "planned_minutes": used,
        "buffer_minutes": max(0, budget - used),
        "blocks": blocks,
        "habits": habit_blocks,
        "unscheduled": unscheduled,
        "suggestion": suggestion,
        "notes": notes,
        "empty": not blocks and not habit_blocks,
    }


def save_plan(user_id: str, day: Optional[str], blocks: list[dict[str, Any]],
              notes: Optional[str] = None, source: str = "generated") -> dict[str, Any]:
    target = day or date.today().isoformat()
    from db import ensure_user

    ensure_user(user_id)
    ts = now_iso()
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO daily_plans (id, user_id, day, blocks, notes, source,"
            " created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)"
            " ON CONFLICT(user_id, day) DO UPDATE SET blocks = excluded.blocks,"
            " notes = excluded.notes, source = excluded.source,"
            " updated_at = excluded.updated_at",
            (new_id(), user_id, target, dump_json(blocks), notes, source, ts, ts),
        )
        row = conn.execute(
            "SELECT * FROM daily_plans WHERE user_id = ? AND day = ?", (user_id, target)
        ).fetchone()
    plan = dict(row)
    plan["blocks"] = load_json(plan["blocks"], [])
    return plan


def get_plan(user_id: str, day: Optional[str] = None) -> Optional[dict[str, Any]]:
    target = day or date.today().isoformat()
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM daily_plans WHERE user_id = ? AND day = ?", (user_id, target)
        ).fetchone()
    if row is None:
        return None
    plan = dict(row)
    plan["blocks"] = load_json(plan["blocks"], [])
    return plan


def plan_summary_text(plan: dict[str, Any]) -> str:
    """
    A compact rendering of the plan for the system prompt.

    Deliberately plain: Madhav writes the greeting, this only carries facts.
    """
    if plan.get("empty"):
        return "No open tasks to plan around today."
    lines = [f"Available: ~{plan['available_minutes']} min; "
             f"scheduled {plan['planned_minutes']} min, "
             f"{plan['buffer_minutes']} min buffer."]
    n = 0
    for block in plan["blocks"]:
        if block["type"] == "break":
            continue
        n += 1
        if block["type"] == "quick":
            names = ", ".join(i["title"] for i in block.get("items", [])[:5])
            lines.append(f"  {n}. Quick tasks ({block['minutes']} min): {names}")
        else:
            goal = f" [goal: {block['goal_title']}]" if block.get("goal_title") else ""
            lines.append(f"  {n}. {block['title']} — {block['minutes']} min"
                         f" ({block['priority']}){goal}")
    for habit in plan.get("habits", []):
        lines.append(f"  · habit not done yet: {habit['title']}")
    if plan.get("unscheduled"):
        lines.append(f"  Did not fit: {', '.join(u['title'] for u in plan['unscheduled'][:5])}")
    lines.extend(f"  note: {note}" for note in plan.get("notes", []))
    return "\n".join(lines)
