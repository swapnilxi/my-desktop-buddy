"""
Productivity insights (Phase 1, section 9).

The rule this module exists to enforce: **an insight is a reading of data
that exists, or it is not offered at all.** Every generator declares how much
evidence it needs, and when the evidence is missing it returns an honest
"not enough data yet" rather than a plausible-sounding sentence.

Nothing here calls an LLM. These are arithmetic observations; Madhav may
phrase them warmly, but he cannot invent them.
"""
from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from typing import Any, Optional

from productivity import focus as F
from productivity import habits as H
from productivity import tasks as T
from productivity import timetracking as TT

INSIGHT_TYPES = (
    "BEST_TIME_OF_DAY",
    "TASK_ESTIMATION",
    "COMPLETION_PATTERN",
    "FOCUS_PATTERN",
    "HABIT_PATTERN",
    "GOAL_PROGRESS",
    "OVERLOAD",
    "CONSISTENCY",
    "DISTRACTION_PATTERN",
)

# Minimum evidence per insight. Deliberately conservative — a "pattern" drawn
# from three data points is a coincidence with a confident voice.
THRESHOLDS = {
    "BEST_TIME_OF_DAY": {"sessions": 8, "distinct_days": 3},
    "TASK_ESTIMATION": {"estimated_tasks": 5},
    "COMPLETION_PATTERN": {"completed_tasks": 10},
    "FOCUS_PATTERN": {"sessions": 5},
    "HABIT_PATTERN": {"habit_days": 7},
    "GOAL_PROGRESS": {"goals": 1},
    "OVERLOAD": {"open_tasks": 5},
    "CONSISTENCY": {"active_days": 5},
    "DISTRACTION_PATTERN": {"sessions": 6},
}

_PERIODS = (
    ("morning", 5, 12),
    ("afternoon", 12, 17),
    ("evening", 17, 22),
    ("night", 22, 29),   # 22:00–04:59, wrapped
)


def _local_hour(iso: str) -> int:
    dt = datetime.fromisoformat(str(iso).replace("Z", "+00:00"))
    if not dt.tzinfo:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone().hour


def _period_for(hour: int) -> str:
    for name, start, end in _PERIODS:
        hi = hour + 24 if hour < 5 else hour
        if start <= hi < end:
            return name
    return "night"


def _insufficient(kind: str, message: str, have: Any = None) -> dict[str, Any]:
    return {
        "type": kind,
        "available": False,
        "message": message,
        "needs": THRESHOLDS.get(kind),
        "have": have,
        "data": None,
    }


def _insight(kind: str, message: str, data: dict[str, Any]) -> dict[str, Any]:
    return {"type": kind, "available": True, "message": message, "data": data,
            "needs": THRESHOLDS.get(kind), "have": None}


# ── Individual insights ──────────────────────────────────────────────────
def best_time_of_day(user_id: str, since_iso: str) -> dict[str, Any]:
    sessions = [
        s for s in F.list_sessions(user_id, since=since_iso, limit=500,
                                   session_type="focus")
        if s.get("actual_minutes")
    ]
    days = {str(s["started_at"])[:10] for s in sessions}
    need = THRESHOLDS["BEST_TIME_OF_DAY"]
    if len(sessions) < need["sessions"] or len(days) < need["distinct_days"]:
        return _insufficient(
            "BEST_TIME_OF_DAY",
            "I don't have enough data yet to know your best working hours. "
            f"I have {len(sessions)} focus session(s) across {len(days)} day(s); "
            f"I need at least {need['sessions']} across {need['distinct_days']} days.",
            {"sessions": len(sessions), "distinct_days": len(days)},
        )

    buckets: dict[str, dict[str, float]] = defaultdict(
        lambda: {"minutes": 0.0, "sessions": 0, "completed": 0}
    )
    for s in sessions:
        period = _period_for(_local_hour(s["started_at"]))
        buckets[period]["minutes"] += s["actual_minutes"] or 0
        buckets[period]["sessions"] += 1
        buckets[period]["completed"] += 1 if s.get("completed") else 0

    ranked = sorted(buckets.items(), key=lambda kv: -kv[1]["minutes"])
    top, top_data = ranked[0]
    detail = {
        period: {
            "minutes": round(v["minutes"], 1),
            "sessions": int(v["sessions"]),
            "completion_rate": (
                round(v["completed"] * 100 / v["sessions"], 1) if v["sessions"] else 0.0
            ),
        }
        for period, v in buckets.items()
    }
    message = (
        f"Most of your focused time lands in the {top} — "
        f"{round(top_data['minutes'], 1)} minutes across "
        f"{int(top_data['sessions'])} session(s)."
    )
    if len(ranked) > 1:
        second, second_data = ranked[1]
        if top_data["minutes"] >= second_data["minutes"] * 1.5:
            message += f" Your {second} is noticeably lighter."
    return _insight("BEST_TIME_OF_DAY", message,
                    {"best_period": top, "by_period": detail})


