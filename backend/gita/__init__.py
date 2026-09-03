"""
Gita knowledge engine.

Public surface used by tools, routes and tests:
    seed_if_empty, search, get_verse, get_chapter_verses,
    list_chapters, list_themes, get_sources, validate_reference
"""
from gita.chapters import CHAPTERS, TOTAL_VERSES, parse_reference, validate_reference
from gita.store import (
    get_chapter_verses,
    get_sources,
    get_verse,
    list_chapters,
    list_themes,
    search,
    seed_if_empty,
    verse_count_available,
)

__all__ = [
    "CHAPTERS", "TOTAL_VERSES", "parse_reference", "validate_reference",
    "search", "get_verse", "get_chapter_verses", "list_chapters", "list_themes",
    "get_sources", "seed_if_empty", "verse_count_available",
]
