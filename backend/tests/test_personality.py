"""
Personality consistency tests (Parts 51–53, 58).

These assert on the *system prompt and routing decisions*, not on LLM output —
model text is not deterministic, but the instructions and retrieval choices
that shape it are, and they are where the spec's rules actually live.
"""
from __future__ import annotations

import pytest

from krishna.intent import classify
from krishna.modes import MODES, resolve_mode, time_context_for
from krishna.persona import build_system_prompt, persona_summary


# ── Part 58: the listed evaluation scenarios ─────────────────────────────
SCENARIOS = [
    ("stressed",     "Everything is piling up and I can't cope", "emotional_support", "stressed"),
    ("happy",        "I'm having a great day today!",            "conversation",      "happy"),
    ("failed",       "I failed my exam",                          "failure_recovery",  "neutral"),
    ("procrastinating", "I procrastinated all afternoon",         "procrastination",   "neutral"),
    ("celebrating",  "I finally finished my project!",            "celebration",       "celebrating"),
    ("confused",     "I don't understand what's happening",       "emotional_support", "confused"),
    ("technical",    "How do I fix this Python bug?",             "technical_help",    "neutral"),
    ("spiritual",    "What does the Gita say about duty?",        "gita_question",     "neutral"),
    ("vague",        "Krishna, what should I do?",                None,                "neutral"),
]


@pytest.mark.parametrize("label,message,expected_intent,expected_emotion", SCENARIOS)
def test_scenarios_classify_consistently(label, message, expected_intent, expected_emotion):
    c = classify(message)
    if expected_intent:
        assert c.intent == expected_intent, f"{label}: got {c.intent}"
    assert c.emotion == expected_emotion, f"{label}: got {c.emotion}"


@pytest.mark.parametrize("label,message,_i,_e", SCENARIOS)
def test_core_identity_is_present_in_every_scenario(label, message, _i, _e):
    """The character must not drift between situations."""
    prompt = build_system_prompt(classify(message))
    assert "Krishna-inspired AI companion" in prompt
    assert "You are not Lord Krishna himself" in prompt
    assert "NEVER DO THESE" in prompt
    assert "CARE AND LIMITS" in prompt


@pytest.mark.parametrize("mode", list(MODES))
def test_every_mode_keeps_the_same_identity(mode):
    prompt = build_system_prompt(classify("I need some help", mode=mode), mode=mode)
    assert "Krishna-inspired AI companion" in prompt
    assert resolve_mode(mode).directive in prompt


# ── Part 51: do not over-religionize ─────────────────────────────────────
@pytest.mark.parametrize("message", [
    "How do I fix this Python bug?",
    "My TypeScript build throws a syntax error and I'm frustrated",
    "What's the time complexity of quicksort?",
    "npm install is failing",
])
def test_technical_questions_get_no_scripture(message):
    c = classify(message)
    assert c.is_technical
    assert not c.needs_gita
    prompt = build_system_prompt(c)
    assert "Answer it technically" in prompt
    assert "GITA RETRIEVAL" not in prompt


@pytest.mark.parametrize("message", [
    "I am afraid of failing",
    "I got rejected and feel awful",
    "Krishna, what should I do with my life?",
])
def test_emotional_and_life_questions_may_use_gita(message):
    assert classify(message).needs_gita


def test_gita_reference_question_gets_full_scripture_treatment():
    c = classify("What does Gita 2.47 mean?")
    assert c.intent == "gita_question"
    assert c.gita_reference == (2, 47)
    assert c.gita_reference_valid


def test_productivity_mode_suppresses_scripture():
    c = classify("I am afraid of failing", mode="productivity")
    assert not c.needs_gita
    prompt = build_system_prompt(c, mode="productivity")
    assert "NO SCRIPTURE THIS TURN" in prompt


def test_focus_mode_keeps_replies_minimal():
    prompt = build_system_prompt(classify("still working", mode="focus"), mode="focus")
    assert "Say the minimum" in prompt
    assert "2 sentences or fewer" in prompt


def test_listening_mode_forbids_advice():
    prompt = build_system_prompt(classify("I just need to vent", mode="listening"), mode="listening")
    assert "Just listen" in prompt
    assert "Do NOT offer" in prompt


# ── Part 52: don't overuse Radhe Radhe ───────────────────────────────────
def test_prompt_forbids_opening_every_reply_with_a_greeting():
    prompt = build_system_prompt(classify("hi"))
    assert "Do NOT open every reply with one" in prompt
    assert "Opening with a devotional greeting when the user did not greet you" in prompt


