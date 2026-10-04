"""
Gita importer (Part 56).

Brings verse data in from a real edition and records where every field came
from. This is the only path by which a verse becomes `verified = True`.

Design rules:
  * Provenance is required, not optional. An import with no source name and
    no source url is rejected.
  * Sanskrit is never invented. A record with no sanskrit field leaves the
    existing sanskrit untouched rather than blanking or guessing it.
  * Out-of-range references are rejected against gita.chapters, so a
    malformed dump cannot introduce a chapter 20.
  * Commentary is only ever stored with an explicit author + source.

Expected record shape (all fields optional except chapter/verse):

    {
      "chapter": 2, "verse": 47,
      "sanskrit": "...", "transliteration": "...",
      "translations": [{"text": "...", "language": "en", "author": "..."}],
      "commentaries": [{"text": "...", "author": "...", "language": "en"}],
      "themes": [...], "keywords": [...]
    }

Usage:
    python -m gita.importer --file verses.json \
        --source-name "IIT Kanpur Gita Supersite" \
        --source-url "https://www.gitasupersite.iitk.ac.in/" \
        --edition "Supersite 2024 export"
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

from db import dump_json, get_conn, now_iso
from gita.chapters import validate_reference


@dataclass
class ImportReport:
    source_id: str = ""
    verses_written: int = 0
    translations_written: int = 0
    commentaries_written: int = 0
    rejected: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def as_dict(self) -> dict[str, Any]:
        return {
            "source_id": self.source_id,
            "verses_written": self.verses_written,
            "translations_written": self.translations_written,
            "commentaries_written": self.commentaries_written,
            "rejected_count": len(self.rejected),
            "rejected": self.rejected[:50],
            "warnings": self.warnings[:50],
        }


def _slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", (text or "").lower()).strip("_")[:48] or "source"


def register_source(
    name: str,
    source_type: str = "canonical_sanskrit",
    source_url: Optional[str] = None,
    edition: Optional[str] = None,
    language: Optional[str] = None,
    notes: Optional[str] = None,
    source_id: Optional[str] = None,
) -> str:
    """Create/update a source row. Provenance is mandatory (Part 56)."""
    if not name or not name.strip():
        raise ValueError("A source name is required — imported verses must be traceable.")
    if not source_url and not edition:
        raise ValueError(
            "Provide at least a source_url or an edition so imported verses stay traceable."
        )

    sid = source_id or _slug(name)
    with get_conn() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO gita_sources"
            " (id, name, source_type, source_url, edition, language, retrieved_at, notes)"
            " VALUES (?,?,?,?,?,?,?,?)",
            (sid, name.strip(), source_type, source_url, edition, language, now_iso(), notes),
        )
    return sid


def import_records(
    records: list[dict[str, Any]],
    source_name: str,
    source_url: Optional[str] = None,
    edition: Optional[str] = None,
    verified: bool = True,
    replace_translations: bool = True,
) -> ImportReport:
    """
    Import verse records under one registered source.

    `verified=True` marks the data authoritative — only pass that for a real
    edition. Everything is validated against the canonical chapter map first.
    """
    report = ImportReport()
    source_id = register_source(
        name=source_name, source_type="canonical_sanskrit",
        source_url=source_url, edition=edition, language="sa",
        notes="Imported verse data. Sanskrit treated as canonical for this edition.",
    )
    report.source_id = source_id

    tr_source_id = register_source(
        name=f"{source_name} — translations", source_type="translation",
        source_url=source_url, edition=edition, language="en",
        notes="Translations as published by the imported edition.",
        source_id=f"{_slug(source_name)}_tr",
    )
    cm_source_id = register_source(
        name=f"{source_name} — commentaries", source_type="commentary",
        source_url=source_url, edition=edition, language="en",
        notes="Commentaries as published by the imported edition.",
        source_id=f"{_slug(source_name)}_cm",
    )

    with get_conn() as conn:
        for idx, rec in enumerate(records):
            chapter, verse = rec.get("chapter"), rec.get("verse")
            check = validate_reference(chapter, verse) if isinstance(chapter, int) else None
            if check is None or not check.valid:
                reason = check.reason if check else "missing or non-integer chapter"
                report.rejected.append(f"record[{idx}] {chapter}.{verse}: {reason}")
                continue

            verse_id = f"{chapter}.{verse}"
            existing = conn.execute(
                "SELECT sanskrit, transliteration FROM gita_verses WHERE id = ?", (verse_id,)
            ).fetchone()

            sanskrit = (rec.get("sanskrit") or "").strip() or None
            translit = (rec.get("transliteration") or "").strip() or None
            if sanskrit is None and existing is not None:
                # Never blank out or regenerate Sanskrit we already hold.
                sanskrit = existing["sanskrit"]
                report.warnings.append(f"{verse_id}: no sanskrit in import; kept existing")
            if translit is None and existing is not None:
                translit = existing["transliteration"]

            themes = rec.get("themes") or []
            keywords = rec.get("keywords") or []
            if existing is not None and not themes:
                row = conn.execute(
                    "SELECT themes, keywords FROM gita_verses WHERE id = ?", (verse_id,)
                ).fetchone()
                themes = json.loads(row["themes"] or "[]")
                keywords = keywords or json.loads(row["keywords"] or "[]")

            # Upsert, never INSERT OR REPLACE: REPLACE deletes the row first,
            # and the ON DELETE CASCADE would take this verse's translations,
            # commentaries and practical applications with it.
            conn.execute(
                "INSERT INTO gita_verses"
                " (id, chapter, verse, verse_end, sanskrit, transliteration, themes,"
                "  keywords, sanskrit_source, verified, created_at, updated_at)"
                " VALUES (?,?,?,?,?,?,?,?,?,?,?,?)"
                " ON CONFLICT(id) DO UPDATE SET"
                "   verse_end = excluded.verse_end,"
                "   sanskrit = excluded.sanskrit,"
                "   transliteration = excluded.transliteration,"
                "   themes = excluded.themes,"
                "   keywords = excluded.keywords,"
                "   sanskrit_source = excluded.sanskrit_source,"
                "   verified = excluded.verified,"
                "   updated_at = excluded.updated_at",
                (
                    verse_id, chapter, verse, rec.get("verse_end"), sanskrit, translit,
                    dump_json(themes), dump_json(keywords), source_id,
                    1 if (verified and sanskrit) else 0, now_iso(), now_iso(),
                ),
            )
            report.verses_written += 1

            if replace_translations:
                conn.execute(
                    "DELETE FROM gita_translations WHERE verse_id = ? AND source = ?",
                    (verse_id, tr_source_id),
                )
            for j, tr in enumerate(rec.get("translations") or []):
                text = (tr.get("text") or "").strip()
                if not text:
                    continue
                lang = tr.get("language") or "en"
                conn.execute(
                    "INSERT OR REPLACE INTO gita_translations"
                    " (id, verse_id, text, language, source, verified) VALUES (?,?,?,?,?,?)",
                    (f"{verse_id}:{tr_source_id}:{lang}:{j}", verse_id, text, lang,
                     tr_source_id, 1 if verified else 0),
                )
                report.translations_written += 1

            for j, cm in enumerate(rec.get("commentaries") or []):
                text = (cm.get("text") or "").strip()
                author = (cm.get("author") or "").strip()
                if not text or not author:
                    # Unattributed commentary is exactly what Part 6 forbids.
                    report.warnings.append(f"{verse_id}: commentary[{j}] skipped (no author)")
                    continue
                lang = cm.get("language") or "en"
                conn.execute(
                    "INSERT OR REPLACE INTO gita_commentaries"
                    " (id, verse_id, text, author, language, source, verified)"
                    " VALUES (?,?,?,?,?,?,?)",
                    (f"{verse_id}:{cm_source_id}:{_slug(author)}:{j}", verse_id, text,
                     author, lang, cm_source_id, 1 if verified else 0),
                )
                report.commentaries_written += 1

    return report


def import_file(path: str | Path, **kwargs: Any) -> ImportReport:
    """Import from a JSON file: either a list of records or {"verses": [...]}"""
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    records = data.get("verses") if isinstance(data, dict) else data
    if not isinstance(records, list):
        raise ValueError("Expected a JSON list of verse records, or {\"verses\": [...]}.")
    return import_records(records, **kwargs)


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Import Bhagavad Gita verse data.")
    parser.add_argument("--file", required=True, help="Path to a JSON export")
    parser.add_argument("--source-name", required=True, help="Human-readable edition/source name")
    parser.add_argument("--source-url", default=None)
    parser.add_argument("--edition", default=None)
    parser.add_argument(
        "--unverified", action="store_true",
        help="Import without marking the data authoritative",
    )
    args = parser.parse_args(argv)

    from db import init_db

    init_db()
    report = import_file(
        args.file, source_name=args.source_name, source_url=args.source_url,
        edition=args.edition, verified=not args.unverified,
    )
    print(json.dumps(report.as_dict(), indent=2, ensure_ascii=False))
    return 0 if not report.rejected else 1


if __name__ == "__main__":
    sys.exit(main())
