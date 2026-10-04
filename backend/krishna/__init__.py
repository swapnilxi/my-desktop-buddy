"""
Krishna personality, intelligence and coordination layer.

  persona     — system-prompt assembly, the one source of character
  modes       — the eight selectable modes + time-of-day tone
  intent      — per-message classification (Part 50)
  motivation  — contextual motivation, celebration, failure recovery
  events      — event bus shared with the frontend (Part 64)
"""
from krishna.events import EVENT_NAMES, bus
from krishna.intent import Classification, classify
from krishna.modes import DEFAULT_MODE, MODES, list_modes, resolve_mode, time_context_for
from krishna.motivation import celebration_signal, cue_for, failure_recovery_flow
from krishna.persona import DEFAULT_NAME, build_system_prompt, persona_summary

__all__ = [
    "bus", "EVENT_NAMES", "classify", "Classification", "MODES", "DEFAULT_MODE",
    "resolve_mode", "list_modes", "time_context_for", "cue_for",
    "celebration_signal", "failure_recovery_flow", "build_system_prompt",
    "persona_summary", "DEFAULT_NAME",
]
