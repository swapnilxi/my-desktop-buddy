"""
Todo routes — CRUD operations for task management.
"""
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from context import get_todos, add_todo, toggle_todo, delete_todo

router = APIRouter(prefix="/todos", tags=["todos"])


class TodoCreate(BaseModel):
    text: str


class TodoItem(BaseModel):
    id: int
    text: str
    completed: bool
    created_at: str
    completed_at: Optional[str] = None


@router.get("", response_model=List[TodoItem])
async def list_todos():
    """Fetch all to-do items."""
    return get_todos()


@router.post("", response_model=TodoItem, status_code=201)
async def create_todo(todo: TodoCreate):
    """Add a new to-do item."""
    if not todo.text.strip():
        raise HTTPException(status_code=400, detail="Task text cannot be empty")
    return add_todo(todo.text.strip())


@router.patch("/{todo_id}", response_model=TodoItem)
async def update_todo(todo_id: int):
    """Toggle a to-do item's completed status."""
    result = toggle_todo(todo_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Todo {todo_id} not found")
    return result


@router.delete("/{todo_id}", status_code=204)
async def remove_todo(todo_id: int):
    """Delete a to-do item."""
    if not delete_todo(todo_id):
        raise HTTPException(status_code=404, detail=f"Todo {todo_id} not found")
