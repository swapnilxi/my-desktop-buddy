"""
Weekly review (Phase 1, section 8).

Every line in `observations` is derived from a number computed just above it.
There is no generator here that can produce a behavioural claim without the
data to back it — if the week is empty, the review says the week is empty.

The week runs Monday–Sunday, which is what "this week" means to most people
looking back on Sunday evening.
"""
from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from typing import Any, Optional

from productivity import focus as F
from productivity import habits as H
from productivity import insights as I
from productivity import tasks as T
from productivity import timetracking as TT

LONG_TASK_MINUTES = 90


def _local(stamp: str) -> datetime:
    dt = datetime.fromisoformat(str(stamp).replace("Z", "+00:00"))
    if not dt.tzinfo:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone()


def weekly_review(user_id: str, day: Optional[str] = None) -> dict[str, Any]:
    T.ensure_migrated(user_id)
    start_iso, end_iso, monday, sunday = TT.week_bounds(day)

    created = T.created_between(user_id, start_iso, end_iso)
    completed = T.completed_between(user_id, start_iso, end_iso)
    sessions = [
        s for s in F.list_sessions(user_id, since=start_iso, limit=500,
                                   session_type="focus")
        if s.get("started_at", "") < end_iso
    ]
    finished_sessions = [s for s in sessions if s.get("actual_minutes")]
    focus_minutes = round(sum(s["actual_minutes"] for s in finished_sessions), 1)

    # Tasks that were on the plate this week: created this week, or open and
    # created earlier. "Planned" means work that existed to be done.
    open_now = T.list_tasks(user_id, status="open", include_subtasks=False)
    carried_in = [t for t in open_now if str(t["created_at"]) < start_iso]
    planned_count = len(created) + len(carried_in)
    completion_pct = (
        round(len(completed) * 100 / planned_count, 1) if planned_count else None
    )

    by_day: dict[str, dict[str, Any]] = {}
    for i in range(7):
        d = (monday + timedelta(days=i)).isoformat()
        by_day[d] = {"day": d, "weekday": (monday + timedelta(days=i)).strftime("%A"),
                     "completed": 0, "focus_minutes": 0.0}
    for t in completed:
        key = _local(t["completed_at"]).date().isoformat()
        if key in by_day:
            by_day[key]["completed"] += 1
    for s in finished_sessions:
        key = _local(s["started_at"]).date().isoformat()
        if key in by_day:
            by_day[key]["focus_minutes"] = round(
                by_day[key]["focus_minutes"] + s["actual_minutes"], 1
            )

    by_period: dict[str, dict[str, float]] = defaultdict(
        lambda: {"focus_minutes": 0.0, "completed": 0}
    )
    for s in finished_sessions:
        by_period[I._period_for(_local(s["started_at"]).hour)]["focus_minutes"] += \
            s["actual_minutes"]
    for t in completed:
        by_period[I._period_for(_local(t["completed_at"]).hour)]["completed"] += 1

    habit_data = H.consistency(user_id, monday, min(sunday, date.today()))

    from productivity import goals as G

    goals = G.list_goals(user_id)
    goal_progress = [
        {"id": g["id"], "title": g["title"], "progress": g["progress"],
         "status": g["status"],
         "completed_this_week": sum(
             1 for t in completed if t.get("goal_id") == g["id"]
         )}
        for g in goals
    ]

    unfinished_important = [
        {"id": t["id"], "seq": t["seq"], "title": t["title"],
         "priority": t["priority"], "due_date": t["due_date"],
         "estimated_minutes": t.get("estimated_minutes")}
        for t in open_now
        if t["priority"] in {"HIGH", "CRITICAL"}
        or ((t.get("due_date") or "")[:10] and (t["due_date"] or "")[:10] <= sunday.isoformat())
    ][:10]

    strongest_day = max(
        by_day.values(),
        key=lambda d: (d["completed"], d["focus_minutes"]),
    ) if by_day else None
    if strongest_day and strongest_day["completed"] == 0 and strongest_day["focus_minutes"] == 0:
        strongest_day = None

    most_productive_period = None
    if by_period:
        ranked = sorted(by_period.items(), key=lambda kv: -kv[1]["focus_minutes"])
        if ranked[0][1]["focus_minutes"] > 0:
            most_productive_period = {
                "period": ranked[0][0],
                "focus_minutes": round(ranked[0][1]["focus_minutes"], 1),
                "completed": int(ranked[0][1]["completed"]),
            }

    review: dict[str, Any] = {
        "week_start": monday.isoformat(),
        "week_end": sunday.isoformat(),
        "tasks_planned": planned_count,
        "tasks_created": len(created),
        "tasks_completed": len(completed),
        "completion_percentage": completion_pct,
        "focus_hours": round(focus_minutes / 60, 2),
        "focus_minutes": focus_minutes,
        "focus_sessions": len(finished_sessions),
        "habit_consistency": habit_data,
        "goal_progress": goal_progress,
        "most_productive_period": most_productive_period,
        "strongest_day": strongest_day,
        "unfinished_important": unfinished_important,
        "by_day": list(by_day.values()),
        "by_period": {k: {"focus_minutes": round(v["focus_minutes"], 1),
                          "completed": int(v["completed"])}
                      for k, v in by_period.items()},
        "planned_vs_actual": TT.planned_vs_actual(user_id, start_iso, end_iso),
        "has_data": bool(completed or finished_sessions or created),
    }
    review["observations"] = _observations(review, completed, finished_sessions, open_now)
    return review


