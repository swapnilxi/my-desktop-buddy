"""
Gita verse store and search engine (Parts 5, 6, 7, 56).

Rules this module enforces so callers cannot break them:
  * A verse only exists if it is in the database. Nothing is generated.
  * An out-of-range reference returns an invalid-reference result, never a
    guess (Part 57).
  * Sanskrit, translation, commentary and practical application come back in
    separate fields, each with its own source id and `verified` flag.
"""
from __future__ import annotations

import re
from typing import Any, Optional

from db import dump_json, get_conn, load_json, now_iso
from gita.chapters import CHAPTERS, get_chapter, validate_reference
from gita.models import (
    Application,
    Commentary,
    SearchResponse,
    SearchResult,
    Source,
    Translation,
    Verse,
    VerseLookup,
)

# Query words mapped onto the vocabulary actually used in the corpus, so a
# natural phrasing ("I keep putting things off") reaches the right verses.
QUERY_SYNONYMS: dict[str, list[str]] = {
    "detachment from results": ["detachment", "results", "fruits", "outcome"],
    "letting go": ["detachment", "letting go", "surrender"],
    "outcome": ["results", "fruits", "outcome"],
    "expectations": ["results", "expectations", "outcome"],
    "procrastination": ["procrastination", "action", "start", "stuck", "inaction"],
    "putting things off": ["procrastination", "action", "start", "inaction"],
    "lazy": ["procrastination", "action", "discipline", "motivation"],
    "focus": ["focus", "concentration", "distraction", "meditation"],
    "distracted": ["distraction", "focus", "restless", "mind"],
    "restless mind": ["restless", "mind", "distraction", "practice"],
    "mind control": ["mind", "restless", "discipline", "senses", "discernment"],
    "anxiety": ["anxiety", "fear", "agitation", "worry"],
    "worry": ["anxiety", "fear", "results", "outcome"],
    "stress": ["stress", "patience", "pain", "equanimity"],
    "burnout": ["burnout", "rest", "sleep", "balance", "routine"],
    "failure": ["failure", "success", "equanimity", "self-worth"],
    "comparison": ["comparison", "own path", "duty", "envy", "jealousy"],
    "ahead of me": ["comparison", "envy", "own path"],
    "everyone else": ["comparison", "envy", "own path"],
    "better than me": ["comparison", "envy", "self-worth"],
    "left behind": ["comparison", "own path", "self-worth"],
    "not good enough": ["self-worth", "comparison", "self-talk"],
    "give up": ["motivation", "discipline", "failure", "self-talk"],
    "no motivation": ["motivation", "procrastination", "discipline"],
    "cant start": ["procrastination", "action", "start", "stuck"],
    "what should i do": ["duty", "dharma", "discernment", "own path"],
    "jealousy": ["envy", "jealousy", "comparison"],
    "self doubt": ["self-worth", "self-talk", "motivation", "discipline"],
    "confidence": ["courage", "self-worth", "motivation"],
    "courage": ["courage", "fear", "discipline"],
    "grief": ["grief", "sorrow", "loss", "mourning", "death"],
    "sadness": ["sorrow", "grief", "pain"],
    "anger": ["anger", "rage", "reacting", "confusion"],
    "desire": ["desire", "craving", "attachment"],
    "attachment": ["attachment", "detachment", "craving", "possessiveness"],
    "duty": ["duty", "dharma", "work", "svadharma"],
    "karma yoga": ["karma yoga", "duty", "action", "detachment"],
    "devotion": ["devotion", "bhakti", "surrender", "trust"],
    "bhakti": ["devotion", "bhakti", "offering"],
    "meditation": ["meditation", "focus", "concentration", "practice"],
    "self knowledge": ["self", "soul", "atman", "identity", "discernment"],
    "equanimity": ["equanimity", "samatva", "balance", "even-minded", "steady"],
    "samatva": ["samatva", "equanimity", "balance"],
    "success and failure": ["success", "failure", "equanimity", "samatva"],
    "discipline": ["discipline", "habits", "consistency", "practice", "routine"],
    "habit": ["habits", "practice", "consistency", "routine"],
    "sleep": ["sleep", "rest", "routine", "balance"],
    "forgiveness": ["forgiveness", "kshama", "compassion"],
    "compassion": ["compassion", "karuna", "kindness"],
    "peace": ["peace", "calm", "contentment", "settled"],
    "purpose": ["duty", "dharma", "own path", "nature"],
    "career": ["career", "duty", "own path", "nature"],
    "decision": ["discernment", "judgement", "duty"],
}

