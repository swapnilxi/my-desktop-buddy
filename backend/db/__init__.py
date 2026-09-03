"""
Database layer — SQLite persistence for Madhav (Krishna AI Companion).

Single connection factory + schema bootstrap. Everything else in the app
talks to the DB through the small helpers here so no module has to know
where the file lives or how rows are shaped.
"""
from __future__ import annotations

import json
import sqlite3
import threading
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator, Optional

from config_manager import CONFIG_DIR

DB_FILE = CONFIG_DIR / "krishna.db"
SCHEMA_FILE = Path(__file__).parent / "schema.sql"

DEFAULT_USER_ID = "local-user"

_lock = threading.Lock()
_initialized = False


def now_iso() -> str:
    """UTC timestamp — every stored date is absolute, never relative."""
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return uuid.uuid4().hex


def _connect(path: Optional[Path] = None) -> sqlite3.Connection:
    target = path or DB_FILE
    target.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(target), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db(path: Optional[Path] = None, force: bool = False) -> None:
    """Create the schema if needed and make sure the default user exists."""
    global _initialized
    with _lock:
        if _initialized and not force:
            return
        with _connect(path) as conn:
            conn.executescript(SCHEMA_FILE.read_text(encoding="utf-8"))
            conn.execute(
                "INSERT OR IGNORE INTO users (id, display_name, created_at, updated_at)"
                " VALUES (?, ?, ?, ?)",
                (DEFAULT_USER_ID, "Friend", now_iso(), now_iso()),
            )
            conn.commit()
        _initialized = True


@contextmanager
def get_conn(path: Optional[Path] = None) -> Iterator[sqlite3.Connection]:
    """Transactional connection. Commits on success, rolls back on error."""
    if not _initialized:
        init_db(path)
    conn = _connect(path)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


# ── Row helpers ──────────────────────────────────────────────────────────
def rows_to_dicts(rows: list[sqlite3.Row]) -> list[dict[str, Any]]:
    return [dict(r) for r in rows]


def row_to_dict(row: Optional[sqlite3.Row]) -> Optional[dict[str, Any]]:
    return dict(row) if row is not None else None


def dump_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False)


def load_json(value: Optional[str], fallback: Any = None) -> Any:
    if not value:
        return [] if fallback is None else fallback
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return [] if fallback is None else fallback


def ensure_user(user_id: str, display_name: Optional[str] = None) -> str:
    """Idempotently create a user row. Returns the user id."""
    with get_conn() as conn:
        conn.execute(
            "INSERT OR IGNORE INTO users (id, display_name, created_at, updated_at)"
            " VALUES (?, ?, ?, ?)",
            (user_id, display_name or "Friend", now_iso(), now_iso()),
        )
    return user_id
