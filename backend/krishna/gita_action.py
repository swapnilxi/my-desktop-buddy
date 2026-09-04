"""
Gita → Action framework (Phase 1, section 11).

A structured, *static* mapping from a life situation to (a) the Gita concepts
that bear on it and (b) practical, modern actions. Three properties matter:

  1. **Nothing here is scripture.** No Sanskrit, no verse text, no
     translation, no attribution. Every modern application is labelled
     `modern_interpretation` or `inspired_by`, and the label travels with the
     payload all the way to the UI and the prompt.
  2. **Verses are never generated from this table.** The `themes` on each
     situation are search keys handed to the verified Gita retriever; if the
     knowledge base has nothing, the situation still yields actions and the
     answer simply carries no verse.
  3. **Actions are things the app can actually do** — start a focus session,
     split a task, log a habit — so guidance ends in a tool call rather than
     an aphorism.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional

MODERN_LABEL = "modern interpretation"
INSPIRED_LABEL = "inspired by this principle"

DISCLAIMER = (
    "The concepts below are drawn from Gita themes; the actions are a modern "
    "interpretation written for this app, not a quotation from the text."
)


@dataclass(frozen=True)
class Situation:
    id: str
    label: str
    concepts: tuple[str, ...]        # Gita ideas that bear on the situation
    themes: tuple[str, ...]          # search keys for the VERIFIED retriever
    actions: tuple[str, ...]         # practical, app-shaped next steps
    tool_hint: Optional[str] = None  # the tool that would actually do it
    avoid: tuple[str, ...] = field(default_factory=tuple)

    def as_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "label": self.label,
            "concepts": list(self.concepts),
            "search_themes": list(self.themes),
            "actions": list(self.actions),
            "action_label": MODERN_LABEL,
            "tool_hint": self.tool_hint,
            "avoid": list(self.avoid),
            "disclaimer": DISCLAIMER,
        }


SITUATIONS: dict[str, Situation] = {
    "PROCRASTINATION": Situation(
        id="PROCRASTINATION",
        label="Putting off work that matters",
        concepts=("disciplined action", "equanimity about outcomes",
                  "attachment to results"),
        themes=("action", "duty", "detachment from results", "discipline"),
        actions=(
            "Find out which of the four it is: boring, unclear, too hard, or "
            "frightening because of how it might turn out.",
            "Define one controllable next step small enough to start now.",
            "Start a 25-minute focus session on that step alone.",
            "Judge the session by the effort given, not by whether the whole "
            "thing got finished.",
        ),
        tool_hint="startFocus",
        avoid=("lecturing about duty", "quoting a verse before understanding the cause"),
    ),
    "OVERWHELM": Situation(
        id="OVERWHELM",
        label="Too much at once",
        concepts=("steadiness of mind", "acting without being ruled by anxiety",
                  "one duty at a time"),
        themes=("equanimity", "steady mind", "anxiety", "peace"),
        actions=(
            "List everything open so it stops circling in the head.",
            "Pick the one item that would most reduce the pressure if it were done.",
            "Move the rest out of today — a task with no due date today is not "
            "today's problem.",
            "Take one 45-minute block on that single item.",
        ),
        tool_hint="listTasks",
        avoid=("telling them to simply detach", "adding anything new to the list"),
    ),
    "COMPARISON": Situation(
        id="COMPARISON",
        label="Measuring yourself against someone else",
        concepts=("your own dharma over another's", "the work is yours, the pace is yours"),
        themes=("own duty", "svadharma", "comparison", "self"),
        actions=(
            "Name what specifically is being compared — outcome, speed, or ability.",
            "Write down the version of the goal that belongs to this person's own "
            "situation, not the other person's.",
            "Set one measurable step for this week against that goal.",
        ),
        tool_hint="createGoal",
        avoid=("dismissing the feeling", "telling them comparison is simply wrong"),
    ),
    "FAILURE": Situation(
        id="FAILURE",
        label="Something did not work out",
        concepts=("effort is yours, outcome is not entirely",
                  "steadiness through success and failure alike"),
        themes=("failure", "equanimity", "detachment from results", "courage"),
        actions=(
            "Separate what was controllable from what was not, plainly and without "
            "softening either.",
            "Keep one thing that worked, so the attempt is not written off whole.",
            "Choose the single next attempt and when it happens.",
        ),
        tool_hint="createTask",
        avoid=("silver linings", "'everything happens for a reason'", "minimising it"),
    ),
    "DISCIPLINE": Situation(
        id="DISCIPLINE",
        label="Wanting to be consistent",
        concepts=("practice over intensity", "moderation", "steady repetition"),
        themes=("discipline", "practice", "moderation", "self-control"),
        actions=(
            "Shrink the habit until it is impossible to skip on a bad day.",
            "Log it daily so the streak is visible rather than remembered.",
            "Treat a missed day as a missed day — restart, do not restart the count "
            "of your worth.",
        ),
        tool_hint="logHabit",
        avoid=("shaming a broken streak", "demanding intensity"),
    ),
    "DISTRACTION": Situation(
        id="DISTRACTION",
        label="Cannot hold attention",
        concepts=("the restless mind can be trained", "steady practice, not force"),
        themes=("mind control", "restless mind", "meditation", "practice"),
        actions=(
            "Pick one task and close everything that is not it.",
            "Run a short session first — 25 minutes beats an ambitious hour that "
            "collapses at ten.",
            "Note what pulled attention away; the pattern matters more than the "
            "single lapse.",
        ),
        tool_hint="startFocus",
        avoid=("telling them to just concentrate",),
    ),
    "DECISION": Situation(
        id="DECISION",
        label="Stuck between options",
        concepts=("clarity about what is actually yours to decide",
                  "acting once the thinking is done"),
        themes=("duty", "doubt", "clarity", "action"),
        actions=(
            "Write the two options as concrete outcomes, not as feelings.",
            "Mark which parts of each are in this person's control.",
            "Name the reversible one — a reversible choice deserves less agony.",
            "Set a decision deadline so the deliberation itself stops being the cost.",
        ),
        tool_hint="createTask",
        avoid=("deciding for them", "pretending to know how it turns out"),
    ),
    "BURNOUT": Situation(
        id="BURNOUT",
        label="Running on empty",
        concepts=("moderation in work, rest, food and sleep",
                  "the instrument has to be maintained"),
        themes=("moderation", "balance", "rest", "yoga"),
        actions=(
            "Cut today's plan to one thing and let the rest wait.",
            "Schedule rest as an actual block, not as whatever is left over.",
            "If this has been going for weeks rather than days, that is worth "
            "raising with a person, not an app.",
        ),
        tool_hint=None,
        avoid=("productivity advice", "pushing through", "any health claim"),
    ),
    "MOTIVATION": Situation(
        id="MOTIVATION",
        label="Waiting to feel like it",
        concepts=("action does not wait on mood", "duty performed steadily"),
        themes=("action", "duty", "discipline", "effort"),
        actions=(
            "Start with the smallest version that still counts as the real thing.",
            "Give it ten minutes and decide afterwards, not before.",
            "Attach it to the goal it serves so the effort has somewhere to land.",
        ),
        tool_hint="startFocus",
        avoid=("'you've got this'", "generic encouragement"),
    ),
}

# Classifier intent / emotion → situation. Only mappings that are actually
# supported by a situation entry; nothing is guessed.
_INTENT_MAP = {
    "procrastination": "PROCRASTINATION",
    "failure_recovery": "FAILURE",
    "decision_support": "DECISION",
    "motivation": "MOTIVATION",
}
_EMOTION_MAP = {
    "stressed": "OVERWHELM",
    "overwhelmed": "OVERWHELM",
    "tired": "BURNOUT",
    "frustrated": "DISTRACTION",
}


def situation_for(intent: str, emotion: str = "neutral",
                  message: str = "") -> Optional[Situation]:
    """
    Pick a situation for this turn, or None.

    None is a legitimate answer: most messages are not one of these, and
    forcing a mapping is exactly how a companion turns into a preacher.
    """
    text = (message or "").lower()
    if "compar" in text or "everyone else" in text or "ahead of me" in text:
        return SITUATIONS["COMPARISON"]
    if "burn" in text and "out" in text:
        return SITUATIONS["BURNOUT"]
    if "consisten" in text or "streak" in text or "discipline" in text:
        return SITUATIONS["DISCIPLINE"]

    key = _INTENT_MAP.get(intent) or _EMOTION_MAP.get(emotion)
    return SITUATIONS.get(key) if key else None


def prompt_block(situation: Situation) -> str:
    """Render a situation for the system prompt."""
    return (
        f"GITA → ACTION FRAMING — {situation.label}\n"
        f"Relevant Gita concepts (for your framing, NOT to be quoted): "
        f"{'; '.join(situation.concepts)}\n"
        "Practical directions you may offer — these are a modern interpretation "
        "written for this app, never presented as a Gita quotation:\n"
        + "\n".join(f"  - {a}" for a in situation.actions)
        + (f"\nDo not: {'; '.join(situation.avoid)}" if situation.avoid else "")
        + (f"\nA tool that would actually do this: {situation.tool_hint}"
           if situation.tool_hint else "")
        + "\nPick ONE insight and ONE next action. Do not list all of the above."
    )


def catalog() -> list[dict[str, Any]]:
    return [s.as_dict() for s in SITUATIONS.values()]
