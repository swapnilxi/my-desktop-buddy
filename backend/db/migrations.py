"""
Schema migrations for existing profiles.

`schema.sql` only ever runs `CREATE TABLE IF NOT EXISTS`, so a database that
was created by an earlier build keeps its old column set forever. These
migrations bring such a database up to the current shape *before* the schema
script runs, which matters because some of the indexes in `schema.sql` are
defined over columns added here.

Everything below is idempotent and additive: columns are added, never
dropped, and a rename only happens when the old name is still present.
"""
from __future__ import annotations

import sqlite3

# (table, old_name, new_name) — applied only when the old column still exists
# and the new one does not. The productivity tables shipped unused, so these
# renames cannot lose anyone's data.
_RENAMES: list[tuple[str, str, str]] = [
    ("tasks", "deadline", "due_date"),
    ("goals", "name", "title"),
    ("goals", "reason", "description"),
    ("goals", "deadline", "target_date"),
    ("habits", "cadence", "frequency"),
]

# (table, column, DDL fragment) — added when missing.
_ADD_COLUMNS: list[tuple[str, str, str]] = [
    ("tasks", "seq", "INTEGER"),
    ("tasks", "description", "TEXT"),
    ("tasks", "due_date", "TEXT"),
    ("tasks", "estimated_minutes", "INTEGER"),
    ("tasks", "actual_minutes", "INTEGER NOT NULL DEFAULT 0"),
    ("tasks", "tags", "TEXT NOT NULL DEFAULT '[]'"),
    ("tasks", "parent_task_id", "TEXT"),
    ("tasks", "goal_id", "TEXT"),
    ("tasks", "updated_at", "TEXT"),
    ("goals", "title", "TEXT"),
    ("goals", "description", "TEXT"),
    ("goals", "category", "TEXT"),
    ("goals", "target_date", "TEXT"),
    ("goals", "completed_at", "TEXT"),
    ("habits", "frequency", "TEXT NOT NULL DEFAULT 'daily'"),
    ("habits", "target_per_week", "INTEGER NOT NULL DEFAULT 7"),
    ("habits", "goal_id", "TEXT"),
    ("habits", "archived", "INTEGER NOT NULL DEFAULT 0"),
    ("habits", "updated_at", "TEXT"),
    ("habit_logs", "user_id", "TEXT"),
    ("habit_logs", "created_at", "TEXT"),
    ("focus_sessions", "category", "TEXT NOT NULL DEFAULT 'OTHER'"),
    ("focus_sessions", "task_id", "TEXT"),
    ("focus_sessions", "goal_id", "TEXT"),
    ("focus_sessions", "intended", "TEXT"),
    ("focus_sessions", "reflection", "TEXT"),
    ("focus_sessions", "finished_intent", "INTEGER"),
]


def _table_exists(conn: sqlite3.Connection, table: str) -> bool:
    row = conn.execute(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?", (table,)
    ).fetchone()
    return row is not None


def _columns(conn: sqlite3.Connection, table: str) -> set[str]:
    return {r[1] for r in conn.execute(f"PRAGMA table_info({table})").fetchall()}


def migrate(conn: sqlite3.Connection) -> list[str]:
    """
    Bring an existing database up to the current schema. Returns the list of
    statements applied, which is empty for a fresh database.
    """
    applied: list[str] = []

    for table, old, new in _RENAMES:
        if not _table_exists(conn, table):
            continue
        cols = _columns(conn, table)
        if old in cols and new not in cols:
            conn.execute(f"ALTER TABLE {table} RENAME COLUMN {old} TO {new}")
            applied.append(f"{table}.{old}->{new}")

    for table, column, ddl in _ADD_COLUMNS:
        if not _table_exists(conn, table):
            continue
        if column not in _columns(conn, table):
            conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}")
            applied.append(f"{table}+{column}")

    if _table_exists(conn, "tasks"):
        applied.extend(_backfill_tasks(conn))

    return applied


def _backfill_tasks(conn: sqlite3.Connection) -> list[str]:
    """Normalise task rows written before the status/priority vocabulary existed."""
    applied: list[str] = []
    cols = _columns(conn, "tasks")

    if "updated_at" in cols:
        n = conn.execute(
            "UPDATE tasks SET updated_at = created_at WHERE updated_at IS NULL"
        ).rowcount
        if n:
            applied.append(f"tasks.updated_at backfilled ({n})")

    # Old rows used lowercase 'todo' / 'medium'. The vocabulary is uppercase now.
    n = conn.execute(
        "UPDATE tasks SET status = UPPER(status) WHERE status <> UPPER(status)"
    ).rowcount
    n += conn.execute(
        "UPDATE tasks SET priority = UPPER(priority) WHERE priority <> UPPER(priority)"
    ).rowcount
    if n:
        applied.append(f"tasks case-normalised ({n})")

    if "seq" in cols:
        rows = conn.execute(
            "SELECT id, user_id FROM tasks WHERE seq IS NULL ORDER BY created_at"
        ).fetchall()
        for row in rows:
            nxt = conn.execute(
                "SELECT COALESCE(MAX(seq), 0) + 1 FROM tasks WHERE user_id = ?",
                (row[1],),
            ).fetchone()[0]
            conn.execute("UPDATE tasks SET seq = ? WHERE id = ?", (nxt, row[0]))
        if rows:
            applied.append(f"tasks.seq backfilled ({len(rows)})")

    return applied
