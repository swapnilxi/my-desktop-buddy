"""
Tests for the unified Presentation model (Parts 63/70).

Three things are covered:

  * Every branch of `_presentation_for` — mode, emotion, urgency, intent,
    the three new mode branches, and the Gita→Action situation overrides —
    with the exact `Presentation` fields each branch must produce.
  * `celebration_signal`'s milestone case now reads CELEBRATING, not HAPPY.
  * The five events moved off the tool-wrapper layer and onto the real
    business-logic functions (Part 64 follow-through) actually fire from
    those functions, exactly once, with the expected payload — and do not
    fire again on a no-op call (already-completed task, already-ended
    session, already-deleted memory).
"""
from __future__ import annotations

import pytest

from krishna.events import (
    FOCUS_COMPLETED,
    FOCUS_STARTED,
    MEMORY_DELETED,
    MEMORY_SAVED,
    TASK_COMPLETED,
    TASK_FAILED,
    bus,
)
from krishna.gita_action import SITUATIONS
from krishna.intent import Classification
from krishna.motivation import celebration_signal
from krishna.orchestrator import _presentation_for
from krishna.presentation import Presentation
from memory import store as M
from productivity import focus as F
from productivity import tasks as T

U1 = "user-one"


# ── _presentation_for: mode / emotion / urgency / intent branches ───────
def test_celebration_intent_uses_the_celebration_signal():
    pres = _presentation_for(Classification(intent="celebration"))
    assert pres == Presentation(animation="HAPPY", chakra="ACCELERATE",
                                voice_mode="HAPPY", mood="happy", particles=True)


def test_celebrating_emotion_also_triggers_celebration():
    pres = _presentation_for(Classification(emotion="celebrating"))
    assert pres == Presentation(animation="HAPPY", chakra="ACCELERATE",
                                voice_mode="HAPPY", mood="happy", particles=True)


def test_crisis_urgency_is_concerned_not_idle():
    pres = _presentation_for(Classification(urgency="crisis"))
    assert pres == Presentation(animation="CONCERNED", chakra="CALM",
                                voice_mode="GENTLE", mood="listening", particles=False)


def test_focus_mode():
    pres = _presentation_for(Classification(mode="focus"))
    assert pres == Presentation(animation="FOCUSED", chakra="SLOW",
                                voice_mode="SILENT", mood="focused", particles=False)


def test_meditation_mode():
    pres = _presentation_for(Classification(mode="meditation"))
    assert pres == Presentation(animation="MEDITATING", chakra="BREATHE",
                                voice_mode="SOFT", mood="idle", particles=False)


@pytest.mark.parametrize("emotion", ["sad", "anxious", "stressed", "tired"])
def test_low_emotions_are_concerned_not_idle(emotion):
    pres = _presentation_for(Classification(emotion=emotion))
    assert pres == Presentation(animation="CONCERNED", chakra="CALM",
                                voice_mode="GENTLE", mood="speaking", particles=False)


def test_playful_mode():
    pres = _presentation_for(Classification(mode="playful"))
    assert pres == Presentation(animation="EXCITED", chakra="ACCELERATE",
                                voice_mode="HAPPY", mood="excited", particles=False)


def test_listening_mode():
    pres = _presentation_for(Classification(mode="listening"))
    assert pres == Presentation(animation="LISTENING", chakra="CALM",
                                voice_mode="SILENT", mood="listening", particles=False)


@pytest.mark.parametrize("mode", ["wise", "gita"])
def test_wise_and_gita_modes_talk_with_a_glow(mode):
    pres = _presentation_for(Classification(mode=mode))
    assert pres == Presentation(animation="TALKING", chakra="GLOW",
                                voice_mode="CALM", mood="speaking", particles=False)


def test_needs_gita_without_a_dedicated_mode():
    pres = _presentation_for(Classification(mode="friend", needs_gita=True))
    assert pres == Presentation(animation="IDLE", chakra="GLOW",
                                voice_mode="CALM", mood="speaking", particles=False)


@pytest.mark.parametrize("mode", ["friend", "productivity"])
def test_default_fallback_has_no_dedicated_branch(mode):
    """friend/productivity get no new branch — they fall through unchanged."""
    pres = _presentation_for(Classification(mode=mode))
    assert pres == Presentation(animation="TALKING", chakra="CALM",
                                voice_mode="NEUTRAL", mood="speaking", particles=False)


# ── Gita→Action situation overrides ──────────────────────────────────────
def test_burnout_situation_overrides_to_concerned():
    pres = _presentation_for(Classification(mode="friend"), SITUATIONS["BURNOUT"])
    assert pres == Presentation(animation="CONCERNED", chakra="CALM",
                                voice_mode="GENTLE", mood="listening", particles=False)


def test_motivation_situation_overrides_to_excited():
    pres = _presentation_for(Classification(mode="friend"), SITUATIONS["MOTIVATION"])
    assert pres == Presentation(animation="EXCITED", chakra="ACCELERATE",
                                voice_mode="HAPPY", mood="excited", particles=False)


def test_discipline_situation_overrides_to_focused():
    pres = _presentation_for(Classification(mode="friend"), SITUATIONS["DISCIPLINE"])
    assert pres == Presentation(animation="FOCUSED", chakra="SLOW",
                                voice_mode="CALM", mood="focused", particles=False)


def test_situation_override_wins_even_over_celebration():
    """Situation overrides are checked first — ahead of celebration, urgency,
    mode and emotion — so they must win even when those would also match."""
    pres = _presentation_for(Classification(intent="celebration", urgency="crisis"),
                             SITUATIONS["BURNOUT"])
    assert pres.animation == "CONCERNED"
    assert pres.mood == "listening"