def task_estimation(user_id: str, since_iso: str, until_iso: str) -> dict[str, Any]:
    pva = TT.planned_vs_actual(user_id, since_iso, until_iso)
    need = THRESHOLDS["TASK_ESTIMATION"]["estimated_tasks"]
    if pva["tasks_with_estimates"] < need or not pva["ratio"]:
        return _insufficient(
            "TASK_ESTIMATION",
            "Not enough estimated tasks yet to say how your estimates run. "
            f"I have {pva['tasks_with_estimates']}; I need {need}.",
            {"tasks_with_estimates": pva["tasks_with_estimates"]},
        )
    ratio = pva["ratio"]
    if ratio >= 1.25:
        message = (
            f"Your tasks take about {round(ratio, 2)}× your estimate. "
            "Padding estimates by roughly "
            f"{int(round((ratio - 1) * 100))}% would make your plans hold."
        )
    elif ratio <= 0.8:
        message = (
            f"You finish tasks in about {round(ratio, 2)}× your estimate — you are "
            "budgeting more time than the work needs."
        )
    else:
        message = f"Your estimates are close to reality ({round(ratio, 2)}× on average)."
    return _insight("TASK_ESTIMATION", message, pva)


def completion_pattern(user_id: str, since_iso: str, until_iso: str) -> dict[str, Any]:
    completed = T.completed_between(user_id, since_iso, until_iso)
    need = THRESHOLDS["COMPLETION_PATTERN"]["completed_tasks"]
    if len(completed) < need:
        return _insufficient(
            "COMPLETION_PATTERN",
            f"I've only seen {len(completed)} completed task(s); I need {need} "
            "before I can call anything a pattern.",
            {"completed_tasks": len(completed)},
        )

    by_weekday: dict[str, int] = defaultdict(int)
    by_period: dict[str, int] = defaultdict(int)
    for t in completed:
        stamp = str(t["completed_at"])
        dt = datetime.fromisoformat(stamp.replace("Z", "+00:00"))
        if not dt.tzinfo:
            dt = dt.replace(tzinfo=timezone.utc)
        local = dt.astimezone()
        by_weekday[local.strftime("%A")] += 1
        by_period[_period_for(local.hour)] += 1

    best_day = max(by_weekday.items(), key=lambda kv: kv[1])
    best_period = max(by_period.items(), key=lambda kv: kv[1])
    return _insight(
        "COMPLETION_PATTERN",
        f"You close the most work on {best_day[0]}s ({best_day[1]} task(s)), "
        f"and most often in the {best_period[0]}.",
        {"by_weekday": dict(by_weekday), "by_period": dict(by_period),
         "total": len(completed)},
    )