def _observations(review: dict[str, Any], completed: list[dict[str, Any]],
                  sessions: list[dict[str, Any]],
                  open_now: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Data-derived observations only.

    Each one names the evidence it came from, so nothing in this list can be
    mistaken for intuition about the user.
    """
    out: list[dict[str, Any]] = []

    if not review["has_data"]:
        return [{
            "kind": "NO_DATA",
            "text": (
                "There's nothing recorded for this week yet — no completed tasks and "
                "no focus sessions. I'd rather say that than invent a review."
            ),
            "evidence": {"tasks_completed": 0, "focus_sessions": 0},
        }]

    periods = review["by_period"]
    if len(periods) >= 2:
        ranked = sorted(periods.items(), key=lambda kv: -kv[1]["focus_minutes"])
        top, top_v = ranked[0]
        bottom, bottom_v = ranked[-1]
        if top_v["focus_minutes"] >= max(30.0, bottom_v["focus_minutes"] * 1.5):
            out.append({
                "kind": "TIME_OF_DAY",
                "text": (
                    f"Your {top}s were consistently stronger than your {bottom}s this "
                    f"week — {top_v['focus_minutes']:g} focused minutes against "
                    f"{bottom_v['focus_minutes']:g}."
                ),
                "evidence": {"by_period": periods},
            })

    long_unfinished = [
        t for t in open_now
        if (t.get("estimated_minutes") or 0) >= LONG_TASK_MINUTES
    ]
    long_completed = [
        t for t in completed if (t.get("estimated_minutes") or 0) >= LONG_TASK_MINUTES
    ]
    if long_unfinished and not long_completed and len(long_unfinished) >= 2:
        out.append({
            "kind": "TASK_SIZE",
            "text": (
                f"All {len(long_unfinished)} of your unfinished tasks with an estimate "
                f"are {LONG_TASK_MINUTES} minutes or longer. Splitting them into "
                "smaller pieces is usually what unsticks that."
            ),
            "evidence": {"unfinished_long": [t["title"] for t in long_unfinished[:5]]},
        })

    strongest = review["strongest_day"]
    if strongest and strongest["completed"] >= 2:
        out.append({
            "kind": "STRONGEST_DAY",
            "text": (
                f"{strongest['weekday']} was your strongest day — "
                f"{strongest['completed']} task(s) closed and "
                f"{strongest['focus_minutes']:g} focused minutes."
            ),
            "evidence": {"day": strongest},
        })

    pva = review["planned_vs_actual"]
    if pva["ratio"] and pva["tasks_with_estimates"] >= 3:
        if pva["ratio"] >= 1.25:
            out.append({
                "kind": "ESTIMATION",
                "text": (
                    f"Work took about {pva['ratio']}× as long as you estimated across "
                    f"{pva['tasks_with_estimates']} task(s)."
                ),
                "evidence": pva,
            })
        elif pva["ratio"] <= 0.8:
            out.append({
                "kind": "ESTIMATION",
                "text": (
                    f"You finished work in about {pva['ratio']}× your estimates — you "
                    "are budgeting more time than these tasks need."
                ),
                "evidence": pva,
            })

    habits = review["habit_consistency"]
    if habits["tracked_habits"] and habits["overall_percentage"] is not None:
        out.append({
            "kind": "HABITS",
            "text": (
                f"Habits ran at {habits['overall_percentage']}% this week across "
                f"{habits['tracked_habits']} habit(s)."
            ),
            "evidence": habits,
        })

    abandoned = [s for s in sessions if not s.get("completed")]
    if len(sessions) >= 4 and abandoned:
        out.append({
            "kind": "FOCUS_COMPLETION",
            "text": (
                f"{len(abandoned)} of {len(sessions)} focus sessions ended early "
                "this week."
            ),
            "evidence": {"sessions": len(sessions), "abandoned": len(abandoned)},
        })

    if not out:
        out.append({
            "kind": "THIN_DATA",
            "text": (
                "There's some activity this week but not enough shape to it for me to "
                "call out a pattern honestly. A few more days and there will be."
            ),
            "evidence": {"tasks_completed": review["tasks_completed"],
                         "focus_sessions": review["focus_sessions"]},
        })
    return out