@pytest.mark.parametrize("situation_id", sorted(
    s for s in SITUATIONS if s not in {"BURNOUT", "MOTIVATION", "DISCIPLINE"}
))
def test_other_situations_do_not_override(situation_id):
    """Every situation besides the three above falls through to the normal
    mode/emotion mapping — None is a legitimate answer, not a fourth branch."""
    pres = _presentation_for(Classification(mode="friend"), SITUATIONS[situation_id])
    assert pres == Presentation(animation="TALKING", chakra="CALM",
                                voice_mode="NEUTRAL", mood="speaking", particles=False)


def test_no_situation_is_the_default_and_is_harmless():
    pres = _presentation_for(Classification(mode="friend"), None)
    assert pres == Presentation(animation="TALKING", chakra="CALM",
                                voice_mode="NEUTRAL", mood="speaking", particles=False)


# ── celebration_signal ───────────────────────────────────────────────────
def test_celebration_signal_milestone_is_the_celebrating_animation():
    sig = celebration_signal("milestone")
    assert sig.animation == "CELEBRATING"
    assert sig.chakra == "CELEBRATE"
    assert sig.voice_mode == "HAPPY"
    assert sig.particles is True


def test_celebration_signal_small_has_no_particles():
    sig = celebration_signal("small")
    assert sig.animation == "HAPPY"
    assert sig.particles is False


def test_celebration_signal_normal_still_has_particles():
    assert celebration_signal("normal").particles is True


# ── Event emissions moved to the real business-logic call sites ─────────
def test_focus_started_fires_from_start_session(isolated_profile):
    seen = []
    off = bus.on(FOCUS_STARTED, seen.append)
    try:
        session = F.start_session(U1, minutes=25, activity="writing")
    finally:
        off()
    assert len(seen) == 1
    assert seen[0].payload == {
        "session_id": session["id"], "minutes": 25.0, "activity": "writing",
    }


def test_focus_completed_fires_from_end_session(isolated_profile):
    F.start_session(U1, minutes=25)
    seen = []
    off = bus.on(FOCUS_COMPLETED, seen.append)
    try:
        session = F.end_session(U1, completed=True, actual_seconds=1500)
    finally:
        off()
    assert len(seen) == 1
    assert seen[0].payload["session_id"] == session["id"]
    assert seen[0].payload["completed"] is True


def test_focus_completed_does_not_refire_for_an_already_ended_session(isolated_profile):
    session = F.start_session(U1, minutes=25)
    F.end_session(U1, session_id=session["id"], actual_seconds=60)

    seen = []
    off = bus.on(FOCUS_COMPLETED, seen.append)
    try:
        again = F.end_session(U1, session_id=session["id"])   # already ended
    finally:
        off()
    assert again["id"] == session["id"]
    assert seen == []


def test_task_completed_fires_on_transition_to_completed(isolated_profile):
    task = T.create_task(U1, "Ship the feature")
    seen = []
    off = bus.on(TASK_COMPLETED, seen.append)
    try:
        updated = T.update_task(U1, task["id"], status="COMPLETED")
    finally:
        off()
    assert len(seen) == 1
    assert seen[0].payload == {"task_id": updated["id"], "title": updated["title"]}


def test_task_completed_does_not_refire_when_already_completed(isolated_profile):
    task = T.create_task(U1, "Ship the feature")
    T.update_task(U1, task["id"], status="COMPLETED")

    seen = []
    off = bus.on(TASK_COMPLETED, seen.append)
    try:
        T.update_task(U1, task["id"], status="COMPLETED")   # already there
    finally:
        off()
    assert seen == []


def test_task_failed_fires_on_transition_to_cancelled(isolated_profile):
    """There is no real FAILED status; CANCELLED is the closest approximation."""
    task = T.create_task(U1, "Abandon ship")
    seen = []
    off = bus.on(TASK_FAILED, seen.append)
    try:
        updated = T.update_task(U1, task["id"], status="CANCELLED")
    finally:
        off()
    assert len(seen) == 1
    assert seen[0].payload == {"task_id": updated["id"], "title": updated["title"]}


def test_completing_a_task_does_not_also_fire_task_failed(isolated_profile):
    task = T.create_task(U1, "x")
    seen = []
    off = bus.on(TASK_FAILED, seen.append)
    try:
        T.update_task(U1, task["id"], status="COMPLETED")
    finally:
        off()
    assert seen == []


def test_memory_saved_fires_on_a_successful_save(isolated_profile):
    seen = []
    off = bus.on(MEMORY_SAVED, seen.append)
    try:
        M.save_memory(U1, "GOAL", "marathon", "Half marathon in March",
                      user_confirmed=True)
    finally:
        off()
    assert len(seen) == 1
    assert seen[0].payload == {"category": "GOAL", "key": "marathon"}


def test_memory_saved_does_not_fire_when_memory_is_paused(isolated_profile):
    M.set_memory_paused(U1, True)
    seen = []
    off = bus.on(MEMORY_SAVED, seen.append)
    try:
        result = M.save_memory(U1, "GOAL", "k", "v", user_confirmed=True)
    finally:
        off()
    assert result["saved"] is False
    assert seen == []


def test_memory_deleted_fires_only_when_a_row_was_actually_deleted(isolated_profile):
    mid = M.save_memory(U1, "WORK", "role", "Engineer",
                        user_confirmed=True)["memory"]["id"]
    seen = []
    off = bus.on(MEMORY_DELETED, seen.append)
    try:
        assert M.delete_memory(U1, mid) is True
        assert M.delete_memory(U1, mid) is False    # already gone
    finally:
        off()
    assert len(seen) == 1
    assert seen[0].payload == {"memory_id": mid}