def focus_pattern(user_id: str, since_iso: str) -> dict[str, Any]:
    sessions = [
        s for s in F.list_sessions(user_id, since=since_iso, limit=500,
                                   session_type="focus")
        if s.get("actual_minutes") is not None
    ]
    need = THRESHOLDS["FOCUS_PATTERN"]["sessions"]
    if len(sessions) < need:
        return _insufficient(
            "FOCUS_PATTERN",
            f"Only {len(sessions)} focus session(s) so far; I need {need} to say "
            "anything useful about how you focus.",
            {"sessions": len(sessions)},
        )
    lengths = sorted(s["actual_minutes"] for s in sessions)
    median = lengths[len(lengths) // 2]
    by_category: dict[str, float] = defaultdict(float)
    for s in sessions:
        by_category[s.get("category") or "OTHER"] += s["actual_minutes"]
    top_category = max(by_category.items(), key=lambda kv: kv[1])
    return _insight(
        "FOCUS_PATTERN",
        f"Your typical focus session runs about {median:g} minutes, and most of "
        f"that time goes to {top_category[0].replace('_', ' ').lower()}.",
        {"median_minutes": median, "sessions": len(sessions),
         "by_category": {k: round(v, 1) for k, v in by_category.items()}},
    )


def habit_pattern(user_id: str, start: date, end: date) -> dict[str, Any]:
    data = H.consistency(user_id, start, end)
    tracked = [h for h in data["habits"] if h["expected"] >= 3]
    need = THRESHOLDS["HABIT_PATTERN"]["habit_days"]
    if not tracked or max((h["expected"] for h in tracked), default=0) < need:
        return _insufficient(
            "HABIT_PATTERN",
            "Your habits haven't been running long enough for me to see a pattern yet.",
            {"tracked_habits": len(tracked)},
        )
    strongest = max(tracked, key=lambda h: h["percentage"])
    weakest = min(tracked, key=lambda h: h["percentage"])
    message = f"{strongest['name']} is your steadiest habit at {strongest['percentage']}%."
    if weakest["id"] != strongest["id"] and weakest["percentage"] < strongest["percentage"]:
        message += (
            f" {weakest['name']} is at {weakest['percentage']}% — worth making smaller "
            "rather than dropping."
        )
    return _insight("HABIT_PATTERN", message, data)


def goal_progress(user_id: str) -> dict[str, Any]:
    from productivity import goals as G

    active = G.list_goals(user_id, status="ACTIVE")
    if not active:
        return _insufficient(
            "GOAL_PROGRESS",
            "No active goals yet, so there is nothing to measure progress against.",
            {"goals": 0},
        )
    ranked = sorted(active, key=lambda g: g["progress"])
    lagging = ranked[0]
    leading = ranked[-1]
    message = f"“{leading['title']}” is your furthest along at {leading['progress']}%."
    if lagging["id"] != leading["id"]:
        message += (
            f" “{lagging['title']}” is at {lagging['progress']}%"
            + (
                " and has no tasks attached to it yet."
                if lagging["task_counts"]["total"] == 0
                else f" with {lagging['task_counts']['open']} open task(s)."
            )
        )
    return _insight("GOAL_PROGRESS", message, {
        "goals": [
            {"id": g["id"], "title": g["title"], "progress": g["progress"],
             "open_tasks": g["task_counts"]["open"]}
            for g in active
        ]
    })


def overload(user_id: str) -> dict[str, Any]:
    open_tasks = T.list_tasks(user_id, status="open", include_subtasks=False)
    need = THRESHOLDS["OVERLOAD"]["open_tasks"]
    if len(open_tasks) < need:
        return _insufficient(
            "OVERLOAD",
            f"Only {len(open_tasks)} open task(s) — nothing that looks like overload.",
            {"open_tasks": len(open_tasks)},
        )
    today = date.today().isoformat()
    overdue = [t for t in open_tasks if (t.get("due_date") or "")[:10] and
               (t["due_date"] or "")[:10] < today]
    due_today = [t for t in open_tasks if (t.get("due_date") or "")[:10] == today]
    estimated = sum(
        t.get("estimated_minutes") or 0 for t in open_tasks if t.get("estimated_minutes")
    )
    parts = [f"{len(open_tasks)} tasks are open"]
    if overdue:
        parts.append(f"{len(overdue)} past their due date")
    if due_today:
        parts.append(f"{len(due_today)} due today")
    message = ", ".join(parts) + "."
    if estimated:
        message += f" The ones with estimates add up to {round(estimated / 60, 1)} hours."
    return _insight("OVERLOAD", message, {
        "open": len(open_tasks), "overdue": len(overdue), "due_today": len(due_today),
        "estimated_minutes": estimated,
    })


def consistency(user_id: str, since_iso: str, until_iso: str, span_days: int) -> dict[str, Any]:
    completed = T.completed_between(user_id, since_iso, until_iso)
    sessions = F.list_sessions(user_id, since=since_iso, limit=500, session_type="focus")
    active_days = {str(t["completed_at"])[:10] for t in completed}
    active_days |= {str(s["started_at"])[:10] for s in sessions if s.get("actual_minutes")}
    need = THRESHOLDS["CONSISTENCY"]["active_days"]
    if len(active_days) < need:
        return _insufficient(
            "CONSISTENCY",
            f"You've been active on {len(active_days)} day(s) so far; I need {need} "
            "before consistency means anything.",
            {"active_days": len(active_days)},
        )
    rate = round(len(active_days) * 100 / span_days, 1)
    return _insight(
        "CONSISTENCY",
        f"You showed up on {len(active_days)} of the last {span_days} days ({rate}%).",
        {"active_days": len(active_days), "span_days": span_days, "rate": rate},
    )


def distraction_pattern(user_id: str, since_iso: str) -> dict[str, Any]:
    sessions = [
        s for s in F.list_sessions(user_id, since=since_iso, limit=500,
                                   session_type="focus")
        if s.get("ended_at")
    ]
    need = THRESHOLDS["DISTRACTION_PATTERN"]["sessions"]
    if len(sessions) < need:
        return _insufficient(
            "DISTRACTION_PATTERN",
            f"I've seen {len(sessions)} finished focus session(s); I need {need} "
            "before I can tell abandoned sessions from a bad afternoon.",
            {"sessions": len(sessions)},
        )
    abandoned = [s for s in sessions if not s.get("completed")]
    rate = round(len(abandoned) * 100 / len(sessions), 1)
    if not abandoned:
        message = f"You ran all {len(sessions)} of your focus sessions to the end."
    else:
        short = [s for s in abandoned if (s.get("actual_minutes") or 0) < 10]
        message = (
            f"{len(abandoned)} of {len(sessions)} focus sessions ({rate}%) ended early."
        )
        if short:
            message += f" {len(short)} of those stopped inside the first 10 minutes."
    return _insight("DISTRACTION_PATTERN", message, {
        "sessions": len(sessions), "abandoned": len(abandoned), "rate": rate,
    })


# ── Orchestration ────────────────────────────────────────────────────────
def generate(user_id: str, days: int = 30,
             types: Optional[list[str]] = None) -> dict[str, Any]:
    """
    Run every insight generator over the last `days` days.

    Insights that lack data are returned too, in `insufficient`, so the UI can
    say what it is still waiting for instead of showing an empty panel.
    """
    span = max(1, min(int(days), 365))
    end_date = date.today()
    start_date = end_date - timedelta(days=span - 1)
    since_iso, _ = TT.day_bounds(start_date.isoformat())
    _, until_iso = TT.day_bounds(end_date.isoformat())

    wanted = set(types) if types else set(INSIGHT_TYPES)
    unknown = wanted - set(INSIGHT_TYPES)
    if unknown:
        raise ValueError(f"Unknown insight type(s): {', '.join(sorted(unknown))}")

    produced: list[dict[str, Any]] = []
    if "BEST_TIME_OF_DAY" in wanted:
        produced.append(best_time_of_day(user_id, since_iso))
    if "TASK_ESTIMATION" in wanted:
        produced.append(task_estimation(user_id, since_iso, until_iso))
    if "COMPLETION_PATTERN" in wanted:
        produced.append(completion_pattern(user_id, since_iso, until_iso))
    if "FOCUS_PATTERN" in wanted:
        produced.append(focus_pattern(user_id, since_iso))
    if "HABIT_PATTERN" in wanted:
        produced.append(habit_pattern(user_id, start_date, end_date))
    if "GOAL_PROGRESS" in wanted:
        produced.append(goal_progress(user_id))
    if "OVERLOAD" in wanted:
        produced.append(overload(user_id))
    if "CONSISTENCY" in wanted:
        produced.append(consistency(user_id, since_iso, until_iso, span))
    if "DISTRACTION_PATTERN" in wanted:
        produced.append(distraction_pattern(user_id, since_iso))

    available = [i for i in produced if i["available"]]
    missing = [i for i in produced if not i["available"]]
    return {
        "window_days": span,
        "start": start_date.isoformat(),
        "end": end_date.isoformat(),
        "insights": available,
        "insufficient": missing,
        "insight_types": list(INSIGHT_TYPES),
        "message": (
            None if available else
            "I don't have enough data yet to tell you anything about how you work. "
            "Give me a few more days of tasks and focus sessions."
        ),
    }