_WORD_RE = re.compile(r"[a-z0-9']+")

# Irregular forms that suffix-stripping alone will not connect to the
# vocabulary used in the corpus ("angry" must reach the "anger" keyword).
_WORD_ALIASES: dict[str, str] = {
    "angry": "anger", "mad": "anger", "furious": "anger", "rage": "anger",
    "irritated": "anger", "annoyed": "anger",
    "afraid": "fear", "scared": "fear", "fearful": "fear", "terrified": "fear",
    "frightened": "fear", "nervous": "anxiety",
    "anxious": "anxiety", "worried": "anxiety", "worrying": "anxiety",
    "worry": "anxiety", "panicking": "anxiety", "panic": "anxiety",
    "sad": "sorrow", "unhappy": "sorrow", "miserable": "sorrow",
    "grieving": "grief", "mourning": "grief",
    "lazy": "procrastination", "procrastinate": "procrastination",
    "procrastinating": "procrastination", "procrastinated": "procrastination",
    "delaying": "procrastination", "postponing": "procrastination",
    "failing": "failure", "failed": "failure", "fails": "failure",
    "flunked": "failure",
    "comparing": "comparison", "compare": "comparison", "compared": "comparison",
    "everyone": "comparison", "others": "comparison", "ahead": "comparison",
    "jealous": "envy", "envious": "envy",
    "wandering": "distraction", "wander": "distraction", "wanders": "distraction",
    "distracted": "distraction", "unfocused": "distraction", "scattered": "distraction",
    "meditate": "meditation", "meditating": "meditation", "meditated": "meditation",
    "stressed": "stress", "overwhelmed": "stress", "pressure": "stress",
    "exhausted": "burnout", "drained": "burnout", "tired": "rest",
    "sleepy": "sleep", "insomnia": "sleep",
    "calm": "peace", "peaceful": "peace", "serene": "peace",
    "worthless": "self-worth", "useless": "self-worth", "inadequate": "self-worth",
    "confident": "courage", "brave": "courage", "courageous": "courage",
    "crave": "craving", "wanting": "desire",
    "forgive": "forgiveness", "forgiving": "forgiveness",
    "consistent": "consistency", "consistently": "consistency",
    "purposeless": "purpose", "meaningless": "purpose",
}

_SUFFIXES = ("ings", "ing", "edly", "ed", "ies", "iness", "ness", "ment", "ly")


def _stem(word: str) -> str:
    """
    Tiny stemmer, applied identically to queries and corpus text so both
    sides collapse to the same key. Deliberately crude: over-stemming is
    harmless here because it is symmetric.
    """
    w = _WORD_ALIASES.get(word, word)
    for suf in _SUFFIXES:
        if w.endswith(suf) and len(w) - len(suf) >= 3:
            w = w[: -len(suf)]
            if suf == "ies":
                w += "y"
            break
    if len(w) > 3 and w.endswith("s") and not w.endswith("ss"):
        w = w[:-1]
    if len(w) > 4 and w.endswith("e"):
        w = w[:-1]
    return _WORD_ALIASES.get(w, w)
_STOPWORDS = {
    "a", "about", "am", "an", "and", "any", "are", "as", "at", "be", "been", "but",
    "by", "can", "do", "does", "for", "from", "get", "give", "has", "have", "how",
    "i", "if", "in", "is", "it", "its", "keep", "me", "my", "of", "on", "or", "say",
    "says", "should", "some", "something", "that", "the", "their", "there", "this",
    "to", "verse", "verses", "was", "what", "when", "which", "who", "why", "with",
    "gita", "bhagavad", "bg", "chapter", "shloka", "sloka", "tell", "show", "explain",
    "about", "does", "krishna", "please", "want", "need", "help",
}


