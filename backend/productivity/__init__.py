"""
Productivity Intelligence Layer (Phase 1).

    tasks         the single source of truth for work items
    goals         long-term goals + milestones, and the tasks that serve them
    habits        habit logging, streaks and consistency — without shaming
    focus         focus sessions, with reflection instead of assumed success
    timetracking  one table every "how long did that take" answer reads from
    planning      Plan My Day
    stats         the Today dashboard payload and rolling stats
    review        the weekly review, data-derived only
    insights      pattern detection with explicit data-sufficiency gates
    reminders     stored (not pushed) reminders
    context       the compact productivity brief injected into Madhav's prompt
"""
from __future__ import annotations

from productivity import (  # noqa: F401
    focus,
    goals,
    habits,
    insights,
    planning,
    reminders,
    review,
    stats,
    tasks,
    timetracking,
)
from productivity.focus import FocusError  # noqa: F401
from productivity.goals import GoalError  # noqa: F401
from productivity.habits import HabitError  # noqa: F401
from productivity.reminders import ReminderError  # noqa: F401
from productivity.tasks import TaskError  # noqa: F401

__all__ = [
    "tasks", "goals", "habits", "focus", "timetracking", "planning",
    "stats", "review", "insights", "reminders",
    "TaskError", "GoalError", "HabitError", "FocusError", "ReminderError",
]
