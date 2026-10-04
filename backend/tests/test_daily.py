"""Daily content tests (Parts 9, 10, 11)."""
from __future__ import annotations

import pytest

from gita.daily import get_daily_bundle, get_daily_verse, get_teaching_of_day, get_word_of_day
from gita.teachings import TEACHINGS
from gita.words import WORDS


def test_daily_verse_is_complete(seeded):
    v = get_daily_verse("2026-09-04")
    assert v["available"]
    for field in ("chapter", "verse", "reference", "sanskrit", "transliteration",
                  "translation", "theme", "practical_lesson", "krishna_thought"):
        assert v[field], f"missing {field}"


def test_daily_verse_is_deterministic(seeded):
    assert get_daily_verse("2026-09-04")["reference"] == get_daily_verse("2026-09-04")["reference"]


def test_daily_verse_rotates(seeded):
    refs = {get_daily_verse(f"2026-09-{d:02d}")["reference"] for d in range(4, 12)}
    assert len(refs) > 1


def test_krishna_thought_is_labelled_interpretation(seeded):
    """Part 9 — the practical thought must not read as a quotation."""
    v = get_daily_verse("2026-09-04")
    assert v["krishna_thought"]["label"] == "interpretation"
    assert "interpretation" in v["krishna_thought"]["note"]
    assert v["practical_lesson"]["label"] == "interpretation"


def test_unverified_verse_carries_a_provenance_note(seeded):
    v = get_daily_verse("2026-09-04")
    assert v["verified"] is False
    assert "not yet been verified" in v["provenance_note"]


# ── Word of the day (Part 10) ────────────────────────────────────────────
def test_word_of_day_has_every_display_field(seeded):
    w = get_word_of_day("2026-09-04")
    for field in ("word", "devanagari", "transliteration", "pronunciation",
                  "meaning", "explanation", "application"):
        assert w[field], f"missing {field}"


def test_word_of_day_is_deterministic_and_rotates(seeded):
    assert get_word_of_day("2026-09-04")["id"] == get_word_of_day("2026-09-04")["id"]
    assert len({get_word_of_day(f"2026-09-{d:02d}")["id"] for d in range(4, 12)}) > 1


def test_spec_listed_words_are_present():
    ids = {w["id"] for w in WORDS}
    assert {"dharma", "karma", "samatva", "shraddha", "bhakti", "vairagya",
            "sankalpa", "dhyana", "kshama", "karuna"} <= ids


def test_word_gita_connection_resolves_or_is_omitted(seeded):
    """Never show a reference we cannot back with a stored verse."""
    for day in [f"2026-09-{d:02d}" for d in range(1, 26)]:
        w = get_word_of_day(day)
        if w["gita_connection"] is not None:
            assert w["gita_connection"]["reference"].startswith("Bhagavad Gita")
            assert w["gita_connection"]["translation"]


def test_all_word_refs_are_valid_references():
    from gita.chapters import validate_reference

    for w in WORDS:
        if w["gita_ref"]:
            assert validate_reference(*w["gita_ref"]).valid, w["id"]


# ── Teaching of the day (Part 11) ────────────────────────────────────────
def test_teaching_is_labelled_inspired_by(seeded):
    """Part 11 — modern principles must never look like Gita quotations."""
    t = get_teaching_of_day("2026-09-04")
    assert t["label"] == "inspired_by"
    assert "not a direct quotation" in t["note"]


def test_teaching_is_deterministic_and_rotates(seeded):
    assert get_teaching_of_day("2026-09-04")["id"] == get_teaching_of_day("2026-09-04")["id"]
    assert len({get_teaching_of_day(f"2026-09-{d:02d}")["id"] for d in range(4, 12)}) > 1


def test_teaching_refs_are_valid():
    from gita.chapters import validate_reference

    for t in TEACHINGS:
        if t.get("gita_ref"):
            assert validate_reference(*t["gita_ref"]).valid, t["id"]


def test_spec_example_teachings_exist():
    """Every life principle Part 11 lists as an example must be covered."""
    texts = " ".join(t["text"].lower() for t in TEACHINGS)
    for label, phrase in [
        ("focus on effort",            "focus on the effort"),
        ("failure doesn't define you", "a temporary failure is information"),
        ("control your mind",          "control your mind"),
        ("do your duty sincerely",     "do it sincerely"),
        ("don't compare paths",        "your path against someone else"),
        ("discipline creates freedom", "discipline is not a cage"),
        ("courage despite fear",       "courage is acting while the fear"),
    ]:
        assert phrase in texts, f"Part 11 principle not covered: {label}"


# ── Bundle ───────────────────────────────────────────────────────────────
def test_bundle_returns_all_three(seeded):
    b = get_daily_bundle("2026-09-04")
    assert b["verse"]["available"] and b["word"]["word"] and b["teaching"]["text"]
    assert b["corpus_size"] > 0


def test_empty_corpus_reports_unavailable_rather_than_inventing(isolated_profile):
    """Empty-state behaviour (Part 61) — no verse means say so."""
    v = get_daily_verse("2026-09-04")
    assert v["available"] is False
    assert v["message"]
