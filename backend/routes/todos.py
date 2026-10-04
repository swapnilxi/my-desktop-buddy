"""
Todo routes — the legacy task API, now backed by the unified `tasks` table.

The wire contract is unchanged on purpose: the existing frontend, the hamster
and the panda all speak `{id:int, text, completed, created_at, completed_at}`.
That integer id is the task's per-user `seq`, which the migration carries over
from todos.json, so ids people were already looking at keep working.

Richer task fields (priority, due date, tags, subtasks, goals) live on
`/productivity/tasks`; this router is the compatibility surface, not a second
task system.
"""
from typing import List, Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from db import DEFAULT_USER_ID
from productivity import tasks as T

router = APIRouter(prefix="/todos", tags=["todos"])


def _user(x_user_id: Optional[str]) -> str:
    return (x_user_id or DEFAULT_USER_ID).strip() or DEFAULT_USER_ID


class TodoCreate(BaseModel):
    text: str


class TodoItem(BaseModel):
    id: int
    text: str
    completed: bool
    created_at: str
    completed_at: Optional[str] = None


@router.get("", response_model=List[TodoItem])
async def list_todos(x_user_id: Optional[str] = Header(None)):
    """Fetch all to-do items, oldest first — the order the JSON store used."""
    user = _user(x_user_id)
    T.ensure_migrated(user)
    tasks = T.list_tasks(user, include_subtasks=True, limit=1000)
    return [T.legacy_shape(t) for t in sorted(tasks, key=lambda t: t["seq"] or 0)]


@router.post("", response_model=TodoItem, status_code=201)
async def create_todo(todo: TodoCreate, x_user_id: Optional[str] = Header(None)):
    """Add a new to-do item."""
    user = _user(x_user_id)
    T.ensure_migrated(user)
    try:
        task = T.create_task(user, title=todo.text)
    except T.TaskError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return T.legacy_shape(task)


@router.patch("/{todo_id}", response_model=TodoItem)
async def update_todo(todo_id: int, x_user_id: Optional[str] = Header(None)):
    """Toggle a to-do item's completed status."""
    user = _user(x_user_id)
    T.ensure_migrated(user)
    task = T.toggle_task(user, todo_id)
    if task is None:
        raise HTTPException(status_code=404, detail=f"Todo {todo_id} not found")
    return T.legacy_shape(task)


@router.delete("/{todo_id}", status_code=204)
async def remove_todo(todo_id: int, x_user_id: Optional[str] = Header(None)):
    """Delete a to-do item."""
    user = _user(x_user_id)
    T.ensure_migrated(user)
    if not T.delete_task(user, todo_id):
        raise HTTPException(status_code=404, detail=f"Todo {todo_id} not found")