# ── Seeding ──────────────────────────────────────────────────────────────
def seed_if_empty(force: bool = False) -> dict[str, int]:
    """
    Load the curated seed corpus if the verse table is empty.

    Idempotent. Never overwrites verses that came from a real source (an
    imported verse has verified=1 and is left alone unless force=True).
    """
    from gita.seed_data import (
        SANSKRIT_SOURCE_ID,
        SEED_SOURCES,
        SEED_VERSES,
        TRANSLATION_SOURCE_ID,
    )

    with get_conn() as conn:
        existing = conn.execute("SELECT COUNT(*) AS n FROM gita_verses").fetchone()["n"]
        if existing and not force:
            return {"verses": existing, "inserted": 0, "skipped": existing}

        for src in SEED_SOURCES:
            conn.execute(
                "INSERT OR REPLACE INTO gita_sources"
                " (id, name, source_type, source_url, edition, language, retrieved_at, notes)"
                " VALUES (?,?,?,?,?,?,?,?)",
                (
                    src["id"], src["name"], src["source_type"], src.get("source_url"),
                    src.get("edition"), src.get("language"), now_iso(), src.get("notes"),
                ),
            )

        inserted = 0
        for v in SEED_VERSES:
            verse_id = f"{v['chapter']}.{v['verse']}"
            check = validate_reference(v["chapter"], v["verse"])
            if not check.valid:
                # A bad seed row is a bug in our data, not something to store.
                continue

            row = conn.execute(
                "SELECT verified FROM gita_verses WHERE id = ?", (verse_id,)
            ).fetchone()
            if row and row["verified"] and not force:
                continue

            # Upsert rather than INSERT OR REPLACE — REPLACE would cascade-delete
            # this verse's translations, commentaries and applications.
            conn.execute(
                "INSERT INTO gita_verses"
                " (id, chapter, verse, verse_end, sanskrit, transliteration, themes,"
                "  keywords, sanskrit_source, verified, created_at, updated_at)"
                " VALUES (?,?,?,?,?,?,?,?,?,?,?,?)"
                " ON CONFLICT(id) DO UPDATE SET"
                "   sanskrit = excluded.sanskrit,"
                "   transliteration = excluded.transliteration,"
                "   themes = excluded.themes,"
                "   keywords = excluded.keywords,"
                "   sanskrit_source = excluded.sanskrit_source,"
                "   updated_at = excluded.updated_at",
                (
                    verse_id, v["chapter"], v["verse"], v.get("verse_end"),
                    v.get("sanskrit"), v.get("transliteration"),
                    dump_json(v.get("themes", [])), dump_json(v.get("keywords", [])),
                    SANSKRIT_SOURCE_ID, 0, now_iso(), now_iso(),
                ),
            )
            conn.execute("DELETE FROM gita_translations WHERE verse_id = ? AND source = ?",
                         (verse_id, TRANSLATION_SOURCE_ID))
            if v.get("translation"):
                conn.execute(
                    "INSERT INTO gita_translations (id, verse_id, text, language, source, verified)"
                    " VALUES (?,?,?,?,?,?)",
                    (f"{verse_id}:{TRANSLATION_SOURCE_ID}:en", verse_id,
                     v["translation"], "en", TRANSLATION_SOURCE_ID, 0),
                )
            conn.execute(
                "DELETE FROM gita_applications WHERE verse_id = ? AND id LIKE ?",
                (verse_id, f"{verse_id}:app:%"),
            )
            for i, app in enumerate(v.get("applications", [])):
                conn.execute(
                    "INSERT INTO gita_applications (id, verse_id, text, label) VALUES (?,?,?,?)",
                    (f"{verse_id}:app:{i}", verse_id, app, "interpretation"),
                )
            inserted += 1

        total = conn.execute("SELECT COUNT(*) AS n FROM gita_verses").fetchone()["n"]
    return {"verses": total, "inserted": inserted, "skipped": 0}


# ── Reads ────────────────────────────────────────────────────────────────
def _source_names(conn) -> dict[str, str]:
    rows = conn.execute("SELECT id, name FROM gita_sources").fetchall()
    return {r["id"]: r["name"] for r in rows}


