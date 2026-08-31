"""
HamsterDesk Context Manager
Personal context + dynamic to-do state injected into every LLM call.
"""
from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Optional
from config_manager import TODOS_FILE, get_config


# ── Personal context template ────────────────────────────────────
def get_personal_context(
    buddy_type: Optional[str] = None,
    buddy_name: Optional[str] = None,
) -> str:
    """Build personal context string from current config and buddy choice."""
    config = get_config()
    b_type = (buddy_type or getattr(config.hamster, "buddy_type", "hamster") or "hamster").lower()
    b_name = buddy_name or config.hamster.name or ("Bambu" if b_type == "panda" else "Hammy")

    persona_desc = None
    prompt_path = Path(__file__).parent.parent / "frontend" / "src" / "components" / "Buddies" / b_type.capitalize() / f"{b_type}_prompt.txt"
    if prompt_path.exists():
        try:
            with open(prompt_path, "r", encoding="utf-8") as f:
                persona_desc = f.read().replace("{b_name}", b_name).strip()
        except Exception:
            pass

    if not persona_desc:
        if b_type == "krishna":
            persona_desc = (
                f"Your name is {b_name}. You are Little Krishna, an enchanting, playful, loving, and wise desktop companion. "
                f"You wear a peacock feather 🪶 in your crown, golden dhoti, and carry a sweet bansuri flute 🪈. "
                f"You love freshly churned butter 🧈, spreading joy, timeless wisdom, and inspiring the user with creative delight."
            )
        elif b_type == "panda":
            persona_desc = (
                f"Your name is {b_name}. You are an adorable, chill, and peaceful desktop panda pet and personal AI companion. "
                f"You love munching fresh green bamboo 🎋, peaceful focus, mindful productivity, and sending warm, cozy energy to the user."
            )
        else:
            persona_desc = (
                f"Your name is {b_name}. You are a cute, cheerful, energetic hamster desktop pet and personal AI assistant. "
                f"You love crunching sunflower seeds 🌻, running on wheels, and celebrating user productivity milestones."
            )

    return f"""{persona_desc}

Personality traits & response formatting:
- Keep your responses direct, natural, cute, and conversational.
- CRITICAL: Never include internal thinking, reasoning process, chain of thought, <think>...</think> tags, or action stage descriptions (e.g. "Thought:", "Action:", "*thinks about it*").
- Output ONLY the final response meant for the user.

Current date and time: {datetime.now().strftime("%A, %B %d, %Y at %I:%M %p")}
"""



# ── To-Do List Management ────────────────────────────────────────
def _load_todos_from_disk() -> list[dict]:
    """Load todos from persistent JSON file."""
    if TODOS_FILE.exists():
        try:
            with open(TODOS_FILE, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, Exception):
            return []
    return []


def _save_todos_to_disk(todos: list[dict]) -> None:
    """Save todos to persistent JSON file."""
    TODOS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(TODOS_FILE, "w") as f:
        json.dump(todos, f, indent=2)


def get_todos() -> list[dict]:
    """Get all todos."""
    return _load_todos_from_disk()


def add_todo(text: str) -> dict:
    """Add a new todo item."""
    todos = _load_todos_from_disk()
    todo = {
        "id": _generate_id(todos),
        "text": text,
        "completed": False,
        "created_at": datetime.now().isoformat(),
    }
    todos.append(todo)
    _save_todos_to_disk(todos)
    return todo


def toggle_todo(todo_id: int) -> Optional[dict]:
    """Toggle a todo's completed status."""
    todos = _load_todos_from_disk()
    for todo in todos:
        if todo["id"] == todo_id:
            todo["completed"] = not todo["completed"]
            if todo["completed"]:
                todo["completed_at"] = datetime.now().isoformat()
            else:
                todo.pop("completed_at", None)
            _save_todos_to_disk(todos)
            return todo
    return None


def delete_todo(todo_id: int) -> bool:
    """Delete a todo by ID."""
    todos = _load_todos_from_disk()
    original_len = len(todos)
    todos = [t for t in todos if t["id"] != todo_id]
    if len(todos) < original_len:
        _save_todos_to_disk(todos)
        return True
    return False


def _generate_id(todos: list[dict]) -> int:
    """Generate next available ID."""
    if not todos:
        return 1
    return max(t["id"] for t in todos) + 1


# ── Full context for LLM injection ───────────────────────────────
def get_full_context(
    buddy_type: Optional[str] = None,
    buddy_name: Optional[str] = None,
) -> str:
    """Build complete context string for LLM system prompt."""
    personal = get_personal_context(buddy_type=buddy_type, buddy_name=buddy_name)
    todos = get_todos()

    todo_section = "\n\nUser's Current To-Do List:\n"
    if todos:
        for t in todos:
            status = "✅" if t["completed"] else "⬜"
            todo_section += f"  {status} {t['text']}\n"

        pending = [t for t in todos if not t["completed"]]
        completed = [t for t in todos if t["completed"]]
        todo_section += f"\n({len(pending)} pending, {len(completed)} completed)"
    else:
        todo_section += "  (No tasks yet — maybe suggest the user add some!)\n"

    return personal + todo_section

