"""
The productivity brief injected into Madhav's system prompt.

Kept deliberately small and factual. The prompt is not the place to dump the
whole database: what goes in is what this turn plausibly needs, rendered as
plain lines that the model can restate but not embellish. Anything the data
does not support simply is not in the string, so there is nothing to riff on.
"""
from __future__ import annotations

from typing import Any, Optional

from productivity import habits as H
from productivity import stats as S
from productivity import tasks as T


def build_brief(user_id: str, include_plan: bool = False,
                include_insights: bool = False) -> Optional[str]:
    """Returns None when the user has nothing recorded — no empty scaffolding."""
    T.ensure_migrated(user_id)
    lines: list[str] = []

    open_tasks = T.list_tasks(user_id, status="open", include_subtasks=False)
    counts = T.counts(user_id)
    if open_tasks:
        lines.append(f"Open tasks: {counts['open']} ({counts['completed']} completed all-time).")
        for task in S.priority_tasks(user_id, limit=6):
            bits = [f"  - [{task['seq']}] {task['title']} ({task['priority']}"]
            if task.get("due_date"):
                bits.append(f", due {task['due_date'][:10]}")
            if task.get("estimated_minutes"):
                bits.append(f", est {task['estimated_minutes']}m")
            bits.append(")")
            lines.append("".join(bits))
    elif counts["completed"]:
        lines.append(f"No open tasks. {counts['completed']} completed all-time.")

    from productivity import goals as G

    active_goals = G.list_goals(user_id, status="ACTIVE")
    if active_goals:
        lines.append("Goals:")
        for goal in active_goals[:5]:
            lines.append(
                f"  - {goal['title']} — {goal['progress']}% "
                f"({goal['task_counts']['open']} open task(s))"
            )

    habit_list = H.list_habits(user_id)
    if habit_list:
        done = [h for h in habit_list if h["done_today"]]
        pending = [h for h in habit_list if not h["done_today"]]
        lines.append(
            f"Habits today: {len(done)}/{len(habit_list)} done."
            + (f" Not yet: {', '.join(h['name'] for h in pending[:5])}." if pending else "")
        )
        for habit in habit_list[:5]:
            if habit["streak"]:
                lines.append(
                    f"  - {habit['name']}: {habit['streak']}-day streak "
                    f"(best {habit['best_streak']})"
                )

    from productivity import focus as F
    from productivity import timetracking as TT

    active = F.active_session(user_id)
    if active:
        lines.append(
            f"A focus session is RUNNING right now: {active.get('activity') or 'unnamed'}"
            f" ({active['planned_minutes']:g} min planned)."
        )
    day_start, day_end = TT.day_bounds()
    today_focus = S._focus_summary(user_id, day_start, day_end)
    if today_focus["sessions_today"]:
        lines.append(
            f"Focus today: {today_focus['minutes_today']:g} minutes across "
            f"{today_focus['sessions_today']} session(s)."
        )

    if include_plan:
        from productivity import planning as P

        saved = P.get_plan(user_id)
        if saved and saved["blocks"]:
            lines.append("Today's saved plan:")
            for block in saved["blocks"]:
                if block.get("type") == "break":
                    continue
                lines.append(f"  - {block.get('title')} ({block.get('minutes')} min)")

    if include_insights:
        from productivity import insights as I

        result = I.generate(user_id, days=30)
        if result["insights"]:
            lines.append("Observed patterns (data-derived — do not invent others):")
            lines.extend(f"  - {i['message']}" for i in result["insights"][:4])
        else:
            lines.append(
                "No productivity patterns are established yet — say so plainly if "
                "asked, and do not guess at their habits."
            )

    if not lines:
        return None

    lines.append(
        "These numbers are the only productivity facts you have. Do not invent "
        "tasks, streaks, times or trends that are not listed here."
    )
    return "\n".join(lines)


def plan_brief(user_id: str, available_minutes: Optional[int] = None) -> dict[str, Any]:
    """Build (but do not save) a plan, plus its prompt rendering."""
    from productivity import planning as P

    plan = P.build_plan(user_id, available_minutes=available_minutes)
    return {"plan": plan, "text": P.plan_summary_text(plan)}
