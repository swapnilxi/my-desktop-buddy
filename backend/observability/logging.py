"""
Structured logging (Part 67).

Logs one JSON line per request with request id, intent, tools, latency and
errors. User message *content* is never logged — only classification and
counts — so turning logging up never leaks what someone actually said.
"""
from __future__ import annotations

import json
import logging
import os
import sys
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Optional

_LEVEL = os.getenv("KRISHNA_LOG_LEVEL", "INFO").upper()
_configured = False


class _JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "ts": self.formatTime(record, "%Y-%m-%dT%H:%M:%S%z"),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        extra = getattr(record, "fields", None)
        if isinstance(extra, dict):
            payload.update(extra)
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)


def _configure() -> None:
    global _configured
    if _configured:
        return
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(_JsonFormatter())
    root = logging.getLogger("krishna")
    root.setLevel(_LEVEL)
    root.handlers = [handler]
    root.propagate = False
    _configured = True


def get_logger(name: str = "krishna") -> logging.Logger:
    _configure()
    return logging.getLogger(name if name.startswith("krishna") else f"krishna.{name}")


def new_request_id() -> str:
    return uuid.uuid4().hex[:12]


@dataclass
class RequestLog:
    """
    Collects per-request telemetry, then emits one structured line and one
    `usage` row on close. Deliberately holds no message content.
    """

    request_id: str = field(default_factory=new_request_id)
    user_id: Optional[str] = None
    route: str = ""
    intent: Optional[str] = None
    emotion: Optional[str] = None
    mode: Optional[str] = None
    provider: Optional[str] = None
    model: Optional[str] = None
    tools_used: list[str] = field(default_factory=list)
    gita_retrieved: int = 0
    memories_retrieved: int = 0
    prompt_chars: int = 0
    response_chars: int = 0
    ok: bool = True
    error: Optional[str] = None
    _started: float = field(default_factory=time.perf_counter)

    def tool(self, name: str) -> None:
        self.tools_used.append(name)

    def fail(self, exc: BaseException | str) -> None:
        self.ok = False
        self.error = str(exc)[:500]

    @property
    def latency_ms(self) -> int:
        return int((time.perf_counter() - self._started) * 1000)

    def close(self) -> None:
        fields = {
            "request_id": self.request_id,
            "user_id": self.user_id,
            "route": self.route,
            "intent": self.intent,
            "emotion": self.emotion,
            "mode": self.mode,
            "provider": self.provider,
            "model": self.model,
            "tools_used": self.tools_used,
            "gita_retrieved": self.gita_retrieved,
            "memories_retrieved": self.memories_retrieved,
            "prompt_chars": self.prompt_chars,
            "response_chars": self.response_chars,
            "latency_ms": self.latency_ms,
            "ok": self.ok,
        }
        if self.error:
            fields["error"] = self.error
        log = get_logger("request")
        log.info("request.complete" if self.ok else "request.failed", extra={"fields": fields})
        try:
            record_usage(self)
        except Exception:  # telemetry must never break a response
            pass


def record_usage(entry: RequestLog) -> None:
    """Persist a usage row. Best-effort; swallowed by the caller on failure."""
    from db import get_conn, new_id, now_iso, dump_json

    with get_conn() as conn:
        conn.execute(
            "INSERT INTO usage (id, user_id, request_id, intent, mode, provider,"
            " model, tools_used, latency_ms, ok, error, created_at)"
            " VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
            (
                new_id(),
                entry.user_id,
                entry.request_id,
                entry.intent,
                entry.mode,
                entry.provider,
                entry.model,
                dump_json(entry.tools_used),
                entry.latency_ms,
                1 if entry.ok else 0,
                entry.error,
                now_iso(),
            ),
        )