def _hydrate(conn, row, names: Optional[dict[str, str]] = None) -> Verse:
    names = names if names is not None else _source_names(conn)
    verse_id = row["id"]

    translations = [
        Translation(
            text=t["text"], language=t["language"], source=t["source"],
            source_name=names.get(t["source"]), verified=bool(t["verified"]),
        )
        for t in conn.execute(
            "SELECT * FROM gita_translations WHERE verse_id = ? ORDER BY verified DESC, id",
            (verse_id,),
        ).fetchall()
    ]
    commentaries = [
        Commentary(
            text=c["text"], author=c["author"], language=c["language"],
            source=c["source"], source_name=names.get(c["source"]),
            verified=bool(c["verified"]),
        )
        for c in conn.execute(
            "SELECT * FROM gita_commentaries WHERE verse_id = ? ORDER BY verified DESC, author",
            (verse_id,),
        ).fetchall()
    ]
    applications = [
        Application(text=a["text"], label=a["label"])
        for a in conn.execute(
            "SELECT * FROM gita_applications WHERE verse_id = ? ORDER BY id", (verse_id,)
        ).fetchall()
    ]

    ch = get_chapter(row["chapter"])
    return Verse(
        id=verse_id,
        chapter=row["chapter"],
        verse=row["verse"],
        verse_end=row["verse_end"],
        chapter_name=ch.name_iast if ch else None,
        sanskrit=row["sanskrit"],
        transliteration=row["transliteration"],
        translations=translations,
        commentaries=commentaries,
        practical_application=applications,
        themes=load_json(row["themes"]),
        keywords=load_json(row["keywords"]),
        source=row["sanskrit_source"],
        source_type="curated_seed" if not row["verified"] else "canonical_sanskrit",
        verified=bool(row["verified"]),
    )


def get_verse(chapter: int, verse: int) -> VerseLookup:
    """
    Exact lookup. Distinguishes three honest outcomes:
      invalid reference / valid reference we simply do not have / found.
    """
    check = validate_reference(chapter, verse)
    if not check.valid:
        return VerseLookup(
            found=False, invalid_reference=True,
            edition_variant=check.edition_variant, message=check.reason,
        )

    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM gita_verses WHERE chapter = ? AND verse = ?", (chapter, verse)
        ).fetchone()
        if row is None:
            ch = get_chapter(chapter)
            return VerseLookup(
                found=False,
                message=(
                    f"Bhagavad Gita {chapter}.{verse} is a valid reference"
                    f"{f' in chapter {chapter} ({ch.name_iast})' if ch else ''}, but it is "
                    "not in this knowledge base yet. I won't reconstruct the verse from "
                    "memory — I'd rather give you the principle than risk misquoting it."
                ),
            )
        return VerseLookup(found=True, verse=_hydrate(conn, row))


def get_chapter_verses(chapter: int) -> list[Verse]:
    if not validate_reference(chapter).valid:
        return []
    with get_conn() as conn:
        names = _source_names(conn)
        rows = conn.execute(
            "SELECT * FROM gita_verses WHERE chapter = ? ORDER BY verse", (chapter,)
        ).fetchall()
        return [_hydrate(conn, r, names) for r in rows]


def list_chapters() -> list[dict[str, Any]]:
    with get_conn() as conn:
        counts = {
            r["chapter"]: r["n"]
            for r in conn.execute(
                "SELECT chapter, COUNT(*) AS n FROM gita_verses GROUP BY chapter"
            ).fetchall()
        }
    return [
        {
            "chapter": c.number,
            "name_iast": c.name_iast,
            "name_en": c.name_en,
            "verse_count": c.verse_count,
            "verses_available": counts.get(c.number, 0),
        }
        for c in CHAPTERS.values()
    ]


def list_themes() -> list[dict[str, Any]]:
    tally: dict[str, int] = {}
    with get_conn() as conn:
        for r in conn.execute("SELECT themes FROM gita_verses").fetchall():
            for t in load_json(r["themes"]):
                tally[t] = tally.get(t, 0) + 1
    return [{"theme": k, "count": v} for k, v in sorted(tally.items(), key=lambda kv: (-kv[1], kv[0]))]


def get_sources() -> list[Source]:
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM gita_sources ORDER BY id").fetchall()
    return [Source(**dict(r)) for r in rows]


def verse_count_available() -> int:
    with get_conn() as conn:
        return conn.execute("SELECT COUNT(*) AS n FROM gita_verses").fetchone()["n"]


# ── Search ───────────────────────────────────────────────────────────────
def _tokenize(text: str) -> list[str]:
    """Lowercase -> drop stopwords/short words -> stem."""
    return [
        _stem(w)
        for w in _WORD_RE.findall((text or "").lower())
        if w not in _STOPWORDS and len(w) > 2
    ]


def _raw_words(text: str) -> list[str]:
    return _WORD_RE.findall((text or "").lower())


def _expand(query: str) -> set[str]:
    """Query tokens plus synonym expansions, for recall on natural phrasing."""
    lowered = " ".join(_raw_words(query))
    terms = set(_tokenize(query))
    for phrase, expansions in QUERY_SYNONYMS.items():
        if phrase in lowered:
            terms.update(_tokenize(" ".join(expansions)))
            terms.update(w for w in phrase.split() if len(w) > 2)
    return terms


