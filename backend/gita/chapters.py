"""
Canonical Bhagavad Gita structure (Parts 6, 57).

This module is the *reference-validity* authority. It knows how many verses
each chapter has, so a request like "Gita 20.10" or "Gita 2.500" is rejected
as an invalid reference instead of being handed to an LLM that might invent
something. It says nothing about verse *content* — that lives in the store
and always carries a source.

Verse counts follow the widely used 700-verse recension (Gita Press and the
IIT Kanpur Gita Supersite agree on these). Chapter 13 is 34 verses in this
recension; some editions number it 35 by splitting the opening verse, so a
13.35 request is reported as edition-dependent rather than flatly invalid.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

TOTAL_VERSES = 700
TOTAL_CHAPTERS = 18


@dataclass(frozen=True)
class Chapter:
    number: int
    name_iast: str
    name_en: str
    verse_count: int


CHAPTERS: dict[int, Chapter] = {
    1:  Chapter(1,  "Arjuna Viṣāda Yoga",              "Arjuna's Despondency",                 47),
    2:  Chapter(2,  "Sāṅkhya Yoga",                    "The Yoga of Knowledge",                72),
    3:  Chapter(3,  "Karma Yoga",                      "The Yoga of Action",                   43),
    4:  Chapter(4,  "Jñāna Karma Sanyāsa Yoga",        "Knowledge, Action and Renunciation",   42),
    5:  Chapter(5,  "Karma Sanyāsa Yoga",              "The Yoga of Renunciation of Action",   29),
    6:  Chapter(6,  "Ātma Saṁyama Yoga",               "The Yoga of Self-Restraint",           47),
    7:  Chapter(7,  "Jñāna Vijñāna Yoga",              "Knowledge and Realisation",            30),
    8:  Chapter(8,  "Akṣara Brahma Yoga",              "The Imperishable Absolute",            28),
    9:  Chapter(9,  "Rāja Vidyā Rāja Guhya Yoga",      "The Royal Knowledge and Secret",       34),
    10: Chapter(10, "Vibhūti Yoga",                    "Divine Manifestations",                42),
    11: Chapter(11, "Viśvarūpa Darśana Yoga",          "The Vision of the Universal Form",     55),
    12: Chapter(12, "Bhakti Yoga",                     "The Yoga of Devotion",                 20),
    13: Chapter(13, "Kṣetra Kṣetrajña Vibhāga Yoga",   "The Field and Its Knower",             34),
    14: Chapter(14, "Guṇatraya Vibhāga Yoga",          "The Three Guṇas",                      27),
    15: Chapter(15, "Puruṣottama Yoga",                "The Supreme Person",                   20),
    16: Chapter(16, "Daivāsura Sampad Vibhāga Yoga",   "The Divine and Demoniac Natures",      24),
    17: Chapter(17, "Śraddhātraya Vibhāga Yoga",       "The Three Kinds of Faith",             28),
    18: Chapter(18, "Mokṣa Sanyāsa Yoga",              "Liberation through Renunciation",      78),
}

# References that legitimately differ between printed editions. Reporting
# these as "edition-dependent" is more truthful than "invalid".
EDITION_VARIANT_REFS: dict[tuple[int, int], str] = {
    (13, 35): (
        "Chapter 13 has 34 verses in the 700-verse recension used here. "
        "Some editions number it 35 by counting Arjuna's opening question "
        "separately, so 13.35 in your edition is likely 13.34 here."
    ),
}


@dataclass(frozen=True)
class RefCheck:
    valid: bool
    reason: Optional[str] = None
    edition_variant: bool = False

    @property
    def message(self) -> str:
        return self.reason or "Valid reference."


def get_chapter(chapter: int) -> Optional[Chapter]:
    return CHAPTERS.get(chapter)


def verse_count(chapter: int) -> int:
    ch = CHAPTERS.get(chapter)
    return ch.verse_count if ch else 0


def validate_reference(chapter: int, verse: Optional[int] = None) -> RefCheck:
    """
    Check a chapter[.verse] reference against the canonical structure.

    Returns a RefCheck rather than raising, so callers can turn an invalid
    reference into an honest user-facing message (Part 57).
    """
    if not isinstance(chapter, int) or isinstance(chapter, bool):
        return RefCheck(False, "Chapter must be a whole number between 1 and 18.")
    if chapter < 1 or chapter > TOTAL_CHAPTERS:
        return RefCheck(
            False,
            f"The Bhagavad Gita has {TOTAL_CHAPTERS} chapters, so chapter {chapter} "
            f"does not exist. Please pick a chapter from 1 to {TOTAL_CHAPTERS}.",
        )

    if verse is None:
        return RefCheck(True)

    if not isinstance(verse, int) or isinstance(verse, bool):
        return RefCheck(False, "Verse must be a whole number.")

    ch = CHAPTERS[chapter]
    if verse < 1:
        return RefCheck(False, "Verse numbers start at 1.")

    if verse > ch.verse_count:
        variant = EDITION_VARIANT_REFS.get((chapter, verse))
        if variant:
            return RefCheck(False, variant, edition_variant=True)
        return RefCheck(
            False,
            f"Chapter {chapter} ({ch.name_iast}) has {ch.verse_count} verses, "
            f"so {chapter}.{verse} is not a valid reference.",
        )

    return RefCheck(True)


def parse_reference(text: str) -> Optional[tuple[int, Optional[int]]]:
    """
    Pull a chapter/verse reference out of free text.

    Handles "2.47", "2:47", "chapter 2 verse 47", "Gita 2.47", "BG 2.47".
    Returns (chapter, verse|None) or None when nothing looks like a reference.
    Does NOT validate — call validate_reference on the result.
    """
    import re

    if not text:
        return None
    lowered = text.lower()

    m = re.search(r"chapter\s+(\d{1,2})\s*(?:,|\s)\s*(?:verse|shloka|sloka)\s+(\d{1,3})", lowered)
    if m:
        return int(m.group(1)), int(m.group(2))

    m = re.search(r"\b(\d{1,2})\s*[.:\-]\s*(\d{1,3})\b", lowered)
    if m:
        return int(m.group(1)), int(m.group(2))

    m = re.search(r"chapter\s+(\d{1,2})\b", lowered)
    if m:
        return int(m.group(1)), None

    return None
