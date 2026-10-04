"""
Gita engine tests (Part 57).

Covers the exact cases the spec lists, plus the deliberately-wrong requests:
the engine must report an invalid reference rather than invent a verse.
"""
from __future__ import annotations

import pytest

from gita import get_verse, list_chapters, search, verse_count_available
from gita.chapters import CHAPTERS, TOTAL_VERSES, parse_reference, validate_reference


# ── Canonical structure ──────────────────────────────────────────────────
def test_chapter_map_sums_to_700():
    assert sum(c.verse_count for c in CHAPTERS.values()) == TOTAL_VERSES == 700
    assert len(CHAPTERS) == 18


@pytest.mark.parametrize("chapter,verse", [(2, 47), (1, 1), (18, 78), (12, 20)])
def test_valid_references_accepted(chapter, verse):
    assert validate_reference(chapter, verse).valid


@pytest.mark.parametrize("chapter,verse", [(20, 10), (0, 1), (19, 1), (2, 73), (2, 500), (12, 21)])
def test_invalid_references_rejected(chapter, verse):
    check = validate_reference(chapter, verse)
    assert not check.valid
    assert check.reason


def test_edition_variant_reported_distinctly():
    """13.35 exists in some editions — say so rather than 'invalid'."""
    check = validate_reference(13, 35)
    assert not check.valid
    assert check.edition_variant
    assert "edition" in check.reason.lower()


@pytest.mark.parametrize("text,expected", [
    ("What does Gita 2.47 say?", (2, 47)),
    ("show me chapter 2 verse 47", (2, 47)),
    ("explain BG 18:66", (18, 66)),
    ("karma yoga", None),
])
def test_reference_parsing(text, expected):
    assert parse_reference(text) == expected


# ── The spec's test cases ────────────────────────────────────────────────
def test_what_does_gita_2_47_say(seeded):
    res = search("What does Gita 2.47 say?")
    assert res.results
    top = res.results[0]
    assert (top.chapter, top.verse) == (2, 47)
    assert top.reference == "Bhagavad Gita 2.47"
    assert top.sanskrit and top.translation


def test_sanskrit_for_chapter_2_verse_47(seeded):
    lookup = get_verse(2, 47)
    assert lookup.found
    assert "कर्मण्येवाधिकारस्ते" in lookup.verse.sanskrit
    assert lookup.verse.transliteration


@pytest.mark.parametrize("query,expect_chapter", [
    ("explain karma yoga", 3),
    ("What does the Gita say about anger?", 2),
    ("Give me a verse about equanimity", 2),
])
def test_topic_searches_return_relevant_verses(seeded, query, expect_chapter):
    res = search(query, limit=3)
    assert res.results, f"no results for {query!r}"
    assert any(r.chapter == expect_chapter for r in res.results)


@pytest.mark.parametrize("topic", [
    "detachment from results", "fear", "discipline", "anger", "mind control",
    "duty", "karma yoga", "devotion", "meditation", "self knowledge",
    "equanimity", "success and failure", "desire", "attachment", "grief",
])
def test_every_required_topic_is_searchable(seeded, topic):
    """Part 7 lists these searches explicitly — all must return something."""
    res = search(topic, limit=3)
    assert res.results, f"{topic!r} returned no verses"


@pytest.mark.parametrize("phrasing", [
    "I am so angry right now",
    "everyone is ahead of me",
    "I keep putting things off",
    "my mind won't stop wandering",
    "I feel worthless after that failure",
])
def test_natural_phrasing_reaches_the_corpus(seeded, phrasing):
    assert search(phrasing, limit=3).results


# ── Never fabricate (Parts 6, 56, 57) ────────────────────────────────────
def test_gita_20_10_reports_invalid_not_invented(seeded):
    lookup = get_verse(20, 10)
    assert not lookup.found
    assert lookup.invalid_reference
    assert lookup.verse is None
    assert "18 chapters" in lookup.message


def test_invalid_reference_search_does_not_return_results(seeded):
    res = search("What does Gita 20.10 say?")
    assert res.invalid_reference
    assert res.results == []


def test_valid_but_absent_verse_is_honest(seeded):
    """A real reference we don't hold must say so, not reconstruct it."""
    lookup = get_verse(1, 5)
    assert not lookup.found
    assert not lookup.invalid_reference
    assert lookup.verse is None
    assert "not in this knowledge base" in lookup.message


def test_no_results_returns_honest_message(seeded):
    res = search("quantum chromodynamics compiler flags", limit=3)
    assert res.results == []
    assert res.message


# ── Provenance (Part 56) ─────────────────────────────────────────────────
def test_every_verse_has_a_source(seeded):
    for chapter in CHAPTERS:
        for verse in [v.verse for v in _chapter_verses(chapter)]:
            lookup = get_verse(chapter, verse)
            assert lookup.verse.source, f"{chapter}.{verse} has no source"


def _chapter_verses(chapter: int):
    from gita import get_chapter_verses

    return get_chapter_verses(chapter)


def test_seed_verses_are_marked_unverified(seeded):
    """Seed data must never masquerade as authoritative."""
    lookup = get_verse(2, 47)
    assert lookup.verse.verified is False
    assert lookup.verse.source_type == "curated_seed"


def test_seed_has_no_fabricated_commentary(seeded):
    """Commentary is never synthesised — the seed ships none."""
    for chapter in (2, 3, 6, 12, 18):
        for v in _chapter_verses(chapter):
            assert v.commentaries == [], f"{v.id} has unsourced commentary"


def test_applications_are_labelled_interpretation(seeded):
    lookup = get_verse(2, 47)
    assert lookup.verse.practical_application
    for app in lookup.verse.practical_application:
        assert app.label == "interpretation"


def test_scripture_and_translation_stay_separate(seeded):
    lookup = get_verse(2, 47)
    v = lookup.verse
    assert v.sanskrit is not None
    assert v.translations
    tr = v.primary_translation()
    assert tr.source and tr.source != v.source


def test_seed_is_idempotent(seeded):
    from gita import seed_if_empty

    before = verse_count_available()
    seed_if_empty()
    seed_if_empty()
    assert verse_count_available() == before


def test_chapters_listing_reports_availability(seeded):
    chapters = list_chapters()
    assert len(chapters) == 18
    assert all(c["verses_available"] <= c["verse_count"] for c in chapters)
