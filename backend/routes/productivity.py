"""
Productivity routes (Phase 1, section 13).

Every endpoint takes the user from `X-User-Id` and scopes to it, the same way
the memory router does. Validation errors come back as 400 with the message
the domain layer produced, so the client can show the actual reason rather
than "invalid request".
"""
from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel, Field

from db import DEFAULT_USER_ID
from productivity import (
    FocusError,
    GoalError,
    HabitError,
    ReminderError,
    TaskError,
)
from productivity import focus as F
from productivity import goals as G
from productivity import habits as H
from productivity import insights as I
from productivity import planning as P
from productivity import reminders as R
from productivity import review as RV
from productivity import stats as S
from productivity import tasks as T
from productivity import timetracking as TT

router = APIRouter(prefix="/productivity", tags=["productivity"])

_DOMAIN_ERRORS = (TaskError, GoalError, HabitError, FocusError, ReminderError, ValueError)


def _user(x_user_id: Optional[str]) -> str:
    return (x_user_id or DEFAULT_USER_ID).strip() or DEFAULT_USER_ID


def _guard(fn, *args, **kwargs):
    """Run a domain call, turning its validation errors into 400s."""
    try:
        return fn(*args, **kwargs)
    except _DOMAIN_ERRORS as exc:
        raise HTTPException(status_code=400, detail=str(exc))


# ══════════════════════════════════════════════════════════════════════════
# Today / plan / stats / review / insights
# ══════════════════════════════════════════════════════════════════════════
@router.get("/today")
async def today(
    day: Optional[str] = Query(None, description="YYYY-MM-DD, defaults to today"),
    include_gita: bool = Query(True),
    x_user_id: Optional[str] = Header(None),
) -> dict[str, Any]:
    return _guard(S.today, _user(x_user_id), day, include_gita)


@router.get("/stats")
async def stats(
    days: int = Query(7, ge=1, le=90),
    x_user_id: Optional[str] = Header(None),
) -> dict[str, Any]:
    return _guard(S.stats, _user(x_user_id), days)


@router.get("/plan")
async def get_plan(
    day: Optional[str] = Query(None),
    available_minutes: Optional[int] = Query(None, ge=0, le=600),
    saved_only: bool = Query(False, description="Return only a previously saved plan"),
    x_user_id: Optional[str] = Header(None),
) -> dict[str, Any]:
    """
    A proposed plan for the day.

    GET never writes: it returns a plan the user can look at. `POST /plan`
    is what commits one.
    """
    user = _user(x_user_id)
    saved = P.get_plan(user, day)
    if saved_only:
        if saved is None:
            raise HTTPException(status_code=404, detail="No saved plan for that day.")
        return {"saved": saved, "proposed": None}
    proposed = _guard(P.build_plan, user, day, available_minutes)
    return {"saved": saved, "proposed": proposed,
            "summary": P.plan_summary_text(proposed)}


class SavePlanRequest(BaseModel):
    day: Optional[str] = None
    blocks: Optional[list[dict[str, Any]]] = None
    notes: Optional[str] = None
    available_minutes: Optional[int] = None
    source: str = "generated"


@router.post("/plan")
async def save_plan(
    req: SavePlanRequest, x_user_id: Optional[str] = Header(None)
) -> dict[str, Any]:
    """Commit a plan. With no blocks, generates one and saves that."""
    user = _user(x_user_id)
    blocks = req.blocks
    generated = None
    if blocks is None:
        generated = _guard(P.build_plan, user, req.day, req.available_minutes)
        blocks = generated["blocks"]
    saved = _guard(P.save_plan, user, req.day, blocks, req.notes,
                   "user" if req.blocks is not None else req.source)
    return {"saved": saved, "generated": generated}


@router.get("/weekly-review")
async def weekly_review(
    day: Optional[str] = Query(None, description="Any day inside the week"),
    x_user_id: Optional[str] = Header(None),
) -> dict[str, Any]:
    return _guard(RV.weekly_review, _user(x_user_id), day)


@router.get("/insights")
async def insights(
    days: int = Query(30, ge=1, le=365),
    types: Optional[str] = Query(None, description="Comma-separated insight types"),
    x_user_id: Optional[str] = Header(None),
) -> dict[str, Any]:
    wanted = [t.strip().upper() for t in types.split(",")] if types else None
    return _guard(I.generate, _user(x_user_id), days, wanted)


# ══════════════════════════════════════════════════════════════════════════
# Tasks
# ══════════════════════════════════════════════════════════════════════════
class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None
    estimated_minutes: Optional[int] = None
    tags: Optional[list[str]] = None
    parent_task_id: Optional[str] = None
    goal_id: Optional[str] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None
    estimated_minutes: Optional[int] = None
    actual_minutes: Optional[int] = None
    tags: Optional[list[str]] = None
    parent_task_id: Optional[str] = None
    goal_id: Optional[str] = None