def _score(verse: Verse, terms: set[str], theme_filter: Optional[str]) -> float:
    if not terms:
        return 1.0 if not theme_filter else 0.0

    score = 0.0
    themes = {_stem(t.lower()) for t in verse.themes}
    keywords = {_stem(k.lower()) for k in verse.keywords}
    theme_words = set(_tokenize(" ".join(verse.themes)))
    keyword_words = set(_tokenize(" ".join(verse.keywords)))

    for term in terms:
        if term in themes:
            score += 6.0
        elif term in theme_words:
            score += 4.0
        if term in keywords:
            score += 5.0
        elif term in keyword_words:
            score += 3.0

    tr = verse.primary_translation()
    if tr:
        body = set(_tokenize(tr.text))
        score += 1.5 * len(terms & body)
    for app in verse.practical_application:
        score += 0.75 * len(terms & set(_tokenize(app.text)))

    return score


def search(
    query: str = "",
    chapter: Optional[int] = None,
    verse: Optional[int] = None,
    language: str = "en",
    theme: Optional[str] = None,
    limit: int = 5,
) -> SearchResponse:
    """
    searchGita (Part 7).

    An explicit chapter+verse short-circuits to exact lookup, including the
    invalid-reference path. Otherwise ranks the corpus by theme, keyword and
    translation-text overlap.
    """
    query = (query or "").strip()

    # Explicit reference in the arguments
    if chapter is not None and verse is not None:
        lookup = get_verse(chapter, verse)
        if lookup.invalid_reference:
            return SearchResponse(query=query or f"{chapter}.{verse}", invalid_reference=True,
                                  message=lookup.message)
        if not lookup.found:
            return SearchResponse(query=query or f"{chapter}.{verse}", message=lookup.message)
        return SearchResponse(
            query=query or f"{chapter}.{verse}", total=1,
            results=[_as_result(lookup.verse, language, score=100.0)],
        )

    # Reference embedded in the query text
    if query:
        from gita.chapters import parse_reference

        ref = parse_reference(query)
        if ref and ref[1] is not None:
            return search(query=query, chapter=ref[0], verse=ref[1], language=language, limit=limit)
        if ref and ref[1] is None and chapter is None:
            chapter = ref[0]
            if not validate_reference(chapter).valid:
                check = validate_reference(chapter)
                return SearchResponse(query=query, invalid_reference=True, message=check.reason)

    terms = _expand(query)
    theme_key = theme.lower().strip() if theme else None

    with get_conn() as conn:
        names = _source_names(conn)
        sql = "SELECT * FROM gita_verses"
        params: list[Any] = []
        if chapter is not None:
            sql += " WHERE chapter = ?"
            params.append(chapter)
        rows = conn.execute(sql, params).fetchall()
        verses = [_hydrate(conn, r, names) for r in rows]

    scored: list[tuple[float, Verse]] = []
    for v in verses:
        if theme_key and theme_key not in {t.lower() for t in v.themes}:
            if theme_key not in " ".join(v.themes).lower():
                continue
        s = _score(v, terms, theme_key)
        if theme_key:
            s += 5.0
        if s > 0:
            scored.append((s, v))

    scored.sort(key=lambda sv: (-sv[0], sv[1].chapter, sv[1].verse))
    top = scored[:limit]

    if not top:
        return SearchResponse(
            query=query, total=0,
            message=(
                "I couldn't find a verse in the knowledge base that clearly matches that. "
                "I'd rather tell you that than offer a verse that only half fits."
            ),
        )

    return SearchResponse(
        query=query, total=len(scored),
        results=[_as_result(v, language, score=round(s, 2)) for s, v in top],
    )


def _as_result(verse: Verse, language: str, score: float) -> SearchResult:
    tr = verse.primary_translation(language) or verse.primary_translation("en")
    return SearchResult(
        chapter=verse.chapter,
        verse=verse.verse,
        reference=verse.reference,
        sanskrit=verse.sanskrit,
        transliteration=verse.transliteration,
        translation=tr.text if tr else None,
        theme=verse.themes[0] if verse.themes else None,
        themes=verse.themes,
        source=verse.source,
        source_name=tr.source_name if tr else None,
        verified=verse.verified,
        score=score,
    )
