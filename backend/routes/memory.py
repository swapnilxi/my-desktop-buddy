"""
Memory routes (Parts 27, 28, 68).

Every endpoint takes the user id from the X-User-Id header and scopes to it.
There is no route that can read across users.
"""
from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

import memory as M
from db import DEFAULT_USER_ID

router = APIRouter(prefix="/memory", tags=["memory"])


def _user(x_user_id: Optional[str]) -> str:
    return (x_user_id or DEFAULT_USER_ID).strip() or DEFAULT_USER_ID


class SaveRequest(BaseModel):
    category: str
    key: str
    value: str
    source: str = "user"
    user_confirmed: bool = False
    allow_sensitive: bool = False


class UpdateRequest(BaseModel):
    key: Optional[str] = None
    value: Optional[str] = None
    category: Optional[str] = None


class PauseRequest(BaseModel):
    paused: bool


class ProposeRequest(BaseModel):
    category: str
    key: str
    value: str


@router.get("")
async def list_all(
    category: Optional[str] = None,
    include_sensitive: bool = True,
    x_user_id: Optional[str] = Header(None),
) -> dict[str, Any]:
    user = _user(x_user_id)
    try:
        items = M.list_memories(user, category=category, include_sensitive=include_sensitive)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return {
        "user_id": user,
        "memory_paused": M.is_memory_paused(user),
        "categories": list(M.CATEGORIES),
        "count": len(items),
        "memories": items,
    }


@router.post("/propose")
async def propose(req: ProposeRequest) -> dict[str, Any]:
    """Build a consent prompt. Stores nothing."""
    try:
        return M.propose_memory(req.category, req.key, req.value).as_dict()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("", status_code=201)
async def save(req: SaveRequest, x_user_id: Optional[str] = Header(None)) -> dict[str, Any]:
    user = _user(x_user_id)
    try:
        res = M.save_memory(
            user_id=user, category=req.category, key=req.key, value=req.value,
            source=req.source, user_confirmed=req.user_confirmed,
            allow_sensitive=req.allow_sensitive,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if not res.get("saved"):
        raise HTTPException(status_code=409, detail=res)
    return res


@router.patch("/{memory_id}")
async def update(
    memory_id: str, req: UpdateRequest, x_user_id: Optional[str] = Header(None)
) -> dict[str, Any]:
    user = _user(x_user_id)
    try:
        updated = M.update_memory(user, memory_id, value=req.value,
                                  key=req.key, category=req.category)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if updated is None:
        raise HTTPException(status_code=404, detail="No such memory for this user.")
    return updated


@router.delete("/{memory_id}", status_code=204)
async def remove(memory_id: str, x_user_id: Optional[str] = Header(None)):
    # No return annotation: FastAPI would infer response_model=NoneType and
    # reject a 204 route.
    if not M.delete_memory(_user(x_user_id), memory_id):
        raise HTTPException(status_code=404, detail="No such memory for this user.")


@router.post("/forget-everything")
async def forget_all(x_user_id: Optional[str] = Header(None)) -> dict[str, Any]:
    """Delete every memory for this user. Rows are removed, not flagged."""
    return M.forget_everything(_user(x_user_id))


@router.post("/pause")
async def pause(req: PauseRequest, x_user_id: Optional[str] = Header(None)) -> dict[str, Any]:
    return M.set_memory_paused(_user(x_user_id), req.paused)


@router.get("/export")
async def export(x_user_id: Optional[str] = Header(None)) -> dict[str, Any]:
    """Data export (Part 68)."""
    from memory.store import export_memories

    return export_memories(_user(x_user_id))
