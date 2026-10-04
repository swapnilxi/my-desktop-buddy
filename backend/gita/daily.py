"""
Daily Gita, Word of the Day and Today's Teaching (Parts 9, 10, 11).

Selection is deterministic per calendar day (derived from the date ordinal),
so the same day always yields the same verse for a given corpus, and the
choice is also persisted so history stays queryable.

Labelling discipline, which the API response preserves:
  * `sanskrit` / `translation` carry the verse's own source + verified flag.
  * `krishna_thought` and `practical_lesson` are marked as interpretation —
    they are never presented as words spoken by Krishna (Part 9).
  * A word's gita connection is dropped if the verse is not in the store, so
    the UI can never show a reference we cannot display.
"""
from __future__ import annotations

from datetime import date, datetime
from typing import Any, Optional

from db import get_conn, now_iso
from gita.models import Verse
from gita.store import get_verse, verse_count_available
from gita.teachings import TEACHINGS, TEACHINGS_BY_ID
from gita.words import WORDS, WORDS_BY_ID

INTERPRETATION_NOTE = (
    "This is a practical application written for this app — an interpretation "
    "inspired by the verse, not a quotation from it."
)


def _today(day: Optional[str] = None) -> str:
    if day:
        return day
    return date.today().isoformat()


def _ordinal(day: str) -> int:
    return datetime.strptime(day, "%Y-%m-%d").date().toordinal()


def _available_verse_ids() -> list[str]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT id FROM gita_verses ORDER BY chapter, verse"
        ).fetchall()
    return [r["id"] for r in rows]


# ── Daily verse (Part 9) ─────────────────────────────────────────────────
def get_daily_verse(day: Optional[str] = None) -> dict[str, Any]:
    day = _today(day)

    with get_conn() as conn:
        row = conn.execute(
            "SELECT verse_id, thought FROM daily_verses WHERE day = ?", (day,)
        ).fetchone()

    verse_id: Optional[str] = row["verse_id"] if row else None
    if verse_id is None:
        ids = _available_verse_ids()
        if not ids:
            return {
                "day": day,
                "available": False,
                "message": "The Gita knowledge base is empty — no verse to show yet.",
            }
        verse_id = ids[_ordinal(day) % len(ids)]

    chapter, verse_num = (int(p) for p in verse_id.split("."))
    lookup = get_verse(chapter, verse_num)
    if not lookup.found or lookup.verse is None:
        return {
            "day": day, "available": False,
            "message": lookup.message or "Today's verse could not be loaded.",
        }

    v: Verse = lookup.verse
    tr = v.primary_translation()
    thought = (row["thought"] if row and row["thought"] else None) or _thought_for(v)

    with get_conn() as conn:
        conn.execute(
            "INSERT OR IGNORE INTO daily_verses (day, verse_id, thought, created_at)"
            " VALUES (?,?,?,?)",
            (day, verse_id, thought, now_iso()),
        )

    return {
        "day": day,
        "available": True,
        "chapter": v.chapter,
        "verse": v.verse,
        "reference": v.reference,
        "chapter_name": v.chapter_name,
        "sanskrit": v.sanskrit,
        "transliteration": v.transliteration,
        "translation": tr.text if tr else None,
        "translation_source": tr.source_name if tr else None,
        "themes": v.themes,
        "theme": v.themes[0] if v.themes else None,
        "practical_lesson": {
            "text": v.practical_application[0].text if v.practical_application else thought,
            "label": "interpretation",
            "note": INTERPRETATION_NOTE,
        },
        "krishna_thought": {"text": thought, "label": "interpretation", "note": INTERPRETATION_NOTE},
        "source": v.source,
        "verified": v.verified,
        "provenance_note": (
            None if v.verified
            else "This verse text is from the app's curated seed data and has not yet "
                 "been verified against a primary edition."
        ),
    }


def _thought_for(v: Verse) -> str:
    if v.practical_application:
        return v.practical_application[0].text
    theme = (v.themes[0] if v.themes else "steadiness")
    return f"Today, give one honest hour to {theme} — and let today's result be today's."


# ── Word of the day (Part 10) ────────────────────────────────────────────
def get_word_of_day(day: Optional[str] = None) -> dict[str, Any]:
    day = _today(day)

    with get_conn() as conn:
        row = conn.execute("SELECT word_id FROM word_of_day WHERE day = ?", (day,)).fetchone()

    word = WORDS_BY_ID.get(row["word_id"]) if row else None
    if word is None:
        word = WORDS[_ordinal(day) % len(WORDS)]
        with get_conn() as conn:
            conn.execute(
                "INSERT OR IGNORE INTO word_of_day (day, word_id, created_at) VALUES (?,?,?)",
                (day, word["id"], now_iso()),
            )

    connection: Optional[dict[str, Any]] = None
    ref = word.get("gita_ref")
    if ref:
        lookup = get_verse(ref[0], ref[1])
        if lookup.found and lookup.verse is not None:
            tr = lookup.verse.primary_translation()
            connection = {
                "reference": lookup.verse.reference,
                "chapter": ref[0],
                "verse": ref[1],
                "translation": tr.text if tr else None,
                "verified": lookup.verse.verified,
            }
        # If the verse isn't available we simply omit the connection rather
        # than print a reference we cannot show.

    return {
        "day": day,
        "id": word["id"],
        "word": word["word"],
        "devanagari": word["devanagari"],
        "transliteration": word["transliteration"],
        "pronunciation": word["pronunciation"],
        "meaning": word["meaning"],
        "explanation": word["explanation"],
        "gita_connection": connection,
        "application": {"text": word["application"], "label": "interpretation"},
    }


# ── Teaching of the day (Part 11) ────────────────────────────────────────
def get_teaching_of_day(day: Optional[str] = None) -> dict[str, Any]:
    day = _today(day)

    with get_conn() as conn:
        row = conn.execute(
            "SELECT teaching_id FROM daily_teachings WHERE day = ?", (day,)
        ).fetchone()

    teaching = TEACHINGS_BY_ID.get(row["teaching_id"]) if row else None
    if teaching is None:
        teaching = TEACHINGS[_ordinal(day) % len(TEACHINGS)]
        with get_conn() as conn:
            conn.execute(
                "INSERT OR IGNORE INTO daily_teachings (day, teaching_id, created_at)"
                " VALUES (?,?,?)",
                (day, teaching["id"], now_iso()),
            )

    inspired_by: Optional[dict[str, Any]] = None
    ref = teaching.get("gita_ref")
    if ref:
        lookup = get_verse(ref[0], ref[1])
        if lookup.found and lookup.verse is not None:
            inspired_by = {
                "reference": lookup.verse.reference,
                "chapter": ref[0],
                "verse": ref[1],
                "verified": lookup.verse.verified,
            }

    return {
        "day": day,
        "id": teaching["id"],
        "text": teaching["text"],
        "theme": teaching["theme"],
        "label": "inspired_by",
        "note": (
            "A life principle inspired by the Gita's themes — not a direct quotation."
        ),
        "inspired_by": inspired_by,
    }


def get_daily_bundle(day: Optional[str] = None) -> dict[str, Any]:
    """Everything the daily screen needs in one call."""
    day = _today(day)
    return {
        "day": day,
        "verse": get_daily_verse(day),
        "word": get_word_of_day(day),
        "teaching": get_teaching_of_day(day),
        "corpus_size": verse_count_available(),
    }