@router.get("/tasks")
async def list_tasks(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    goal_id: Optional[str] = Query(None),
    include_subtasks: bool = Query(True),
    x_user_id: Optional[str] = Header(None),
) -> dict[str, Any]:
    user = _user(x_user_id)
    T.ensure_migrated(user)
    items = _guard(T.list_tasks, user, status, priority, goal_id, None, include_subtasks)
    return {"tasks": items, "counts": T.counts(user)}


@router.post("/tasks", status_code=201)
async def create_task(
    req: TaskCreate, x_user_id: Optional[str] = Header(None)
) -> dict[str, Any]:
    user = _user(x_user_id)
    T.ensure_migrated(user)
    return _guard(T.create_task, user, **req.model_dump())


@router.get("/tasks/{task_id}")
async def get_task(
    task_id: str, x_user_id: Optional[str] = Header(None)
) -> dict[str, Any]:
    user = _user(x_user_id)
    task = T.get_task(user, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="No such task for this user.")
    task["subtasks"] = T.subtasks(user, task["id"])
    return task


@router.patch("/tasks/{task_id}")
async def update_task(
    task_id: str, req: TaskUpdate, x_user_id: Optional[str] = Header(None)
) -> dict[str, Any]:
    fields = {k: v for k, v in req.model_dump(exclude_unset=True).items()}
    if not fields:
        raise HTTPException(status_code=400, detail="Nothing to update.")
    updated = _guard(T.update_task, _user(x_user_id), task_id, **fields)
    if updated is None:
        raise HTTPException(status_code=404, detail="No such task for this user.")
    return updated


@router.delete("/tasks/{task_id}", status_code=204)
async def delete_task(task_id: str, x_user_id: Optional[str] = Header(None)):
    if not T.delete_task(_user(x_user_id), task_id):
        raise HTTPException(status_code=404, detail="No such task for this user.")


# ══════════════════════════════════════════════════════════════════════════
# Goals + milestones
# ══════════════════════════════════════════════════════════════════════════
class GoalCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    target_date: Optional[str] = None
    status: Optional[str] = None
    progress: int = 0
    milestones: list[Any] = Field(default_factory=list)


class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    target_date: Optional[str] = None
    progress: Optional[int] = None
    status: Optional[str] = None


class MilestoneCreate(BaseModel):
    title: str
    target: Optional[str] = None
    due_date: Optional[str] = None
    completed: bool = False


class MilestoneUpdate(BaseModel):
    completed: bool = True


class LinkTaskRequest(BaseModel):
    task_id: str


@router.get("/goals")
async def list_goals(
    status: Optional[str] = Query(None),
    include_tasks: bool = Query(False),
    x_user_id: Optional[str] = Header(None),
) -> dict[str, Any]:
    return {"goals": _guard(G.list_goals, _user(x_user_id), status, include_tasks)}


@router.post("/goals", status_code=201)
async def create_goal(
    req: GoalCreate, x_user_id: Optional[str] = Header(None)
) -> dict[str, Any]:
    return _guard(G.create_goal, _user(x_user_id), **req.model_dump())


@router.get("/goals/{goal_id}")
async def get_goal(goal_id: str, x_user_id: Optional[str] = Header(None)) -> dict[str, Any]:
    goal = G.get_goal(_user(x_user_id), goal_id)
    if goal is None:
        raise HTTPException(status_code=404, detail="No such goal for this user.")
    return goal


@router.patch("/goals/{goal_id}")
async def update_goal(
    goal_id: str, req: GoalUpdate, x_user_id: Optional[str] = Header(None)
) -> dict[str, Any]:
    fields = req.model_dump(exclude_unset=True)
    if not fields:
        raise HTTPException(status_code=400, detail="Nothing to update.")
    updated = _guard(G.update_goal, _user(x_user_id), goal_id, **fields)
    if updated is None:
        raise HTTPException(status_code=404, detail="No such goal for this user.")
    return updated


@router.delete("/goals/{goal_id}", status_code=204)
async def delete_goal(goal_id: str, x_user_id: Optional[str] = Header(None)):
    if not G.delete_goal(_user(x_user_id), goal_id):
        raise HTTPException(status_code=404, detail="No such goal for this user.")


@router.post("/goals/{goal_id}/milestones", status_code=201)
async def add_milestone(
    goal_id: str, req: MilestoneCreate, x_user_id: Optional[str] = Header(None)
) -> dict[str, Any]:
    updated = _guard(G.add_milestone, _user(x_user_id), goal_id, req.model_dump())
    if updated is None:
        raise HTTPException(status_code=404, detail="No such goal for this user.")
    return updated


