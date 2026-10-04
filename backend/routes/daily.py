"""Daily Gita, Word of the Day, Today's Teaching (Parts 9, 10, 11)."""
from __future__ import annotations

import re
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Query

from gita.daily import (
    get_daily_bundle,
    get_daily_verse,
    get_teaching_of_day,
    get_word_of_day,
)

router = APIRouter(prefix="/daily", tags=["daily"])

_DAY_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _validate_day(day: Optional[str]) -> Optional[str]:
    if day is None:
        return None
    if not _DAY_RE.match(day):
        raise HTTPException(status_code=400,
                            detail="day must be in YYYY-MM-DD format")
    from datetime import datetime

    try:
        datetime.strptime(day, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail=f"{day} is not a real date")
    return day


@router.get("")
async def daily(day: Optional[str] = Query(None)) -> dict[str, Any]:
    """Everything the daily screen needs in one request."""
    return get_daily_bundle(_validate_day(day))


@router.get("/verse")
async def daily_verse(day: Optional[str] = Query(None)) -> dict[str, Any]:
    return get_daily_verse(_validate_day(day))


@router.get("/word")
async def word_of_day(day: Optional[str] = Query(None)) -> dict[str, Any]:
    return get_word_of_day(_validate_day(day))


@router.get("/teaching")
async def teaching_of_day(day: Optional[str] = Query(None)) -> dict[str, Any]:
    return get_teaching_of_day(_validate_day(day))
