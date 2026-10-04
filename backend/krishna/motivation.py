"""
Motivation engine (Part 35) plus celebration and failure-recovery framing
(Parts 36, 37).

The rule Part 35 sets is that motivation must be *contextual* — never a
random "You can do it!". So this module never returns a generic line. It
takes the classified reason motivation is needed and returns the specific
reframe for that reason, along with the concrete next move.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass
class MotivationCue:
    """Guidance handed to the LLM — not text shown verbatim to the user."""

    reason: str
    reframe: str
    next_step_style: str
    tone: str = "warm"
    avoid: list[str] = field(default_factory=list)
    gita_theme: Optional[str] = None

    def as_dict(self) -> dict[str, Any]:
        return {
            "reason": self.reason,
            "reframe": self.reframe,
            "next_step_style": self.next_step_style,
            "tone": self.tone,
            "avoid": self.avoid,
            "gita_theme": self.gita_theme,
        }


_NEVER_SAY = [
    "You can do it!", "You've got this!", "Stay positive!", "Everything happens for a reason",
    "Just believe in yourself", "Rise and grind",
]

CUES: dict[str, MotivationCue] = {
    "failure_recovery": MotivationCue(
        reason="They failed at something or were rejected.",
        reframe=(
            "Failure is feedback, not identity. Name the specific thing that did not "
            "work — separating the event from who they are. Do not rush them past it "
            "and do not hunt for a silver lining."
        ),
        next_step_style="Ask what actually happened before proposing anything.",
        tone="steady",
        avoid=_NEVER_SAY + ["Everything will work out", "It happened for the best"],
        gita_theme="success and failure",
    ),
    "procrastination": MotivationCue(
        reason="They have been putting something off.",
        reframe=(
            "The problem is the size of the first step, not their character. Tease "
            "gently at most, then make the first action almost embarrassingly small."
        ),
        next_step_style="Propose one concrete action under 20 minutes. One, not a list.",
        tone="light",
        avoid=_NEVER_SAY + ["You need more discipline", "Stop being lazy"],
        gita_theme="procrastination",
    ),
    "fear": MotivationCue(
        reason="Fear is stopping them from acting.",
        reframe=(
            "Do not wait for the fear to leave first. Confidence is built by acting "
            "while afraid, not before. Name the specific fear — vague fear is bigger "
            "than named fear."
        ),
        next_step_style="Ask what exactly they are afraid of, then find the smallest safe step.",
        tone="calm",
        avoid=_NEVER_SAY + ["Don't be afraid", "There's nothing to fear"],
        gita_theme="fear",
    ),
    "comparison": MotivationCue(
        reason="They are comparing themselves to someone else.",
        reframe=(
            "Their path is theirs. Comparison usually measures their worst day against "
            "someone's visible highlight. Turn attention back to their own next step."
        ),
        next_step_style="Bring them back to one thing that is theirs to do today.",
        tone="warm",
        avoid=_NEVER_SAY + ["Don't compare yourself", "Others have it worse"],
        gita_theme="comparison",
    ),
    "exhaustion": MotivationCue(
        reason="They are tired or burnt out.",
        reframe=(
            "Do not push. Today is not the day to solve everything. Pick one thing "
            "that matters and let the rest wait — and check whether rest is the actual "
            "need here."
        ),
        next_step_style="Help them choose ONE necessary task, or permission to stop.",
        tone="gentle",
        avoid=_NEVER_SAY + ["Push through it", "No excuses"],
        gita_theme="balance",
    ),
    "overwhelm": MotivationCue(
        reason="Too much at once.",
        reframe=(
            "The load is real; the problem is that it is undifferentiated. Separate "
            "what is genuinely necessary today from what merely feels urgent."
        ),
        next_step_style="Sort into: must happen today / can wait / not theirs at all.",
        tone="steady",
        avoid=_NEVER_SAY + ["Just take it one day at a time"],
        gita_theme="detachment from results",
    ),
    "self_doubt": MotivationCue(
        reason="They are doubting their own worth or ability.",
        reframe=(
            "Speak to the specific claim, not the mood — 'I am bad at this' is not the "
            "same as 'this attempt failed'. Be their ally, and point out that the harsh "
            "internal voice is not what is producing the work."
        ),
        next_step_style="One piece of evidence against the story, then one small action.",
        tone="warm",
        avoid=_NEVER_SAY + ["You're amazing!", "Don't be so hard on yourself"],
        gita_theme="self discipline",
    ),
    "stuck_decision": MotivationCue(
        reason="They cannot choose between options.",
        reframe=(
            "Do not choose for them. Surface what they actually value, what is "
            "reversible, and what they would regret. The user decides."
        ),
        next_step_style="Name the one unknown that, if resolved, would make the choice obvious.",
        tone="clear",
        avoid=_NEVER_SAY + ["Follow your heart", "Trust the universe"],
        gita_theme="duty",
    ),
    "celebration": MotivationCue(
        reason="They finished something.",
        reframe=(
            "Be genuinely delighted and specific about what they did. Do not immediately "
            "pivot to the next task, and do not inflate a small thing into a milestone."
        ),
        next_step_style="No next step unless they ask. Let the moment land.",
        tone="joyful",
        avoid=["Now on to the next one!", "Don't get complacent"],
        gita_theme=None,
    ),
    "general": MotivationCue(
        reason="Motivation asked for without a clear cause.",
        reframe=(
            "Find out why first. Ask what is in the way before offering encouragement — "
            "encouragement aimed at nothing lands as noise."
        ),
        next_step_style="Ask one clarifying question.",
        tone="warm",
        avoid=_NEVER_SAY,
        gita_theme=None,
    ),
}


def cue_for(intent: str, emotion: str = "neutral", message: str = "") -> MotivationCue:
    """Pick the cue that matches why motivation is needed."""
    lowered = (message or "").lower()

    if intent == "celebration" or emotion == "celebrating":
        return CUES["celebration"]
    if intent == "failure_recovery":
        return CUES["failure_recovery"]
    if intent == "procrastination":
        return CUES["procrastination"]
    if intent == "decision_support":
        return CUES["stuck_decision"]

    if any(w in lowered for w in ("compar", "everyone else", "ahead of me", "behind everyone")):
        return CUES["comparison"]
    if any(w in lowered for w in ("worthless", "not good enough", "useless", "i'm bad at", "im bad at")):
        return CUES["self_doubt"]

    if emotion == "tired":
        return CUES["exhaustion"]
    if emotion == "stressed":
        return CUES["overwhelm"]
    if emotion == "anxious":
        return CUES["fear"]
    if emotion in {"sad", "frustrated"}:
        return CUES["self_doubt"] if "myself" in lowered else CUES["failure_recovery"]

    return CUES["general"]


def celebration_signal(magnitude: str = "normal") -> dict[str, Any]:
    """
    Frontend coordination payload for a completion (Parts 36, 63).

    `magnitude` keeps Part 36's caveat honest: small actions get a small
    acknowledgement, not fireworks.
    """
    if magnitude == "small":
        return {"emotion": "pleased", "animation": "HAPPY", "chakra": "GLOW",
                "voiceMode": "WARM", "particles": False}
    if magnitude == "milestone":
        return {"emotion": "celebration", "animation": "HAPPY", "chakra": "CELEBRATE",
                "voiceMode": "HAPPY", "particles": True}
    return {"emotion": "happy", "animation": "HAPPY", "chakra": "ACCELERATE",
            "voiceMode": "HAPPY", "particles": True}


def failure_recovery_flow() -> dict[str, Any]:
    """Part 37 — never shame; ask, then adjust the plan."""
    return {
        "steps": [
            {"ask": "What happened?", "purpose": "understand before adjusting"},
            {"ask": "What got in the way?", "purpose": "find the real obstacle"},
            {"action": "adjust_plan", "purpose": "make the plan fit reality"},
        ],
        "never": ["shame", "guilt-tripping", "streak-loss drama", "comparison to past self"],
        "framing": "The plan failed, not the person. Now make the plan better.",
    }