@router.patch("/goals/{goal_id}/milestones/{milestone_id}")
async def update_milestone(
    goal_id: str, milestone_id: str, req: MilestoneUpdate,
    x_user_id: Optional[str] = Header(None),
) -> dict[str, Any]:
    updated = _guard(G.set_milestone_completed, _user(x_user_id), goal_id,
                     milestone_id, req.completed)
    if updated is None:
        raise HTTPException(status_code=404, detail="No such milestone for this user.")
    return updated


@router.delete("/goals/{goal_id}/milestones/{milestone_id}", status_code=204)
async def delete_milestone(
    goal_id: str, milestone_id: str, x_user_id: Optional[str] = Header(None)
):
    if not G.delete_milestone(_user(x_user_id), goal_id, milestone_id):
        raise HTTPException(status_code=404, detail="No such milestone for this user.")


@router.post("/goals/{goal_id}/tasks")
async def link_task(
    goal_id: str, req: LinkTaskRequest, x_user_id: Optional[str] = Header(None)
) -> dict[str, Any]:
    user = _user(x_user_id)
    if G.get_goal(user, goal_id, include_tasks=False) is None:
        raise HTTPException(status_code=404, detail="No such goal for this user.")
    task = _guard(G.link_task, user, req.task_id, goal_id)
    if task is None:
        raise HTTPException(status_code=404, detail="No such task for this user.")
    return task


# ══════════════════════════════════════════════════════════════════════════
# Habits
# ══════════════════════════════════════════════════════════════════════════
class HabitCreate(BaseModel):
    name: str
    emoji: Optional[str] = None
    frequency: Optional[str] = "daily"
    target_per_week: Optional[int] = None
    goal_id: Optional[str] = None


class HabitUpdate(BaseModel):
    name: Optional[str] = None
    emoji: Optional[str] = None
    frequency: Optional[str] = None
    target_per_week: Optional[int] = None
    goal_id: Optional[str] = None
    archived: Optional[bool] = None


class HabitLogRequest(BaseModel):
    day: Optional[str] = None
    done: bool = True
    note: Optional[str] = None


@router.get("/habits")
async def list_habits(
    include_archived: bool = Query(False),
    x_user_id: Optional[str] = Header(None),
) -> dict[str, Any]:
    return {"habits": _guard(H.list_habits, _user(x_user_id), include_archived)}


@router.post("/habits", status_code=201)
async def create_habit(
    req: HabitCreate, x_user_id: Optional[str] = Header(None)
) -> dict[str, Any]:
    return _guard(H.create_habit, _user(x_user_id), **req.model_dump())


@router.patch("/habits/{habit_id}")
async def update_habit(
    habit_id: str, req: HabitUpdate, x_user_id: Optional[str] = Header(None)
) -> dict[str, Any]:
    fields = req.model_dump(exclude_unset=True)
    if not fields:
        raise HTTPException(status_code=400, detail="Nothing to update.")
    updated = _guard(H.update_habit, _user(x_user_id), habit_id, **fields)
    if updated is None:
        raise HTTPException(status_code=404, detail="No such habit for this user.")
    return updated


@router.post("/habits/{habit_id}/log")
async def log_habit(
    habit_id: str, req: HabitLogRequest, x_user_id: Optional[str] = Header(None)
) -> dict[str, Any]:
    updated = _guard(H.log_habit, _user(x_user_id), habit_id, req.day, req.done, req.note)
    if updated is None:
        raise HTTPException(status_code=404, detail="No such habit for this user.")
    return updated


@router.delete("/habits/{habit_id}", status_code=204)
async def delete_habit(habit_id: str, x_user_id: Optional[str] = Header(None)):
    if not H.delete_habit(_user(x_user_id), habit_id):
        raise HTTPException(status_code=404, detail="No such habit for this user.")


# ══════════════════════════════════════════════════════════════════════════
# Focus
# ══════════════════════════════════════════════════════════════════════════
class FocusStart(BaseModel):
    minutes: int = 25
    activity: Optional[str] = None
    mode: Optional[str] = None
    task_id: Optional[str] = None
    goal_id: Optional[str] = None
    intended: Optional[str] = None
    session_type: str = "focus"


class FocusEnd(BaseModel):
    session_id: Optional[str] = None
    completed: bool = True
    reflection: Optional[str] = None
    finished_intent: Optional[bool] = None
    actual_seconds: Optional[int] = None


class FocusReflect(BaseModel):
    finished_intent: Optional[bool] = None
    reflection: Optional[str] = None


