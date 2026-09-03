"""
Memory store (Parts 27, 28, 29, 59).

Guarantees this module is responsible for:

  * **Isolation.** Every read and write is scoped by user_id. There is no
    function here that returns memories without one (Part 59).
  * **Consent.** `propose_memory` never writes. A memory only lands in the
    DB through `save_memory`, and anything classified sensitive is refused
    unless the caller passes an explicit user confirmation (Part 27).
  * **Pause.** When a user pauses memory, saves are refused and recall
    returns nothing — the pause is enforced here, not in the UI (Part 28).
  * **Ownership.** `forget_everything` really deletes rows.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Optional

from db import get_conn, new_id, now_iso

CATEGORIES = (
    "PROFILE",
    "PREFERENCE",
    "GOAL",
    "PROJECT",
    "WORK",
    "LEARNING",
    "HABIT",
    "TASK",
    "DECISION",
    "CONVERSATION_CONTEXT",
)

MEMORY_PAUSED_KEY = "memory_paused"

# Patterns for material we refuse to store quietly. Matching one does not
# mean "never store" — it means "never store without the user saying so".
_SENSITIVE_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("credential", re.compile(r"\b(password|passwd|passphrase|api[_\s-]?key|secret[_\s-]?key|access[_\s-]?token|private[_\s-]?key)\b", re.I)),
    ("credential", re.compile(r"\b(sk-[A-Za-z0-9]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_\-]{30,})")),
    ("financial", re.compile(r"\b(?:\d[ -]*?){13,19}\b")),
    ("financial", re.compile(r"\b(bank\s+account|ifsc|routing\s+number|cvv|upi\s+pin|card\s+number)\b", re.I)),
    ("government_id", re.compile(r"\b(aadhaar|aadhar|social\s+security|ssn|passport\s+number|pan\s+card|driver'?s?\s+licen[cs]e)\b", re.I)),
    ("government_id", re.compile(r"\b\d{4}\s?\d{4}\s?\d{4}\b")),
    ("health", re.compile(r"\b(diagnos(?:is|ed)|prescription|medication|dosage|mg\s+daily|therapist|psychiatric|depression|anxiety\s+disorder|hiv|cancer)\b", re.I)),
    ("contact", re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.]{2,}\b")),
    ("contact", re.compile(r"(?:\+\d{1,3}[\s-]?)?\b\d{10}\b")),
    ("location", re.compile(r"\b(home\s+address|street\s+address|flat\s+no|house\s+no|pin\s?code|zip\s?code)\b", re.I)),
]


@dataclass
class MemoryProposal:
    """
    A memory Krishna *wants* to keep, awaiting the user's answer.

    Nothing is persisted until the user picks Remember. `requires_consent`
    is True for sensitive content, so the UI can say why it is asking.
    """

    category: str
    key: str
    value: str
    source: str = "conversation"
    sensitive: bool = False
    sensitivity_kinds: list[str] | None = None
    requires_consent: bool = True
    prompt: str = "Should I remember this for next time?"

    def as_dict(self) -> dict[str, Any]:
        return {
            "category": self.category,
            "key": self.key,
            "value": self.value,
            "source": self.source,
            "sensitive": self.sensitive,
            "sensitivity_kinds": self.sensitivity_kinds or [],
            "requires_consent": self.requires_consent,
            "prompt": self.prompt,
            "actions": ["remember", "dont_remember"],
        }


def classify_sensitivity(text: str) -> list[str]:
    """Return the kinds of sensitive content detected (empty = none)."""
    found: list[str] = []
    for kind, pattern in _SENSITIVE_PATTERNS:
        if pattern.search(text or "") and kind not in found:
            found.append(kind)
    return found


def _normalize_category(category: str) -> str:
    c = (category or "").strip().upper()
    if c not in CATEGORIES:
        raise ValueError(
            f"Unknown memory category {category!r}. Expected one of: {', '.join(CATEGORIES)}"
        )
    return c


# ── Pause control (Part 28) ──────────────────────────────────────────────
def is_memory_paused(user_id: str) -> bool:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT value FROM settings WHERE user_id = ? AND key = ?",
            (user_id, MEMORY_PAUSED_KEY),
        ).fetchone()
    return bool(row and row["value"] == "1")


def set_memory_paused(user_id: str, paused: bool) -> dict[str, Any]:
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO settings (user_id, key, value, updated_at) VALUES (?,?,?,?)"
            " ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value,"
            " updated_at = excluded.updated_at",
            (user_id, MEMORY_PAUSED_KEY, "1" if paused else "0", now_iso()),
        )
    return {"user_id": user_id, "memory_paused": paused}


# ── Proposal + write (Part 27) ───────────────────────────────────────────
def propose_memory(
    category: str,
    key: str,
    value: str,
    source: str = "conversation",
) -> MemoryProposal:
    """Build a consent request. Writes nothing."""
    kinds = classify_sensitivity(value) + classify_sensitivity(key)
    kinds = list(dict.fromkeys(kinds))
    prompt = "Should I remember this for next time?"
    if kinds:
        prompt = (
            "This looks like sensitive information "
            f"({', '.join(kinds)}). I won't store it unless you tell me to. "
            "Should I remember it?"
        )
    return MemoryProposal(
        category=_normalize_category(category),
        key=key.strip(),
        value=value.strip(),
        source=source,
        sensitive=bool(kinds),
        sensitivity_kinds=kinds,
        requires_consent=True,
        prompt=prompt,
    )


def save_memory(
    user_id: str,
    category: str,
    key: str,
    value: str,
    source: str = "conversation",
    user_confirmed: bool = False,
    allow_sensitive: bool = False,
) -> dict[str, Any]:
    """
    Persist a memory.

    Refuses when memory is paused, and refuses sensitive content unless the
    caller passes both `user_confirmed` and `allow_sensitive` — which only
    happens when a human clicked Remember on a proposal that said so.
    """
    category = _normalize_category(category)
    key = (key or "").strip()
    value = (value or "").strip()
    if not key or not value:
        raise ValueError("A memory needs both a key and a value.")

    if is_memory_paused(user_id):
        return {
            "saved": False,
            "reason": "memory_paused",
            "message": "Memory is paused right now, so I didn't store that.",
        }

    kinds = list(dict.fromkeys(classify_sensitivity(value) + classify_sensitivity(key)))
    if kinds and not (user_confirmed and allow_sensitive):
        return {
            "saved": False,
            "reason": "sensitive_requires_consent",
            "sensitivity_kinds": kinds,
            "message": (
                "That looks like sensitive information "
                f"({', '.join(kinds)}), so I won't store it unless you explicitly ask me to."
            ),
        }

    from db import ensure_user

    ensure_user(user_id)
    ts = now_iso()
    with get_conn() as conn:
        existing = conn.execute(
            "SELECT id, created_at FROM memories WHERE user_id = ? AND category = ? AND key = ?",
            (user_id, category, key),
        ).fetchone()
        if existing:
            conn.execute(
                "UPDATE memories SET value = ?, source = ?, user_confirmed = ?,"
                " sensitive = ?, updated_at = ? WHERE id = ?",
                (value, source, 1 if user_confirmed else 0, 1 if kinds else 0, ts, existing["id"]),
            )
            mem_id = existing["id"]
            created = existing["created_at"]
            action = "updated"
        else:
            mem_id = new_id()
            created = ts
            conn.execute(
                "INSERT INTO memories (id, user_id, category, key, value, source,"
                " user_confirmed, sensitive, created_at, updated_at)"
                " VALUES (?,?,?,?,?,?,?,?,?,?)",
                (mem_id, user_id, category, key, value, source,
                 1 if user_confirmed else 0, 1 if kinds else 0, ts, ts),
            )
            action = "created"

    return {
        "saved": True,
        "action": action,
        "memory": {
            "id": mem_id, "user_id": user_id, "category": category, "key": key,
            "value": value, "source": source, "user_confirmed": user_confirmed,
            "sensitive": bool(kinds), "created_at": created, "updated_at": ts,
        },
    }


# ── Reads — always scoped by user_id (Part 59) ───────────────────────────
def _row(m) -> dict[str, Any]:
    d = dict(m)
    d["user_confirmed"] = bool(d["user_confirmed"])
    d["sensitive"] = bool(d["sensitive"])
    return d


def get_memory(user_id: str, memory_id: str) -> Optional[dict[str, Any]]:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM memories WHERE id = ? AND user_id = ?", (memory_id, user_id)
        ).fetchone()
    return _row(row) if row else None


def list_memories(
    user_id: str,
    category: Optional[str] = None,
    include_sensitive: bool = True,
    limit: int = 500,
) -> list[dict[str, Any]]:
    sql = "SELECT * FROM memories WHERE user_id = ?"
    params: list[Any] = [user_id]
    if category:
        sql += " AND category = ?"
        params.append(_normalize_category(category))
    if not include_sensitive:
        sql += " AND sensitive = 0"
    sql += " ORDER BY updated_at DESC LIMIT ?"
    params.append(limit)
    with get_conn() as conn:
        rows = conn.execute(sql, params).fetchall()
    return [_row(r) for r in rows]


def update_memory(
    user_id: str,
    memory_id: str,
    value: Optional[str] = None,
    key: Optional[str] = None,
    category: Optional[str] = None,
) -> Optional[dict[str, Any]]:
    current = get_memory(user_id, memory_id)
    if current is None:
        return None
    new_value = value if value is not None else current["value"]
    new_key = key if key is not None else current["key"]
    new_cat = _normalize_category(category) if category else current["category"]
    kinds = list(dict.fromkeys(classify_sensitivity(new_value) + classify_sensitivity(new_key)))

    with get_conn() as conn:
        conn.execute(
            "UPDATE memories SET key = ?, value = ?, category = ?, sensitive = ?,"
            " user_confirmed = 1, updated_at = ? WHERE id = ? AND user_id = ?",
            (new_key, new_value, new_cat, 1 if kinds else 0, now_iso(), memory_id, user_id),
        )
    return get_memory(user_id, memory_id)


def delete_memory(user_id: str, memory_id: str) -> bool:
    with get_conn() as conn:
        cur = conn.execute(
            "DELETE FROM memories WHERE id = ? AND user_id = ?", (memory_id, user_id)
        )
        return cur.rowcount > 0


def forget_everything(user_id: str) -> dict[str, Any]:
    """Delete every memory for this user. Rows are removed, not flagged."""
    with get_conn() as conn:
        cur = conn.execute("DELETE FROM memories WHERE user_id = ?", (user_id,))
        deleted = cur.rowcount
    return {"deleted": deleted, "user_id": user_id}


def export_memories(user_id: str) -> dict[str, Any]:
    """Data export for the privacy controls (Part 68)."""
    return {
        "user_id": user_id,
        "exported_at": now_iso(),
        "memory_paused": is_memory_paused(user_id),
        "memories": list_memories(user_id),
    }


# ── Recall for prompt injection (Part 29) ────────────────────────────────
_RECALL_PRIORITY = (
    "PROFILE", "PREFERENCE", "GOAL", "PROJECT", "WORK", "LEARNING",
    "HABIT", "DECISION", "TASK", "CONVERSATION_CONTEXT",
)


def recall_for_prompt(user_id: str, limit: int = 12) -> list[dict[str, Any]]:
    """
    Memories worth putting in the system prompt.

    Sensitive memories are excluded even when the user confirmed them — they
    were stored for the user's own retrieval, not for injection into every
    request. Ordered by category importance, then recency.
    """
    if is_memory_paused(user_id):
        return []
    rows = list_memories(user_id, include_sensitive=False, limit=200)
    order = {c: i for i, c in enumerate(_RECALL_PRIORITY)}
    rows.sort(key=lambda r: (order.get(r["category"], 99), r["updated_at"]), reverse=False)
    return rows[:limit]
