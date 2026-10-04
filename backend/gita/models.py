"""
Gita data shapes (Part 5).

Scripture, translation, commentary and modern interpretation are four
different things and are modelled as four different things. Nothing here
lets them be flattened into one blob.
"""
from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, Field

SourceType = Literal["canonical_sanskrit", "translation", "commentary", "curated_seed"]


class Source(BaseModel):
    id: str
    name: str
    source_type: str
    source_url: Optional[str] = None
    edition: Optional[str] = None
    language: Optional[str] = None
    retrieved_at: Optional[str] = None
    notes: Optional[str] = None


class Translation(BaseModel):
    text: str
    language: str = "en"
    source: str
    source_name: Optional[str] = None
    verified: bool = False


class Commentary(BaseModel):
    text: str
    author: str
    language: str = "en"
    source: str
    source_name: Optional[str] = None
    verified: bool = False


class Application(BaseModel):
    """Practical advice inspired by a verse. Never presented as scripture."""

    text: str
    label: str = "interpretation"


class Verse(BaseModel):
    id: str
    chapter: int
    verse: int
    verse_end: Optional[int] = None
    chapter_name: Optional[str] = None
    sanskrit: Optional[str] = None
    transliteration: Optional[str] = None
    translations: list[Translation] = Field(default_factory=list)
    commentaries: list[Commentary] = Field(default_factory=list)
    practical_application: list[Application] = Field(default_factory=list)
    themes: list[str] = Field(default_factory=list)
    keywords: list[str] = Field(default_factory=list)
    source: Optional[str] = None
    source_type: Optional[str] = None
    language: str = "sa"
    verified: bool = False

    @property
    def reference(self) -> str:
        if self.verse_end:
            return f"Bhagavad Gita {self.chapter}.{self.verse}-{self.verse_end}"
        return f"Bhagavad Gita {self.chapter}.{self.verse}"

    def primary_translation(self, language: str = "en") -> Optional[Translation]:
        for t in self.translations:
            if t.language == language:
                return t
        return self.translations[0] if self.translations else None

    @property
    def has_multiple_interpretations(self) -> bool:
        """True when the sources genuinely disagree enough to say so (Part 6)."""
        langs = [t.language for t in self.translations]
        distinct_en = sum(1 for l in langs if l == "en")
        return distinct_en > 1 or len(self.commentaries) > 1


class SearchResult(BaseModel):
    chapter: int
    verse: int
    reference: str
    sanskrit: Optional[str] = None
    transliteration: Optional[str] = None
    translation: Optional[str] = None
    theme: Optional[str] = None
    themes: list[str] = Field(default_factory=list)
    source: Optional[str] = None
    source_name: Optional[str] = None
    verified: bool = False
    score: float = 0.0


class SearchResponse(BaseModel):
    query: str
    results: list[SearchResult] = Field(default_factory=list)
    total: int = 0
    invalid_reference: bool = False
    message: Optional[str] = None


class VerseLookup(BaseModel):
    """Result of an exact chapter/verse lookup — may be an honest failure."""

    found: bool
    verse: Optional[Verse] = None
    invalid_reference: bool = False
    edition_variant: bool = False
    message: Optional[str] = None

    def to_dict(self) -> dict[str, Any]:
        return self.model_dump(exclude_none=True)