@router.get("/focus")
async def focus_state(
    limit: int = Query(20, ge=1, le=200),
    x_user_id: Optional[str] = Header(None),
) -> dict[str, Any]:
    user = _user(x_user_id)
    return {
        "active": F.active_session(user),
        "recent": F.list_sessions(user, limit=limit),
        "modes": list(F.MODES),
        "presets": list(F.PRESET_MINUTES),
    }


@router.post("/focus/start", status_code=201)
async def focus_start(
    req: FocusStart, x_user_id: Optional[str] = Header(None)
) -> dict[str, Any]:
    return _guard(F.start_session, _user(x_user_id), **req.model_dump())


@router.post("/focus/end")
async def focus_end(
    req: FocusEnd, x_user_id: Optional[str] = Header(None)
) -> dict[str, Any]:
    session = _guard(F.end_session, _user(x_user_id), **req.model_dump())
    if session is None:
        raise HTTPException(status_code=404, detail="No open focus session found.")
    return {"session": session, "reflection_prompt": F.reflection_prompt(session)}


@router.post("/focus/{session_id}/reflect")
async def focus_reflect(
    session_id: str, req: FocusReflect, x_user_id: Optional[str] = Header(None)
) -> dict[str, Any]:
    updated = _guard(F.record_reflection, _user(x_user_id), session_id,
                     req.finished_intent, req.reflection)
    if updated is None:
        raise HTTPException(status_code=404, detail="No such focus session for this user.")
    return updated


# ══════════════════════════════════════════════════════════════════════════
# Time tracking
# ══════════════════════════════════════════════════════════════════════════
class TimeStart(BaseModel):
    task_id: Optional[str] = None
    goal_id: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None


class TimeStop(BaseModel):
    entry_id: Optional[str] = None


class TimeLog(BaseModel):
    minutes: float
    task_id: Optional[str] = None
    goal_id: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    started_at: Optional[str] = None


@router.get("/time")
async def time_summary(
    day: Optional[str] = Query(None),
    scope: str = Query("day", pattern="^(day|week)$"),
    x_user_id: Optional[str] = Header(None),
) -> dict[str, Any]:
    user = _user(x_user_id)
    summary = TT.week_summary(user, day) if scope == "week" else TT.today_summary(user, day)
    return {"scope": scope, "active": TT.active_entry(user), **summary}


@router.post("/time/start", status_code=201)
async def time_start(
    req: TimeStart, x_user_id: Optional[str] = Header(None)
) -> dict[str, Any]:
    return _guard(TT.start_entry, _user(x_user_id), **req.model_dump())


@router.post("/time/stop")
async def time_stop(
    req: TimeStop, x_user_id: Optional[str] = Header(None)
) -> dict[str, Any]:
    entry = _guard(TT.stop_entry, _user(x_user_id), req.entry_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="No running timer to stop.")
    return entry


@router.post("/time/log", status_code=201)
async def time_log(
    req: TimeLog, x_user_id: Optional[str] = Header(None)
) -> dict[str, Any]:
    return _guard(TT.log_entry, _user(x_user_id), **req.model_dump())


# ══════════════════════════════════════════════════════════════════════════
# Reminders
# ══════════════════════════════════════════════════════════════════════════
class ReminderCreate(BaseModel):
    text: str
    remind_at: Optional[str] = None
    task_id: Optional[str] = None


@router.get("/reminders")
async def list_reminders(
    include_done: bool = Query(False), x_user_id: Optional[str] = Header(None)
) -> dict[str, Any]:
    return {
        "reminders": R.list_reminders(_user(x_user_id), include_done),
        "note": (
            "Reminders are stored and shown on the Today screen when due. There is "
            "no push notification scheduler in this build."
        ),
    }


@router.post("/reminders", status_code=201)
async def create_reminder(
    req: ReminderCreate, x_user_id: Optional[str] = Header(None)
) -> dict[str, Any]:
    return _guard(R.create_reminder, _user(x_user_id), **req.model_dump())


@router.delete("/reminders/{reminder_id}", status_code=204)
async def delete_reminder(
    reminder_id: str, x_user_id: Optional[str] = Header(None)
):
    if not R.delete_reminder(_user(x_user_id), reminder_id):
        raise HTTPException(status_code=404, detail="No such reminder for this user.")


# ══════════════════════════════════════════════════════════════════════════
# Gita → Action framework (section 11)
# ══════════════════════════════════════════════════════════════════════════
@router.get("/situations")
async def situations() -> dict[str, Any]:
    """
    The situation → concept → action map.

    Exposed so the UI can show what Madhav can help with, and so the labelling
    ("modern interpretation") is visible rather than buried in a prompt.
    """
    from krishna.gita_action import DISCLAIMER, catalog

    return {"situations": catalog(), "disclaimer": DISCLAIMER}
