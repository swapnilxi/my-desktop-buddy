"""
Habits, logs and streaks (Phase 1, section 3).

Design note the spec is explicit about: **no shaming**. This module computes
numbers — streak, best streak, completion rate, missed days — and nothing
here writes copy that scolds. The one piece of language it does produce is
the restart line for a broken streak, and it is deliberately neutral:

    "Yesterday slipped. No problem — today is a fresh start."

`missed_days` counts days the habit was *expected* and not logged, starting
from the habit's creation date. A weekly habit is never "missed" on a
specific day, so for weekly habits the number reported is missed weeks.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any, Optional

from db import ensure_user, get_conn, new_id, now_iso

FREQUENCIES = ("daily", "weekly")


class HabitError(ValueError):
    """Invalid habit input."""


def _today() -> date:
    return date.today()


def _parse_day(value: Optional[str]) -> date:
    if not value:
        return _today()
    try:
        return datetime.strptime(str(value).strip(), "%Y-%m-%d").date()
    except ValueError:
        raise HabitError(f"{value!r} is not a valid day. Use YYYY-MM-DD.")


def normalize_frequency(value: Optional[str]) -> str:
    freq = (value or "daily").strip().lower()
    if freq in {"day", "everyday", "every_day"}:
        freq = "daily"
    if freq in {"week", "every_week"}:
        freq = "weekly"
    if freq not in FREQUENCIES:
        raise HabitError(f"frequency must be one of: {', '.join(FREQUENCIES)}.")
    return freq


def create_habit(user_id: str, name: str, emoji: Optional[str] = None,
                 frequency: Optional[str] = None,
                 target_per_week: Optional[int] = None,
                 goal_id: Optional[str] = None) -> dict[str, Any]:
    clean = (name or "").strip()
    if not clean:
        raise HabitError("A habit needs a name.")
    if len(clean) > 200:
        raise HabitError("Habit names are limited to 200 characters.")
    freq = normalize_frequency(frequency)

    if target_per_week is None:
        target = 7 if freq == "daily" else 1
    else:
        try:
            target = int(target_per_week)
        except (TypeError, ValueError):
            raise HabitError("target_per_week must be a whole number.")
        if not 1 <= target <= 7:
            raise HabitError("target_per_week must be between 1 and 7.")

    ensure_user(user_id)
    habit_id = new_id()
    ts = now_iso()
    with get_conn() as conn:
        existing = conn.execute(
            "SELECT id FROM habits WHERE user_id = ? AND LOWER(name) = ? AND archived = 0",
            (user_id, clean.lower()),
        ).fetchone()
        if existing is not None:
            raise HabitError(f"You already have a habit called {clean!r}.")
        conn.execute(
            "INSERT INTO habits (id, user_id, name, emoji, frequency, target_per_week,"
            " goal_id, archived, created_at, updated_at) VALUES (?,?,?,?,?,?,?,0,?,?)",
            (habit_id, user_id, clean, emoji, freq, target, goal_id, ts, ts),
        )
    return get_habit(user_id, habit_id)  # type: ignore[return-value]


def _find(conn: Any, user_id: str, ref: str) -> Any:
    row = conn.execute(
        "SELECT * FROM habits WHERE user_id = ? AND id = ?", (user_id, ref)
    ).fetchone()
    if row is not None:
        return row
    return conn.execute(
        "SELECT * FROM habits WHERE user_id = ? AND LOWER(name) = ? AND archived = 0"
        " ORDER BY created_at LIMIT 1",
        (user_id, str(ref).strip().lower()),
    ).fetchone()


def get_habit(user_id: str, ref: str, days: int = 30) -> Optional[dict[str, Any]]:
    with get_conn() as conn:
        row = _find(conn, user_id, ref)
        if row is None:
            return None
        logs = conn.execute(
            "SELECT day, done, note FROM habit_logs WHERE habit_id = ? ORDER BY day",
            (row["id"],),
        ).fetchall()
    return _shape(row, [dict(r) for r in logs], days=days)


def list_habits(user_id: str, include_archived: bool = False,
                days: int = 30) -> list[dict[str, Any]]:
    sql = "SELECT * FROM habits WHERE user_id = ?"
    args: list[Any] = [user_id]
    if not include_archived:
        sql += " AND archived = 0"
    sql += " ORDER BY created_at"
    with get_conn() as conn:
        rows = conn.execute(sql, args).fetchall()
        out = []
        for row in rows:
            logs = conn.execute(
                "SELECT day, done, note FROM habit_logs WHERE habit_id = ? ORDER BY day",
                (row["id"],),
            ).fetchall()
            out.append(_shape(row, [dict(r) for r in logs], days=days))
    return out


def log_habit(user_id: str, ref: str, day: Optional[str] = None,
              done: bool = True, note: Optional[str] = None) -> Optional[dict[str, Any]]:
    """Log (or un-log) a habit for a day. Re-logging the same day overwrites."""
    target = _parse_day(day)
    if target > _today():
        raise HabitError("You cannot log a habit for a future day.")

    with get_conn() as conn:
        row = _find(conn, user_id, ref)
        if row is None:
            return None
        conn.execute(
            "INSERT INTO habit_logs (id, habit_id, user_id, day, done, note, created_at)"
            " VALUES (?,?,?,?,?,?,?)"
            " ON CONFLICT(habit_id, day) DO UPDATE SET done = excluded.done,"
            " note = COALESCE(excluded.note, habit_logs.note)",
            (new_id(), row["id"], user_id, target.isoformat(), 1 if done else 0,
             note, now_iso()),
        )
    return get_habit(user_id, row["id"])


def update_habit(user_id: str, ref: str, **fields: Any) -> Optional[dict[str, Any]]:
    allowed = {"name", "emoji", "frequency", "target_per_week", "goal_id", "archived"}
    unknown = set(fields) - allowed
    if unknown:
        raise HabitError(f"Cannot update: {', '.join(sorted(unknown))}.")

    with get_conn() as conn:
        row = _find(conn, user_id, ref)
        if row is None:
            return None
        sets: list[str] = []
        args: list[Any] = []
        if "name" in fields:
            name = (fields["name"] or "").strip()
            if not name:
                raise HabitError("A habit needs a name.")
            sets.append("name = ?")
            args.append(name)
        if "emoji" in fields:
            sets.append("emoji = ?")
            args.append(fields["emoji"])
        if "frequency" in fields:
            sets.append("frequency = ?")
            args.append(normalize_frequency(fields["frequency"]))
        if "target_per_week" in fields and fields["target_per_week"] is not None:
            target = int(fields["target_per_week"])
            if not 1 <= target <= 7:
                raise HabitError("target_per_week must be between 1 and 7.")
            sets.append("target_per_week = ?")
            args.append(target)
        if "goal_id" in fields:
            sets.append("goal_id = ?")
            args.append(fields["goal_id"] or None)
        if "archived" in fields:
            sets.append("archived = ?")
            args.append(1 if fields["archived"] else 0)
        if sets:
            sets.append("updated_at = ?")
            args.extend([now_iso(), row["id"]])
            conn.execute(f"UPDATE habits SET {', '.join(sets)} WHERE id = ?", args)
    return get_habit(user_id, row["id"])


def delete_habit(user_id: str, ref: str) -> bool:
    with get_conn() as conn:
        row = _find(conn, user_id, ref)
        if row is None:
            return False
        conn.execute("DELETE FROM habits WHERE id = ? AND user_id = ?", (row["id"], user_id))
    return True


# ── Streak maths ─────────────────────────────────────────────────────────
def _daily_streaks(done_days: set[date], today: date) -> tuple[int, int]:
    """
    Current and best run of consecutive done-days.

    Today not being logged yet does not break the streak — it has not been
    missed until the day is over. That is a correctness choice, not a
    kindness: telling someone at 9am that their streak is dead is wrong.
    """
    if not done_days:
        return 0, 0

    anchor = today if today in done_days else today - timedelta(days=1)
    current = 0
    cursor = anchor
    while cursor in done_days:
        current += 1
        cursor -= timedelta(days=1)

    best = 0
    run = 0
    previous: Optional[date] = None
    for day in sorted(done_days):
        run = run + 1 if previous is not None and (day - previous).days == 1 else 1
        best = max(best, run)
        previous = day
    return current, best


def _weekly_streaks(done_days: set[date], today: date) -> tuple[int, int]:
    """For a weekly habit a 'streak' counts consecutive ISO weeks with a log."""
    if not done_days:
        return 0, 0
    weeks = {(d.isocalendar().year, d.isocalendar().week) for d in done_days}
    ordered = sorted(weeks)

    def previous_week(week: tuple[int, int]) -> tuple[int, int]:
        monday = date.fromisocalendar(week[0], week[1], 1) - timedelta(days=7)
        iso = monday.isocalendar()
        return (iso.year, iso.week)

    this_week = (today.isocalendar().year, today.isocalendar().week)
    anchor = this_week if this_week in weeks else previous_week(this_week)
    current = 0
    cursor = anchor
    while cursor in weeks:
        current += 1
        cursor = previous_week(cursor)

    best = 0
    run = 0
    prev: Optional[tuple[int, int]] = None
    for week in ordered:
        run = run + 1 if prev is not None and previous_week(week) == prev else 1
        best = max(best, run)
        prev = week
    return current, best


def _shape(row: Any, logs: list[dict[str, Any]], days: int = 30) -> dict[str, Any]:
    today = _today()
    created = _parse_day(str(row["created_at"])[:10])
    done_days = {
        datetime.strptime(l["day"], "%Y-%m-%d").date() for l in logs if l["done"]
    }
    frequency = row["frequency"] or "daily"

    if frequency == "weekly":
        current, best = _weekly_streaks(done_days, today)
        weeks_elapsed = max(1, ((today - created).days // 7) + 1)
        expected = weeks_elapsed
        completed = len({(d.isocalendar().year, d.isocalendar().week) for d in done_days})
    else:
        current, best = _daily_streaks(done_days, today)
        expected = max(1, (today - created).days + 1)
        completed = len({d for d in done_days if d >= created})

    completion_rate = round(min(100.0, completed * 100 / expected), 1) if expected else 0.0
    missed = max(0, expected - completed)

    window_start = today - timedelta(days=max(1, days) - 1)
    recent = [
        {"day": d.isoformat(), "done": d in done_days}
        for d in (window_start + timedelta(days=i)
                  for i in range((today - window_start).days + 1))
        if d >= created
    ]

    return {
        "id": row["id"],
        "user_id": row["user_id"],
        "name": row["name"],
        "emoji": row["emoji"],
        "frequency": frequency,
        "target_per_week": row["target_per_week"],
        "goal_id": row["goal_id"],
        "archived": bool(row["archived"]),
        "created_at": row["created_at"],
        "done_today": today in done_days,
        "streak": current,
        "best_streak": best,
        "completion_percentage": completion_rate,
        "completed_count": completed,
        "expected_count": expected,
        "missed_days": missed,
        "recent": recent,
        "restart_note": (
            "Yesterday slipped. No problem — today is a fresh start."
            if current == 0 and best > 0 and today not in done_days
            else None
        ),
    }


def consistency(user_id: str, start: date, end: date) -> dict[str, Any]:
    """
    Habit consistency over a window — used by the weekly review.

    Returns per-habit expected/completed counts. `expected` respects the day
    the habit was created, so a habit started on Thursday is not reported as
    having missed Monday through Wednesday.
    """
    with get_conn() as conn:
        habits = conn.execute(
            "SELECT * FROM habits WHERE user_id = ? AND archived = 0", (user_id,)
        ).fetchall()
        results = []
        total_expected = 0
        total_done = 0
        for h in habits:
            created = _parse_day(str(h["created_at"])[:10])
            window_start = max(start, created)
            if window_start > end:
                continue
            rows = conn.execute(
                "SELECT day FROM habit_logs WHERE habit_id = ? AND done = 1"
                " AND day >= ? AND day <= ?",
                (h["id"], window_start.isoformat(), end.isoformat()),
            ).fetchall()
            done = len(rows)
            if (h["frequency"] or "daily") == "weekly":
                expected = max(1, ((end - window_start).days // 7) + 1)
            else:
                expected = (end - window_start).days + 1
            total_expected += expected
            total_done += min(done, expected)
            results.append({
                "id": h["id"], "name": h["name"], "emoji": h["emoji"],
                "expected": expected, "completed": done,
                "percentage": round(min(100.0, done * 100 / expected), 1) if expected else 0.0,
            })

    return {
        "habits": results,
        "overall_percentage": (
            round(total_done * 100 / total_expected, 1) if total_expected else None
        ),
        "tracked_habits": len(results),
    }
