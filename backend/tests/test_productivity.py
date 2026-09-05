"""
Productivity Intelligence Layer tests.

Two themes run through these:

  * **User isolation.** Every subsystem is checked for it separately, because
    "scoped by user_id" is only true if it is true everywhere.
  * **Honest analytics.** An insight with no data must say so. A review of an
    empty week must say so. These assert on the *absence* of invented claims,
    which is the property that is easy to lose.
"""
from __future__ import annotations

import json
from datetime import date, datetime, timedelta, timezone

import pytest

from productivity import focus as F
from productivity import goals as G
from productivity import habits as H
from productivity import insights as I
from productivity import planning as P
from productivity import review as RV
from productivity import stats as S
from productivity import tasks as T
from productivity import timetracking as TT

U1 = "user-one"
U2 = "user-two"


def iso_days_ago(days: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()


# ══════════════════════════════════════════════════════════════════════════
# Migration from todos.json
# ══════════════════════════════════════════════════════════════════════════
def test_todos_json_is_migrated_once(isolated_profile):
    from config_manager import TODOS_FILE

    TODOS_FILE.write_text(json.dumps([
        {"id": 1, "text": "Old one", "completed": False, "created_at": "2026-09-01T10:00:00"},
        {"id": 2, "text": "Old two", "completed": True, "created_at": "2026-09-01T11:00:00",
         "completed_at": "2026-09-02T09:00:00"},
    ]))

    result = T.migrate_todos_json(U1)
    assert result["migrated"] == 2

    tasks = sorted(T.list_tasks(U1), key=lambda t: t["seq"])
    assert [t["title"] for t in tasks] == ["Old one", "Old two"]
    # The integer ids the user was already looking at are preserved.
    assert [t["seq"] for t in tasks] == [1, 2]
    assert tasks[1]["status"] == "COMPLETED"

    # Second call must not duplicate — the guard is global, not per-user,
    # because todos.json was never user-scoped.
    again = T.migrate_todos_json(U1)
    assert again["skipped"] is True and again["migrated"] == 0
    assert len(T.list_tasks(U1)) == 2

    # And a *different* user must not get a second copy either.
    T.ensure_migrated(U2)
    assert T.list_tasks(U2) == []


def test_migration_leaves_the_json_file_alone(isolated_profile):
    from config_manager import TODOS_FILE

    payload = json.dumps([{"id": 1, "text": "Keep me", "completed": False}])
    TODOS_FILE.write_text(payload)
    T.migrate_todos_json(U1)
    assert TODOS_FILE.exists()
    assert json.loads(TODOS_FILE.read_text())[0]["text"] == "Keep me"


def test_a_corrupt_todos_file_does_not_break_anything(isolated_profile):
    from config_manager import TODOS_FILE

    TODOS_FILE.write_text("{not json at all")
    result = T.migrate_todos_json(U1)
    assert result["migrated"] == 0
    assert "unreadable" in result["reason"]
    # Crucially it is NOT marked migrated, so a fixed file still gets imported.
    from db import GLOBAL_SCOPE, get_setting

    assert get_setting(GLOBAL_SCOPE, T.MIGRATION_KEY) is None


def test_missing_todos_file_is_a_clean_no_op(isolated_profile):
    result = T.migrate_todos_json(U1)
    assert result["migrated"] == 0 and result["reason"] == "no_todos_file"


def test_ensure_migrated_never_raises(isolated_profile, monkeypatch):
    def boom(*_a, **_k):
        raise RuntimeError("disk on fire")

    monkeypatch.setattr(T, "migrate_todos_json", boom)
    T.ensure_migrated(U1)          # must not raise


# ══════════════════════════════════════════════════════════════════════════
# Tasks
# ══════════════════════════════════════════════════════════════════════════
def test_task_crud(isolated_profile):
    task = T.create_task(U1, "Write the report", priority="high",
                         estimated_minutes=90, tags=["work", "q3"])
    assert task["status"] == "TODO"
    assert task["priority"] == "HIGH"
    assert task["tags"] == ["work", "q3"]
    assert task["seq"] == 1

    updated = T.update_task(U1, task["id"], title="Write the Q3 report", priority="critical")
    assert updated["title"] == "Write the Q3 report"
    assert updated["priority"] == "CRITICAL"

    done = T.complete_task(U1, task["id"])
    assert done["status"] == "COMPLETED" and done["completed_at"]

    assert T.delete_task(U1, task["id"]) is True
    assert T.get_task(U1, task["id"]) is None


def test_tasks_are_addressable_by_seq_or_uuid(isolated_profile):
    task = T.create_task(U1, "Either id works")
    assert T.get_task(U1, task["id"])["id"] == task["id"]
    assert T.get_task(U1, task["seq"])["id"] == task["id"]
    assert T.get_task(U1, str(task["seq"]))["id"] == task["id"]


def test_seq_is_per_user_and_increments(isolated_profile):
    assert T.create_task(U1, "a")["seq"] == 1
    assert T.create_task(U1, "b")["seq"] == 2
    # A second user starts from 1 again — seq is per-user.
    assert T.create_task(U2, "theirs")["seq"] == 1


@pytest.mark.parametrize("value", ["done", "DONE", "in progress", "cancelled"])
def test_status_aliases_are_accepted(value):
    assert T.normalize_status(value) in T.STATUSES


def test_unknown_status_is_rejected_not_defaulted():
    """Silently defaulting would lose the caller's intent."""
    with pytest.raises(T.TaskError):
        T.normalize_status("nearly-done")


def test_unknown_priority_is_rejected():
    with pytest.raises(T.TaskError):
        T.normalize_priority("super-urgent")


def test_empty_title_is_rejected(isolated_profile):
    with pytest.raises(T.TaskError):
        T.create_task(U1, "   ")


def test_invalid_due_date_is_rejected(isolated_profile):
    with pytest.raises(T.TaskError):
        T.create_task(U1, "x", due_date="next tuesday")


def test_completing_twice_is_idempotent_not_a_toggle(isolated_profile):
    task = T.create_task(U1, "Once")
    first = T.complete_task(U1, task["id"])
    second = T.complete_task(U1, task["id"])
    assert second["status"] == "COMPLETED"
    assert second["completed_at"] == first["completed_at"]


def test_toggle_flips_both_ways(isolated_profile):
    task = T.create_task(U1, "Flip me")
    assert T.toggle_task(U1, task["id"])["status"] == "COMPLETED"
    assert T.toggle_task(U1, task["id"])["status"] == "TODO"


def test_subtasks(isolated_profile):
    parent = T.create_task(U1, "Ship the feature")
    child = T.create_task(U1, "Write tests", parent_task_id=parent["id"])
    assert child["parent_task_id"] == parent["id"]
    assert [t["id"] for t in T.subtasks(U1, parent["id"])] == [child["id"]]

    # One level only — a tree of subtasks is a project, not a task.
    with pytest.raises(T.TaskError):
        T.create_task(U1, "Too deep", parent_task_id=child["id"])


def test_a_task_cannot_be_its_own_parent(isolated_profile):
    task = T.create_task(U1, "Loop")
    with pytest.raises(T.TaskError):
        T.update_task(U1, task["id"], parent_task_id=task["id"])


def test_unknown_update_fields_are_rejected(isolated_profile):
    task = T.create_task(U1, "x")
    with pytest.raises(T.TaskError):
        T.update_task(U1, task["id"], colour="blue")


def test_open_filter_covers_todo_and_in_progress(isolated_profile):
    T.create_task(U1, "todo one")
    started = T.create_task(U1, "doing")
    T.update_task(U1, started["id"], status="IN_PROGRESS")
    done = T.create_task(U1, "done")
    T.complete_task(U1, done["id"])

    assert {t["title"] for t in T.list_tasks(U1, status="open")} == {"todo one", "doing"}


def test_tasks_are_isolated_between_users(isolated_profile):
    mine = T.create_task(U1, "Mine")
    assert T.list_tasks(U2) == []
    assert T.get_task(U2, mine["id"]) is None
    assert T.update_task(U2, mine["id"], title="Hijacked") is None
    assert T.complete_task(U2, mine["id"]) is None
    assert T.delete_task(U2, mine["id"]) is False
    # Untouched.
    assert T.get_task(U1, mine["id"])["title"] == "Mine"


# ══════════════════════════════════════════════════════════════════════════
# Goals and milestones
# ══════════════════════════════════════════════════════════════════════════
def test_goal_with_milestones_derives_progress(isolated_profile):
    goal = G.create_goal(U1, "Become job-ready in DSA", category="career",
                         milestones=["Graphs", "DP", "Mocks"])
    assert goal["progress"] == 0
    assert len(goal["milestones"]) == 3

    first = goal["milestones"][0]["id"]
    updated = G.set_milestone_completed(U1, goal["id"], first, True)
    assert updated["progress"] == 33          # 1 of 3, rounded

    for milestone in updated["milestones"]:
        G.set_milestone_completed(U1, goal["id"], milestone["id"], True)
    assert G.get_goal(U1, goal["id"])["progress"] == 100


def test_completing_a_goal_sets_progress_to_100(isolated_profile):
    goal = G.create_goal(U1, "Finish it")
    done = G.update_goal(U1, goal["id"], status="COMPLETED")
    assert done["progress"] == 100 and done["completed_at"]


def test_progress_must_be_a_percentage(isolated_profile):
    goal = G.create_goal(U1, "x")
    with pytest.raises(G.GoalError):
        G.update_goal(U1, goal["id"], progress=140)


def test_tasks_connect_to_goals(isolated_profile):
    goal = G.create_goal(U1, "Ship v2")
    task = T.create_task(U1, "Write the migration", goal_id=goal["id"])
    assert task["goal_id"] == goal["id"]

    loaded = G.get_goal(U1, goal["id"])
    assert loaded["task_counts"]["open"] == 1
    assert [t["id"] for t in loaded["tasks"]] == [task["id"]]

    T.complete_task(U1, task["id"])
    assert G.get_goal(U1, goal["id"])["task_counts"]["completed"] == 1


def test_linking_to_someone_elses_goal_fails(isolated_profile):
    goal = G.create_goal(U2, "Theirs")
    with pytest.raises(T.TaskError):
        T.create_task(U1, "Sneaky", goal_id=goal["id"])


def test_deleting_a_goal_keeps_its_tasks(isolated_profile):
    goal = G.create_goal(U1, "Temporary")
    task = T.create_task(U1, "Real work", goal_id=goal["id"])
    assert G.delete_goal(U1, goal["id"]) is True

    survivor = T.get_task(U1, task["id"])
    assert survivor is not None and survivor["goal_id"] is None


def test_goals_are_isolated_between_users(isolated_profile):
    goal = G.create_goal(U1, "Mine")
    assert G.list_goals(U2) == []
    assert G.get_goal(U2, goal["id"]) is None
    assert G.update_goal(U2, goal["id"], progress=99) is None
    assert G.delete_goal(U2, goal["id"]) is False


# ══════════════════════════════════════════════════════════════════════════
# Habits
# ══════════════════════════════════════════════════════════════════════════
def test_habit_logging_and_streak(isolated_profile):
    habit = H.create_habit(U1, "Meditate", emoji="🧘")
    assert habit["streak"] == 0 and habit["done_today"] is False

    today = date.today()
    for offset in (2, 1, 0):
        H.log_habit(U1, habit["id"], day=(today - timedelta(days=offset)).isoformat())

    loaded = H.get_habit(U1, habit["id"])
    assert loaded["streak"] == 3
    assert loaded["best_streak"] == 3
    assert loaded["done_today"] is True


def test_todays_gap_does_not_break_the_streak(isolated_profile):
    """
    Telling someone at 9am that their streak is dead is wrong — the day is
    not over yet.
    """
    habit = H.create_habit(U1, "Read")
    today = date.today()
    for offset in (2, 1):
        H.log_habit(U1, habit["id"], day=(today - timedelta(days=offset)).isoformat())

    loaded = H.get_habit(U1, habit["id"])
    assert loaded["streak"] == 2
    assert loaded["done_today"] is False


def test_broken_streak_gets_a_neutral_restart_line(isolated_profile):
    habit = H.create_habit(U1, "Walk")
    today = date.today()
    for offset in (6, 5, 4):
        H.log_habit(U1, habit["id"], day=(today - timedelta(days=offset)).isoformat())

    loaded = H.get_habit(U1, habit["id"])
    assert loaded["streak"] == 0
    assert loaded["best_streak"] == 3
    note = loaded["restart_note"]
    assert note and "No problem" in note
    # No shaming language anywhere in it.
    lowered = note.lower()
    assert not any(word in lowered for word in
                   ("failed", "lost", "should", "disappointed", "broke"))


def test_unlogging_a_day_works(isolated_profile):
    habit = H.create_habit(U1, "Journal")
    H.log_habit(U1, habit["id"])
    assert H.get_habit(U1, habit["id"])["done_today"] is True
    H.log_habit(U1, habit["id"], done=False)
    assert H.get_habit(U1, habit["id"])["done_today"] is False


def test_future_logging_is_refused(isolated_profile):
    habit = H.create_habit(U1, "Nope")
    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    with pytest.raises(H.HabitError):
        H.log_habit(U1, habit["id"], day=tomorrow)


def test_duplicate_habit_names_are_refused(isolated_profile):
    H.create_habit(U1, "Water")
    with pytest.raises(H.HabitError):
        H.create_habit(U1, "water")
    # But a different user may use the same name.
    assert H.create_habit(U2, "Water")["name"] == "Water"


def test_habits_can_be_logged_by_name(isolated_profile):
    H.create_habit(U1, "Stretch")
    assert H.log_habit(U1, "stretch")["done_today"] is True


def test_expected_count_starts_at_creation(isolated_profile):
    """A habit started today has not missed the whole week."""
    habit = H.create_habit(U1, "Fresh")
    loaded = H.get_habit(U1, habit["id"])
    assert loaded["expected_count"] == 1
    assert loaded["missed_days"] == 1     # today, not yet done


def test_habits_are_isolated_between_users(isolated_profile):
    habit = H.create_habit(U1, "Mine")
    assert H.list_habits(U2) == []
    assert H.get_habit(U2, habit["id"]) is None
    assert H.log_habit(U2, habit["id"]) is None
    assert H.delete_habit(U2, habit["id"]) is False


# ══════════════════════════════════════════════════════════════════════════
# Focus sessions
# ══════════════════════════════════════════════════════════════════════════
def test_focus_session_lifecycle_and_time_entry(isolated_profile):
    task = T.create_task(U1, "Deep work")
    session = F.start_session(U1, minutes=25, mode="DEEP_WORK",
                              task_id=task["id"], intended="Draft it")
    assert session["category"] == "DEEP_WORK"
    assert session["task_id"] == task["id"]
    assert F.active_session(U1)["id"] == session["id"]

    ended = F.end_session(U1, completed=True, actual_seconds=1500)
    assert ended["actual_minutes"] == 25.0
    assert F.active_session(U1) is None

    # Ending writes a time entry, so aggregates read one table.
    start, end = TT.day_bounds()
    assert TT.summary(U1, start, end)["total_minutes"] == 25.0
    # ...and the minutes land on the task.
    assert T.get_task(U1, task["id"])["actual_minutes"] == 25


def test_only_one_session_at_a_time(isolated_profile):
    F.start_session(U1, minutes=25)
    with pytest.raises(F.FocusError):
        F.start_session(U1, minutes=25)


def test_ending_with_no_session_returns_none(isolated_profile):
    assert F.end_session(U1) is None


@pytest.mark.parametrize("minutes", [0, -5, 9999])
def test_absurd_session_lengths_refused(isolated_profile, minutes):
    with pytest.raises(F.FocusError):
        F.start_session(U1, minutes=minutes)


def test_wall_clock_overrun_is_capped(isolated_profile):
    """A laptop that slept must not be recorded as heroic focus."""
    F.start_session(U1, minutes=25)
    ended = F.end_session(U1, actual_seconds=60 * 60 * 8)
    assert ended["actual_secs"] <= 25 * 60 + 300


def test_completed_is_not_the_same_claim_as_finished(isolated_profile):
    """The timer running out says nothing about whether the work landed."""
    F.start_session(U1, minutes=25, intended="Draft the intro")
    ended = F.end_session(U1, completed=True, actual_seconds=1500)
    assert ended["completed"] is True
    assert ended["finished_intent"] is None      # unanswered until they say

    prompt = F.reflection_prompt(ended)
    assert "Did you finish what you intended?" in prompt["question"]
    assert "records time spent" in prompt["note"]

    reflected = F.record_reflection(U1, ended["id"], finished_intent=False,
                                    reflection="Got stuck on the data")
    assert reflected["finished_intent"] is False


def test_focus_sessions_are_isolated(isolated_profile):
    session = F.start_session(U1, minutes=25)
    assert F.active_session(U2) is None
    assert F.end_session(U2, session_id=session["id"]) is None
    assert F.record_reflection(U2, session["id"], finished_intent=True) is None


def test_starting_on_someone_elses_task_fails(isolated_profile):
    task = T.create_task(U2, "Theirs")
    with pytest.raises(F.FocusError):
        F.start_session(U1, minutes=25, task_id=task["id"])


# ══════════════════════════════════════════════════════════════════════════
# Time tracking
# ══════════════════════════════════════════════════════════════════════════
def test_manual_time_logging_aggregates(isolated_profile):
    task = T.create_task(U1, "Write")
    TT.log_entry(U1, minutes=40, task_id=task["id"], category="WRITING")
    TT.log_entry(U1, minutes=20, category="ADMIN")

    start, end = TT.day_bounds()
    summary = TT.summary(U1, start, end)
    assert summary["total_minutes"] == 60.0
    categories = {c["key"]: c["minutes"] for c in summary["by_category"]}
    assert categories["WRITING"] == 40.0 and categories["ADMIN"] == 20.0
    # Time against no task and no goal is reported, not hidden.
    assert summary["unallocated_minutes"] == 20.0


def test_start_stop_timer(isolated_profile):
    entry = TT.start_entry(U1, category="CODING")
    assert TT.active_entry(U1)["id"] == entry["id"]
    stopped = TT.stop_entry(U1)
    assert stopped["ended_at"] and stopped["seconds"] is not None
    assert TT.active_entry(U1) is None


def test_only_one_timer_at_a_time(isolated_profile):
    TT.start_entry(U1)
    with pytest.raises(F.FocusError):
        TT.start_entry(U1)


def test_planned_vs_actual_is_none_without_estimates(isolated_profile):
    task = T.create_task(U1, "No estimate")
    T.complete_task(U1, task["id"])
    start, end = TT.day_bounds()
    result = TT.planned_vs_actual(U1, start, end)
    assert result["tasks_with_estimates"] == 0
    assert result["ratio"] is None      # never a made-up number


def test_planned_vs_actual_computes_a_ratio(isolated_profile):
    task = T.create_task(U1, "Estimated", estimated_minutes=60)
    T.add_actual_minutes(U1, task["id"], 90)
    T.complete_task(U1, task["id"])
    start, end = TT.day_bounds()
    assert TT.planned_vs_actual(U1, start, end)["ratio"] == 1.5


def test_time_is_isolated_between_users(isolated_profile):
    TT.log_entry(U1, minutes=30)
    start, end = TT.day_bounds()
    assert TT.summary(U2, start, end)["total_minutes"] == 0.0


# ══════════════════════════════════════════════════════════════════════════
# Daily planning
# ══════════════════════════════════════════════════════════════════════════
def test_plan_leaves_buffer_and_does_not_fill_the_day(isolated_profile):
    for i in range(6):
        T.create_task(U1, f"Task {i}", priority="high", estimated_minutes=60)

    plan = P.build_plan(U1, available_minutes=240)
    assert plan["planned_minutes"] <= plan["schedulable_minutes"]
    assert plan["schedulable_minutes"] < plan["available_minutes"]
    assert plan["buffer_minutes"] > 0


def test_plan_includes_breaks_between_focus_blocks(isolated_profile):
    T.create_task(U1, "Long one", estimated_minutes=60, priority="high")
    T.create_task(U1, "Another", estimated_minutes=45, priority="high")
    plan = P.build_plan(U1, available_minutes=400)
    assert any(b["type"] == "break" for b in plan["blocks"])


def test_work_that_does_not_fit_is_reported_not_crammed(isolated_profile):
    for i in range(8):
        T.create_task(U1, f"Big {i}", estimated_minutes=90, priority="high")
    plan = P.build_plan(U1, available_minutes=120)
    assert plan["unscheduled"]
    assert any("did not fit" in note for note in plan["notes"])


def test_plan_says_when_it_assumed_your_time(isolated_profile):
    T.create_task(U1, "Something")
    plan = P.build_plan(U1)
    assert plan["available_minutes_assumed"] is True
    assert any("Assumed" in note for note in plan["notes"])


def test_plan_flags_estimates_it_invented(isolated_profile):
    T.create_task(U1, "No estimate given", priority="high")
    plan = P.build_plan(U1, available_minutes=300)
    focus_blocks = [b for b in plan["blocks"] if b["type"] == "focus"]
    assert focus_blocks and focus_blocks[0]["estimate_assumed"] is True
    assert any("no estimate" in note for note in plan["notes"])


def test_quick_tasks_are_batched(isolated_profile):
    for i in range(3):
        T.create_task(U1, f"Quick {i}", estimated_minutes=10)
    plan = P.build_plan(U1, available_minutes=300)
    quick = [b for b in plan["blocks"] if b["type"] == "quick"]
    assert quick and len(quick[0]["items"]) == 3


def test_plan_suggests_the_first_focus_block(isolated_profile):
    T.create_task(U1, "Finish presentation", priority="critical", estimated_minutes=90)
    plan = P.build_plan(U1, available_minutes=300)
    assert plan["suggestion"]["title"] == "Finish presentation"
    assert "first" in plan["suggestion"]["ask"]


def test_empty_plan_is_honest(isolated_profile):
    plan = P.build_plan(U1, available_minutes=240)
    assert plan["empty"] is True
    assert "No open tasks" in P.plan_summary_text(plan)


def test_saved_plan_round_trips(isolated_profile):
    T.create_task(U1, "Thing")
    plan = P.build_plan(U1, available_minutes=240)
    saved = P.save_plan(U1, plan["day"], plan["blocks"])
    assert saved["blocks"] == plan["blocks"]
    assert P.get_plan(U1, plan["day"])["blocks"] == plan["blocks"]
    # Isolated.
    assert P.get_plan(U2, plan["day"]) is None


def test_plan_rejects_absurd_available_minutes(isolated_profile):
    with pytest.raises(T.TaskError):
        P.build_plan(U1, available_minutes=99999)


# ══════════════════════════════════════════════════════════════════════════
# Today dashboard
# ══════════════════════════════════════════════════════════════════════════
def test_today_returns_every_section(seeded):
    T.create_task(U1, "Priority thing", priority="critical")
    H.create_habit(U1, "Meditate")
    G.create_goal(U1, "Ship it")

    today = S.today(U1)
    assert {"day", "time_context", "tasks", "focus", "time", "habits",
            "goals", "reminders", "plan", "daily"} <= set(today)
    assert today["tasks"]["priority"][0]["title"] == "Priority thing"
    assert today["habits"]["total"] == 1
    assert today["goals"][0]["title"] == "Ship it"
    assert today["daily"]["verse"]["reference"]


def test_today_is_isolated(seeded):
    T.create_task(U1, "Mine")
    other = S.today(U2)
    assert other["tasks"]["counts"]["open"] == 0
    assert other["habits"]["total"] == 0


def test_priority_ordering_puts_overdue_first(isolated_profile):
    yesterday = (date.today() - timedelta(days=1)).isoformat()
    T.create_task(U1, "Low but overdue", priority="low", due_date=yesterday)
    T.create_task(U1, "Critical, no date", priority="critical")
    ordered = [t["title"] for t in S.priority_tasks(U1)]
    assert ordered[0] == "Low but overdue"


def test_today_survives_a_missing_gita_corpus(isolated_profile):
    """The productivity screen must not blank out if the verse lookup fails."""
    today = S.today(U1)
    assert "daily" in today          # None is fine; a crash is not


# ══════════════════════════════════════════════════════════════════════════
# Weekly review — data-derived only
# ══════════════════════════════════════════════════════════════════════════
def test_empty_week_says_so_rather_than_inventing_a_review(isolated_profile):
    review = RV.weekly_review(U1)
    assert review["has_data"] is False
    assert review["observations"][0]["kind"] == "NO_DATA"
    assert "invent" in review["observations"][0]["text"]


def test_weekly_review_counts_real_work(isolated_profile):
    for i in range(3):
        task = T.create_task(U1, f"Done {i}")
        T.complete_task(U1, task["id"])
    T.create_task(U1, "Still open", priority="high")

    review = RV.weekly_review(U1)
    assert review["tasks_completed"] == 3
    assert review["has_data"] is True
    assert review["completion_percentage"] is not None
    assert any(t["title"] == "Still open" for t in review["unfinished_important"])


def test_every_observation_carries_its_evidence(isolated_profile):
    task = T.create_task(U1, "Something")
    T.complete_task(U1, task["id"])
    for observation in RV.weekly_review(U1)["observations"]:
        assert observation["text"]
        assert isinstance(observation["evidence"], dict)


def test_weekly_review_is_isolated(isolated_profile):
    task = T.create_task(U1, "Mine")
    T.complete_task(U1, task["id"])
    assert RV.weekly_review(U2)["tasks_completed"] == 0


# ══════════════════════════════════════════════════════════════════════════
# Insights — never fabricated
# ══════════════════════════════════════════════════════════════════════════
def test_no_data_means_no_insights(isolated_profile):
    result = I.generate(U1)
    assert result["insights"] == []
    assert result["message"] and "don't have enough data" in result["message"]


def test_insufficient_insights_say_what_they_are_waiting_for(isolated_profile):
    result = I.generate(U1)
    best_time = next(i for i in result["insufficient"]
                     if i["type"] == "BEST_TIME_OF_DAY")
    assert best_time["available"] is False
    assert "don't have enough data yet" in best_time["message"]
    assert best_time["needs"]["sessions"] > 0
    assert best_time["data"] is None


def test_every_insight_type_is_reported_one_way_or_the_other(isolated_profile):
    result = I.generate(U1)
    seen = {i["type"] for i in result["insights"]} | {i["type"] for i in result["insufficient"]}
    assert seen == set(I.INSIGHT_TYPES)


def test_thresholds_exist_for_every_type():
    assert set(I.THRESHOLDS) == set(I.INSIGHT_TYPES)


def test_an_unknown_insight_type_is_rejected(isolated_profile):
    with pytest.raises(ValueError):
        I.generate(U1, types=["TELEPATHY"])


def test_goal_progress_insight_appears_once_there_is_a_goal(isolated_profile):
    G.create_goal(U1, "Learn Rust")
    result = I.generate(U1, types=["GOAL_PROGRESS"])
    assert result["insights"] and result["insights"][0]["type"] == "GOAL_PROGRESS"


def test_overload_insight_needs_enough_open_tasks(isolated_profile):
    for i in range(4):
        T.create_task(U1, f"t{i}")
    assert I.generate(U1, types=["OVERLOAD"])["insights"] == []

    T.create_task(U1, "t5")
    assert I.generate(U1, types=["OVERLOAD"])["insights"]


def test_estimation_insight_requires_estimated_tasks(isolated_profile):
    for i in range(6):
        task = T.create_task(U1, f"t{i}")
        T.complete_task(U1, task["id"])
    # Completed, but none carried an estimate — so no estimation claim.
    assert I.generate(U1, types=["TASK_ESTIMATION"])["insights"] == []


def test_insights_are_isolated(isolated_profile):
    G.create_goal(U1, "Mine")
    assert I.generate(U2, types=["GOAL_PROGRESS"])["insights"] == []


# ══════════════════════════════════════════════════════════════════════════
# HTTP surface
# ══════════════════════════════════════════════════════════════════════════
def head(user: str) -> dict[str, str]:
    return {"X-User-Id": user}


def test_task_endpoints(client):
    created = client.post("/productivity/tasks", headers=head(U1),
                          json={"title": "From HTTP", "priority": "HIGH"})
    assert created.status_code == 201
    task = created.json()

    listed = client.get("/productivity/tasks", headers=head(U1)).json()
    assert listed["counts"]["open"] == 1

    patched = client.patch(f"/productivity/tasks/{task['id']}", headers=head(U1),
                           json={"status": "COMPLETED"})
    assert patched.json()["status"] == "COMPLETED"

    assert client.delete(f"/productivity/tasks/{task['id']}",
                         headers=head(U1)).status_code == 204


def test_invalid_task_input_is_a_400_with_the_reason(client):
    res = client.post("/productivity/tasks", headers=head(U1),
                      json={"title": "x", "priority": "SUPER_URGENT"})
    assert res.status_code == 400
    assert "priority" in res.json()["detail"].lower()


def test_task_endpoints_are_user_scoped(client):
    task = client.post("/productivity/tasks", headers=head(U1),
                       json={"title": "Mine"}).json()
    assert client.get(f"/productivity/tasks/{task['id']}",
                      headers=head(U2)).status_code == 404
    assert client.patch(f"/productivity/tasks/{task['id']}", headers=head(U2),
                        json={"title": "Nope"}).status_code == 404
    assert client.delete(f"/productivity/tasks/{task['id']}",
                         headers=head(U2)).status_code == 404


def test_legacy_todos_still_work_and_share_the_store(client):
    """The hamster/panda path must keep its exact shape."""
    created = client.post("/todos", headers=head(U1), json={"text": "Legacy add"})
    assert created.status_code == 201
    todo = created.json()
    assert set(todo) == {"id", "text", "completed", "created_at", "completed_at"}
    assert isinstance(todo["id"], int)

    # The same item shows up in the productivity API.
    tasks = client.get("/productivity/tasks", headers=head(U1)).json()["tasks"]
    assert tasks[0]["title"] == "Legacy add"
    assert tasks[0]["seq"] == todo["id"]

    toggled = client.patch(f"/todos/{todo['id']}", headers=head(U1)).json()
    assert toggled["completed"] is True


def test_goal_and_milestone_endpoints(client):
    goal = client.post("/productivity/goals", headers=head(U1),
                       json={"title": "DSA", "milestones": ["Graphs", "DP"]}).json()
    assert len(goal["milestones"]) == 2

    milestone = goal["milestones"][0]["id"]
    updated = client.patch(
        f"/productivity/goals/{goal['id']}/milestones/{milestone}",
        headers=head(U1), json={"completed": True}).json()
    assert updated["progress"] == 50

    task = client.post("/productivity/tasks", headers=head(U1),
                       json={"title": "Solve 2 graph problems"}).json()
    linked = client.post(f"/productivity/goals/{goal['id']}/tasks",
                         headers=head(U1), json={"task_id": task["id"]}).json()
    assert linked["goal_id"] == goal["id"]


def test_habit_endpoints(client):
    habit = client.post("/productivity/habits", headers=head(U1),
                        json={"name": "Meditate", "emoji": "🧘"}).json()
    logged = client.post(f"/productivity/habits/{habit['id']}/log",
                         headers=head(U1), json={}).json()
    assert logged["done_today"] is True and logged["streak"] == 1
    assert client.post(f"/productivity/habits/{habit['id']}/log",
                       headers=head(U2), json={}).status_code == 404


def test_focus_endpoints_return_a_reflection_prompt(client):
    client.post("/productivity/focus/start", headers=head(U1),
                json={"minutes": 25, "mode": "DEEP_WORK"})
    ended = client.post("/productivity/focus/end", headers=head(U1),
                        json={"completed": True}).json()
    assert "reflection_prompt" in ended
    assert ended["reflection_prompt"]["question"]


def test_focus_end_with_nothing_running_is_404(client):
    assert client.post("/productivity/focus/end", headers=head(U1),
                       json={}).status_code == 404


def test_time_endpoints(client):
    client.post("/productivity/time/log", headers=head(U1),
                json={"minutes": 45, "category": "CODING"})
    summary = client.get("/productivity/time", headers=head(U1)).json()
    assert summary["total_minutes"] == 45.0
    assert client.get("/productivity/time", headers=head(U2)).json()["total_minutes"] == 0.0


def test_today_plan_review_and_insight_endpoints(client):
    client.post("/productivity/tasks", headers=head(U1),
                json={"title": "Presentation", "priority": "CRITICAL",
                      "estimated_minutes": 90})

    today = client.get("/productivity/today", headers=head(U1)).json()
    assert today["tasks"]["priority"][0]["title"] == "Presentation"

    plan = client.get("/productivity/plan?available_minutes=240",
                      headers=head(U1)).json()
    assert plan["proposed"]["blocks"]
    assert plan["proposed"]["buffer_minutes"] > 0

    saved = client.post("/productivity/plan", headers=head(U1),
                        json={"available_minutes": 240}).json()
    assert saved["saved"]["blocks"]

    review = client.get("/productivity/weekly-review", headers=head(U1)).json()
    assert "observations" in review

    insights = client.get("/productivity/insights", headers=head(U1)).json()
    assert insights["insufficient"]


def test_situations_endpoint_labels_modern_interpretation(client):
    body = client.get("/productivity/situations").json()
    assert body["situations"]
    for situation in body["situations"]:
        assert situation["action_label"] == "modern interpretation"
        assert situation["disclaimer"]
        # The mapping must never carry scripture text.
        assert "sanskrit" not in situation
    assert "not a quotation" in body["disclaimer"]


def test_reminder_endpoint_is_honest_about_not_notifying(client):
    created = client.post("/productivity/reminders", headers=head(U1),
                          json={"text": "Call mum"})
    assert created.status_code == 201
    listing = client.get("/productivity/reminders", headers=head(U1)).json()
    assert "no push notification scheduler" in listing["note"]