# ── Part 53: divine feeling without false claims ─────────────────────────
def test_no_false_divinity_claims():
    prompt = build_system_prompt(classify("Are you really Krishna?"))
    assert "no supernatural powers" in prompt
    assert "no knowledge of the future" in prompt
    assert "no divine authority" in prompt


def test_persona_summary_states_the_disclaimer():
    summary = persona_summary()
    assert summary["claims_divinity"] is False
    assert "inspired by" in summary["disclaimer"]
    assert len(summary["modes"]) == 8


# ── Part 6 / 34: scripture integrity instructions ────────────────────────
def test_scripture_integrity_block_when_gita_involved():
    c = classify("What does the Gita say about anger?")
    prompt = build_system_prompt(c, gita_results=[{
        "reference": "Bhagavad Gita 2.63", "sanskrit": "क्रोधाद्भवति सम्मोहः",
        "translation": "From anger comes confusion.", "source_name": "Test",
        "verified": False, "themes": ["anger"],
    }])
    assert "Never invent a verse" in prompt
    assert "the ONLY verses you may quote" in prompt
    assert "unverified seed text" in prompt


def test_no_verse_retrieved_instructs_honest_fallback():
    c = classify("What does the Gita say about quantum computing?")
    prompt = build_system_prompt(c, gita_results=[])
    assert "GITA RETRIEVAL — NOTHING FOUND" in prompt
    assert "not quoting" in prompt


def test_invalid_reference_instructs_refusal():
    c = classify("What does Gita 20.10 say?")
    prompt = build_system_prompt(c, gita_invalid_message="Chapter 20 does not exist.")
    assert "INVALID REFERENCE" in prompt
    assert "Do NOT produce a verse for it" in prompt


# ── Part 54: safety ─────────────────────────────────────────────────────
def test_distress_is_prioritised_over_everything():
    c = classify("I want to kill myself")
    assert c.urgency == "crisis"
    assert "emotional_distress" in c.safety_flags
    assert not c.needs_gita
    prompt = build_system_prompt(c)
    assert "POSSIBLE DISTRESS" in prompt
    assert "real-world support" in prompt


@pytest.mark.parametrize("message", [
    "Should I invest my savings in this fund?",
    "What medication should I take for this?",
    "Can I sue them for this?",
])
def test_high_stakes_topics_add_caution_and_no_scripture(message):
    c = classify(message)
    assert c.is_high_stakes
    assert not c.needs_gita
    prompt = build_system_prompt(c)
    assert "qualified professional" in prompt


# ── Part 12/13/14: time-of-day tone ──────────────────────────────────────
@pytest.mark.parametrize("hour,expected", [(7, "morning"), (14, "day"), (19, "evening"), (23, "night")])
def test_time_context_resolution(hour, expected):
    assert time_context_for(hour).id == expected


def test_night_mode_is_quieter():
    prompt = build_system_prompt(classify("still up"), time_hour=23)
    assert "It is late" in prompt
    assert "do not build" in prompt


# ── Motivation is never generic (Part 35) ────────────────────────────────
def test_motivation_cue_is_injected_and_forbids_platitudes():
    from krishna.motivation import cue_for

    c = classify("I procrastinated for three hours")
    assert c.needs_motivation
    cue = cue_for(c.intent, c.emotion, "I procrastinated for three hours").as_dict()
    prompt = build_system_prompt(c, motivation_cue=cue)
    assert "WHY THEY NEED SUPPORT RIGHT NOW" in prompt
    assert "You can do it!" in prompt      # present as a "do not say"
    assert "Do not say:" in prompt


# ── Output hygiene ───────────────────────────────────────────────────────
def test_prompt_forbids_reasoning_traces():
    prompt = build_system_prompt(classify("hello"))
    assert "<think>" in prompt and "Never include chain-of-thought" in prompt


@pytest.mark.parametrize("raw,expected_absent", [
    ("<think>internal reasoning</think>Hello dost!", "internal reasoning"),
    ("Thought: I should be kind\nHello dost!", "Thought:"),
    ("*adjusts peacock feather*\nHello dost!", "adjusts peacock feather"),
    ("<think>unterminated reasoning", "unterminated"),
])
def test_clean_response_strips_artifacts(raw, expected_absent):
    from krishna.orchestrator import clean_response

    cleaned = clean_response(raw)
    assert expected_absent not in cleaned
