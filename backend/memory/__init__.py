"""Persistent memory with user consent and controls (Parts 27, 28, 29)."""
from memory.store import (
    CATEGORIES,
    MemoryProposal,
    classify_sensitivity,
    delete_memory,
    forget_everything,
    get_memory,
    is_memory_paused,
    list_memories,
    propose_memory,
    recall_for_prompt,
    save_memory,
    set_memory_paused,
    update_memory,
)

__all__ = [
    "CATEGORIES", "MemoryProposal", "classify_sensitivity", "save_memory",
    "get_memory", "list_memories", "update_memory", "delete_memory",
    "forget_everything", "is_memory_paused", "set_memory_paused",
    "propose_memory", "recall_for_prompt",
]
