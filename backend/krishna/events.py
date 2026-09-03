"""
Event bus (Part 64).

Keeps visual/voice behaviour decoupled from AI logic: the AI layer emits
semantic events, and subscribers (animation, voice, notifications, logging)
decide what to do. Backend-side emission also produces the payload the
frontend event bus consumes, so one vocabulary spans both sides.
"""
from __future__ import annotations

import threading
from collections import deque
from dataclasses import dataclass, field
from typing import Any, Callable, Deque, Optional

from db import now_iso

# ── Event names — the shared vocabulary ─────────────────────────────────
KRISHNA_MESSAGE_START = "KRISHNA_MESSAGE_START"
KRISHNA_MESSAGE_END = "KRISHNA_MESSAGE_END"
USER_STARTED_SPEAKING = "USER_STARTED_SPEAKING"
USER_STOPPED_SPEAKING = "USER_STOPPED_SPEAKING"
TASK_COMPLETED = "TASK_COMPLETED"
TASK_FAILED = "TASK_FAILED"
FOCUS_STARTED = "FOCUS_STARTED"
FOCUS_COMPLETED = "FOCUS_COMPLETED"
GITA_RETRIEVED = "GITA_RETRIEVED"
MEMORY_SAVED = "MEMORY_SAVED"
MEMORY_DELETED = "MEMORY_DELETED"
DAILY_GREETING = "DAILY_GREETING"
DAILY_VERSE = "DAILY_VERSE"
MEDITATION_STARTED = "MEDITATION_STARTED"
MEDITATION_COMPLETED = "MEDITATION_COMPLETED"

EVENT_NAMES = (
    KRISHNA_MESSAGE_START, KRISHNA_MESSAGE_END, USER_STARTED_SPEAKING,
    USER_STOPPED_SPEAKING, TASK_COMPLETED, TASK_FAILED, FOCUS_STARTED,
    FOCUS_COMPLETED, GITA_RETRIEVED, MEMORY_SAVED, MEMORY_DELETED,
    DAILY_GREETING, DAILY_VERSE, MEDITATION_STARTED, MEDITATION_COMPLETED,
)

# Default presentation for each event (Part 63). Subscribers may override;
# this is what the frontend gets when the backend has no better idea.
PRESENTATION: dict[str, dict[str, Any]] = {
    KRISHNA_MESSAGE_START: {"animation": "THINKING", "chakra": "FAST", "voiceMode": "NEUTRAL"},
    KRISHNA_MESSAGE_END: {"animation": "IDLE", "chakra": "CALM", "voiceMode": "NEUTRAL"},
    USER_STARTED_SPEAKING: {"animation": "LISTENING", "chakra": "CALM", "voiceMode": "SILENT"},
    USER_STOPPED_SPEAKING: {"animation": "THINKING", "chakra": "FAST", "voiceMode": "SILENT"},
    TASK_COMPLETED: {"animation": "HAPPY", "chakra": "CELEBRATE", "voiceMode": "HAPPY"},
    TASK_FAILED: {"animation": "IDLE", "chakra": "CALM", "voiceMode": "GENTLE"},
    FOCUS_STARTED: {"animation": "FOCUSED", "chakra": "SLOW", "voiceMode": "SILENT"},
    FOCUS_COMPLETED: {"animation": "HAPPY", "chakra": "CELEBRATE", "voiceMode": "HAPPY"},
    GITA_RETRIEVED: {"animation": "IDLE", "chakra": "GLOW", "voiceMode": "CALM"},
    MEMORY_SAVED: {"animation": "IDLE", "chakra": "GLOW", "voiceMode": "NEUTRAL"},
    MEMORY_DELETED: {"animation": "IDLE", "chakra": "CALM", "voiceMode": "NEUTRAL"},
    DAILY_GREETING: {"animation": "WAVING", "chakra": "GLOW", "voiceMode": "WARM"},
    DAILY_VERSE: {"animation": "IDLE", "chakra": "GLOW", "voiceMode": "CALM"},
    MEDITATION_STARTED: {"animation": "MEDITATING", "chakra": "BREATHE", "voiceMode": "SOFT"},
    MEDITATION_COMPLETED: {"animation": "IDLE", "chakra": "CALM", "voiceMode": "SOFT"},
}


@dataclass
class Event:
    name: str
    payload: dict[str, Any] = field(default_factory=dict)
    at: str = field(default_factory=now_iso)

    def as_dict(self) -> dict[str, Any]:
        return {
            "event": self.name,
            "at": self.at,
            "presentation": PRESENTATION.get(self.name, {}),
            **({"payload": self.payload} if self.payload else {}),
        }


Handler = Callable[[Event], None]


class EventBus:
    """
    Tiny synchronous pub/sub with a bounded replay buffer.

    A failing subscriber never breaks emission — an animation glitch must not
    take down a chat response.
    """

    def __init__(self, history: int = 100) -> None:
        self._subs: dict[str, list[Handler]] = {}
        self._any: list[Handler] = []
        self._history: Deque[Event] = deque(maxlen=history)
        self._lock = threading.Lock()

    def on(self, name: str, handler: Handler) -> Callable[[], None]:
        with self._lock:
            self._subs.setdefault(name, []).append(handler)

        def off() -> None:
            with self._lock:
                if handler in self._subs.get(name, []):
                    self._subs[name].remove(handler)

        return off

    def on_any(self, handler: Handler) -> Callable[[], None]:
        with self._lock:
            self._any.append(handler)

        def off() -> None:
            with self._lock:
                if handler in self._any:
                    self._any.remove(handler)

        return off

    def emit(self, name: str, **payload: Any) -> Event:
        event = Event(name=name, payload=payload)
        with self._lock:
            self._history.append(event)
            handlers = list(self._subs.get(name, [])) + list(self._any)
        for h in handlers:
            try:
                h(event)
            except Exception:
                from observability import get_logger

                get_logger("events").warning(
                    "subscriber.failed", extra={"fields": {"event": name}}, exc_info=True
                )
        return event

    def recent(self, limit: int = 25, name: Optional[str] = None) -> list[dict[str, Any]]:
        with self._lock:
            items = list(self._history)
        if name:
            items = [e for e in items if e.name == name]
        return [e.as_dict() for e in items[-limit:]]


bus = EventBus()
