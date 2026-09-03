"""
Gita routes — verse retrieval with sources (Parts 7, 34, 49, 56, 61).

Every response carries provenance. Invalid references return HTTP 404 with
an explanatory message rather than an empty success, so the UI has a real
error state to render (Part 61).
"""
from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from gita import (
    get_chapter_verses,
    get_sources,
    get_verse,
    list_chapters,
    list_themes,
    search,
    verse_count_available,
)
from gita.chapters import TOTAL_CHAPTERS, TOTAL_VERSES, validate_reference

router = APIRouter(prefix="/gita", tags=["gita"])


class SearchRequest(BaseModel):
    query: str = ""
    chapter: Optional[int] = None
    verse: Optional[int] = None
    language: str = "en"
    theme: Optional[str] = None
    limit: int = Field(default=5, ge=1, le=20)


@router.post("/search")
async def search_gita(req: SearchRequest) -> dict[str, Any]:
    """searchGita (Part 7). Invalid references are reported, never guessed."""
    res = search(query=req.query, chapter=req.chapter, verse=req.verse,
                 language=req.language, theme=req.theme, limit=req.limit)
    payload = res.model_dump()
    if res.invalid_reference:
        raise HTTPException(status_code=404, detail={
            "error": "invalid_reference", "message": res.message, **payload,
        })
    return payload


@router.get("/search")
async def search_gita_get(
    q: str = Query("", description="Search text"),
    chapter: Optional[int] = None,
    verse: Optional[int] = None,
    theme: Optional[str] = None,
    language: str = "en",
    limit: int = Query(5, ge=1, le=20),
) -> dict[str, Any]:
    return await search_gita(SearchRequest(
        query=q, chapter=chapter, verse=verse, theme=theme, language=language, limit=limit,
    ))


@router.get("/verse/{chapter}/{verse}")
async def read_verse(chapter: int, verse: int) -> dict[str, Any]:
    """getGitaVerse — exact lookup with three distinct outcomes."""
    lookup = get_verse(chapter, verse)
    if lookup.invalid_reference:
        raise HTTPException(status_code=404, detail={
            "error": "invalid_reference", "message": lookup.message,
            "edition_variant": lookup.edition_variant,
        })
    if not lookup.found:
        raise HTTPException(status_code=404, detail={
            "error": "not_in_knowledge_base", "message": lookup.message,
        })
    return lookup.verse.model_dump()


@router.get("/chapters")
async def chapters() -> dict[str, Any]:
    return {
        "total_chapters": TOTAL_CHAPTERS,
        "total_verses": TOTAL_VERSES,
        "verses_available": verse_count_available(),
        "chapters": list_chapters(),
    }


@router.get("/chapter/{chapter}")
async def chapter_detail(chapter: int) -> dict[str, Any]:
    check = validate_reference(chapter)
    if not check.valid:
        raise HTTPException(status_code=404, detail={
            "error": "invalid_reference", "message": check.reason,
        })
    verses = get_chapter_verses(chapter)
    meta = next((c for c in list_chapters() if c["chapter"] == chapter), None)
    return {"chapter": chapter, "meta": meta,
            "verses": [v.model_dump() for v in verses], "count": len(verses)}


@router.get("/themes")
async def themes() -> dict[str, Any]:
    return {"themes": list_themes()}


@router.get("/sources")
async def sources() -> dict[str, Any]:
    """
    Provenance for everything in the knowledge base (Part 56).

    `unverified_verses` tells the client how much of the corpus still needs
    checking against a primary edition.
    """
    from db import get_conn

    with get_conn() as conn:
        unverified = conn.execute(
            "SELECT COUNT(*) AS n FROM gita_verses WHERE verified = 0"
        ).fetchone()["n"]

    return {
        "sources": [s.model_dump() for s in get_sources()],
        "verses_available": verse_count_available(),
        "unverified_verses": unverified,
        "note": (
            "Verses marked unverified come from the app's curated seed data. Use the "
            "importer (python -m gita.importer) to replace them with an authoritative "
            "edition such as the IIT Kanpur Gita Supersite."
        ),
    }
