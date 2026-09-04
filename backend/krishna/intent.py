"""
Response intelligence (Part 50).

Classifies every incoming message before the LLM is called, producing the
structured signal the rest of the pipeline routes on:

    {"intent": "motivation", "emotion": "frustrated", "mode": "friend",
     "needsGita": true, "needsMemory": false, "needsTool": false, ...}

This is deliberately a fast deterministic classifier, not an LLM call. Three
reasons: it runs on every message, it must work offline (Part 69), and its
main job — *not* firing the Gita retriever on "how do I fix this Python bug"
(Part 51) — is precisely the kind of rule that should be inspectable.
"""
from __future__ import annotations

import re
from dataclasses import asdict, dataclass, field
from typing import Any, Optional

from gita.chapters import parse_reference, validate_reference

# ── Vocabulary ───────────────────────────────────────────────────────────
_TECHNICAL = re.compile(
    r"\b(bug|error|exception|traceback|stack\s?trace|compile|syntax|debug|"
    r"python|javascript|typescript|java|rust|golang|sql|regex|api|endpoint|"
    r"function|variable|array|loop|null|undefined|npm|pip|git|docker|"
    r"kubernetes|react|django|fastapi|css|html|dsa|algorithm|complexity|"
    r"leetcode|segfault|linker|import\s+error|merge\s+conflict|code)\b",
    re.I,
)
_SCRIPTURE = re.compile(
    r"\b(gita|bhagavad|shloka|sloka|verse|chapter|sanskrit|krishna\s+said|"
    r"arjuna|karma\s?yoga|bhakti\s?yoga|jnana|dharma|scripture|upanishad|"
    r"mahabharat|translation|commentary)\b",
    re.I,
)
_SPIRITUAL_TOPIC = re.compile(
    r"\b(meaning\s+of\s+life|purpose|soul|atman|moksha|karma|rebirth|"
    r"detachment|surrender|devotion|god|divine|prayer|meditat)\w*\b",
    re.I,
)
_TASK_VERBS = re.compile(
    r"\b(add|create|make|remind|schedule|note down|put)\b.{0,24}\b"
    r"(task|todo|to-do|list|reminder|deadline)\b|"
    r"\b(task|todo|to-do)s?\b.{0,16}\b(add|create|list|show|done|complete)\b",
    re.I,
)
_TIMER = re.compile(
    r"\b(focus|pomodoro|timer|deep work)\b|"
    r"\b\d{1,3}\s*(?:min|minute|minutes|hour|hours|hr|hrs)\b.{0,20}\b(focus|work|session|timer)\b",
    re.I,
)
_PLANNING = re.compile(
    r"\bplan (?:my|the|out) (?:day|week|morning|evening|today|tomorrow)\b|"
    r"\b(what should i (?:do|work on) (?:today|first|now))\b|"
    r"\b(prioriti[sz]e|daily plan|schedule my)\b",
    re.I,
)
_GOAL_SETTING = re.compile(
    r"\b(set (?:a|my) goal|new goal|long[- ]term goal|my goal is|"
    r"i want to become|i'?m trying to become|goal for (?:this|next) "
    r"(?:month|year|quarter)|milestone)\b",
    re.I,
)
_HABIT_TRACKING = re.compile(
    r"\b(habit|streak|every ?day (?:i|for)|daily routine|track (?:my|this)|"
    r"consisten(?:t|cy)|keep it up daily)\b",
    re.I,
)
_REVIEW = re.compile(
    r"\b(weekly review|review (?:my|the) week|how (?:did|was) (?:my|this|the) week|"
    r"how'?s my week|week in review|how am i doing (?:this week|lately)|"
    r"my (?:progress|stats|numbers))\b",
    re.I,
)
_MEMORY_WRITE = re.compile(
    r"\b(remember (?:that|this)?|don'?t forget|keep in mind|note that|"
    r"save this|store this|from now on)\b",
    re.I,
)
_MEMORY_READ = re.compile(
    r"\b(what do you (?:know|remember) about me|do you remember|"
    r"what did i (?:say|tell you)|my (?:goals?|projects?|habits?)\b)",
    re.I,
)
_WEB = re.compile(
    r"\b(latest|current|today'?s|right now|news|price of|stock|weather|"
    r"released|version|who won|score|search (?:for|the web))\b",
    re.I,
)
_CELEBRATION = re.compile(
    r"\b(i (?:finally )?(?:finished|completed|did it|shipped|submitted|passed|"
    r"got the job|got in|cracked|nailed)|"
    r"we (?:won|shipped)|it worked|done!|i'?m done)\b",
    re.I,
)
_FAILURE = re.compile(
    r"\b(i failed|didn'?t (?:work|happen|make it)|got rejected|rejected|"
    r"messed up|screwed up|missed (?:the|my) (?:deadline|task|habit)|"
    r"couldn'?t (?:do|finish)|broke my streak|gave up)\b",
    re.I,
)
_PROCRASTINATION = re.compile(
    r"\b(procrastinat|wasted (?:the|my) (?:day|time)|scrolling|"
    r"can'?t (?:start|begin|get started)|keep (?:putting off|delaying)|"
    r"haven'?t started|been avoiding)\w*\b",
    re.I,
)
_DECISION = re.compile(
    r"\b(should i|help me decide|which (?:one|option|should)|"
    r"can'?t decide|option a|or should i|torn between|"
    r"what would you do)\b",
    re.I,
)
_VAGUE_LIFE = re.compile(
    r"\b(what should i do (?:with my life|now)?$|i don'?t know what to do|"
    r"i'?m lost|no idea what to do|feel stuck in life|krishna,? what should i do)\b",
    re.I,
)
_LEARNING = re.compile(
    r"\b(teach me|explain|quiz me|test me|help me (?:learn|understand|study)|"
    r"what is|how does|give me an example|simplify|hint)\b",
    re.I,
)
_GREETING = re.compile(
    r"^\s*(hi|hey|hello|yo|namaste|radhe radhe|good morning|good evening|"
    r"morning|kaise ho|kya haal)\b",
    re.I,
)
_DISTRESS = re.compile(
    r"\b(kill myself|end my life|suicide|suicidal|want to die|"
    r"self\s?harm|hurt myself|no reason to live|can'?t go on)\b",
    re.I,
)
_HIGH_STAKES = re.compile(
    r"\b(diagnos|symptom|prescription|medication|dosage|chest pain|"
    r"lawsuit|legal|attorney|lawyer|court|sue|"
    r"invest|stocks?|mutual fund|loan|tax|crypto|portfolio)\w*\b",
    re.I,
)

_EMOTIONS: list[tuple[str, re.Pattern[str]]] = [
    ("distressed", _DISTRESS),
    ("celebrating", _CELEBRATION),
    ("frustrated", re.compile(r"\b(frustrat|annoy|irritat|fed up|so done|"
                              r"angry|furious|pissed|hate this)\w*\b", re.I)),
    ("anxious", re.compile(r"\b(anxious|anxiety|nervous|scared|afraid|"
                           r"worried|panic|terrified|dreading)\w*\b", re.I)),
    ("sad", re.compile(r"\b(sad|down|low|depress|crying|cried|heartbroken|"
                       r"lonely|empty|hopeless)\w*\b", re.I)),
    ("tired", re.compile(r"\b(tired|exhaust|drained|burnt? out|no energy|"
                         r"sleepy|thak gaya|thaka)\w*\b", re.I)),
    ("stressed", re.compile(r"\b(stress|overwhelm|too much|pressure|"
                            r"can'?t cope|drowning|swamped)\w*\b", re.I)),
    ("confused", re.compile(r"\b(confus|don'?t understand|unclear|lost|"
                            r"no idea|puzzl)\w*\b", re.I)),
    ("motivated", re.compile(r"\b(motivated|excited|pumped|ready|let'?s go|"
                             r"energi[sz]ed)\b", re.I)),
    ("happy", re.compile(r"\b(happy|glad|great day|feeling good|joyful|"
                         r"grateful)\b", re.I)),
]

# Ordered: the first match wins, so specific intents beat generic ones.
_INTENTS: list[tuple[str, re.Pattern[str]]] = [
    ("crisis_support", _DISTRESS),
    ("gita_question", _SCRIPTURE),
    ("celebration", _CELEBRATION),
    ("failure_recovery", _FAILURE),
    ("procrastination", _PROCRASTINATION),
    ("timer", _TIMER),
    ("task_management", _TASK_VERBS),
    ("daily_planning", _PLANNING),
    ("weekly_review", _REVIEW),
    ("memory_write", _MEMORY_WRITE),
    ("memory_read", _MEMORY_READ),
    ("goal_setting", _GOAL_SETTING),
    ("habit_tracking", _HABIT_TRACKING),
    ("decision_support", _DECISION),
    ("vague_life_question", _VAGUE_LIFE),
    ("web_lookup", _WEB),
    ("technical_help", _TECHNICAL),
    ("learning", _LEARNING),
    ("greeting", _GREETING),
]

# Intents where Gita wisdom genuinely adds value (Part 51). Everything else
# gets no retrieval at all — including technical_help, which is the exact
# case the spec calls out.
_GITA_INTENTS = {
    "gita_question", "vague_life_question", "failure_recovery",
    "guidance", "emotional_support", "procrastination", "decision_support",
}
_GITA_EMOTIONS = {"anxious", "sad", "frustrated", "stressed", "confused"}

_MOTIVATION_INTENTS = {"procrastination", "failure_recovery", "motivation"}

# Turns where Madhav's answer is better for knowing what the user actually has
# on their plate. Everything else gets no productivity context at all — the
# same discipline that keeps a Python question free of scripture (Part 51).
_PRODUCTIVITY_INTENTS = {
    "task_management", "daily_planning", "weekly_review", "goal_setting",
    "habit_tracking", "timer", "procrastination", "celebration",
    "failure_recovery", "motivation",
}


@dataclass
class Classification:
    """The structured read on one user message (Part 50)."""

    intent: str = "conversation"
    emotion: str = "neutral"
    mode: str = "friend"
    urgency: str = "normal"                    # low | normal | high | crisis
    needs_gita: bool = False
    needs_memory: bool = False
    needs_web: bool = False
    needs_task: bool = False
    needs_timer: bool = False
    needs_tool: bool = False
    needs_motivation: bool = False
    needs_productivity: bool = False
    gita_reference: Optional[tuple[int, int]] = None
    gita_reference_valid: Optional[bool] = None
    gita_query: Optional[str] = None
    is_technical: bool = False
    is_high_stakes: bool = False
    safety_flags: list[str] = field(default_factory=list)

    def as_dict(self) -> dict[str, Any]:
        d = asdict(self)
        # camelCase aliases so the shape matches the spec's example payload
        d.update({
            "needsGita": self.needs_gita,
            "needsMemory": self.needs_memory,
            "needsTool": self.needs_tool,
            "needsWeb": self.needs_web,
            "needsProductivity": self.needs_productivity,
        })
        if self.gita_reference:
            d["gita_reference"] = {
                "chapter": self.gita_reference[0], "verse": self.gita_reference[1],
                "valid": self.gita_reference_valid,
            }
        return d


def classify(
    message: str,
    mode: Optional[str] = None,
    history_len: int = 0,
) -> Classification:
    """Classify one user message. Pure function — no I/O, works offline."""
    text = (message or "").strip()
    lowered = text.lower()
    from krishna.modes import DEFAULT_MODE, resolve_mode

    active_mode = resolve_mode(mode).id
    c = Classification(mode=active_mode)

    if not text:
        return c

    # Emotion — first match wins, ordered most-urgent first
    for name, pattern in _EMOTIONS:
        if pattern.search(text):
            c.emotion = name
            break

    # Intent
    for name, pattern in _INTENTS:
        if pattern.search(text):
            c.intent = name
            break
    else:
        if c.emotion in {"anxious", "sad", "stressed", "tired", "frustrated", "confused"}:
            c.intent = "emotional_support"
        elif "?" in text:
            c.intent = "guidance"

    c.is_technical = bool(_TECHNICAL.search(text))
    c.is_high_stakes = bool(_HIGH_STAKES.search(text))

    # Safety (Part 54)
    if _DISTRESS.search(text):
        c.safety_flags.append("emotional_distress")
        c.urgency = "crisis"
        c.intent = "crisis_support"
        c.emotion = "distressed"
    if c.is_high_stakes:
        c.safety_flags.append("high_stakes_topic")

    # Explicit scripture reference
    ref = parse_reference(text) if _SCRIPTURE.search(text) or re.search(r"\d\s*[.:]\s*\d", text) else None
    if ref and ref[1] is not None and (_SCRIPTURE.search(text) or c.intent == "gita_question"):
        c.gita_reference = (ref[0], ref[1])
        c.gita_reference_valid = validate_reference(ref[0], ref[1]).valid
        c.intent = "gita_question"

    # ── Retrieval decisions ──────────────────────────────────────────────
    mode_obj = resolve_mode(active_mode)
    appetite = mode_obj.gita_appetite

    if appetite == "never":
        c.needs_gita = False
    elif appetite == "primary":
        c.needs_gita = True
    else:
        wants = c.intent in _GITA_INTENTS or bool(_SPIRITUAL_TOPIC.search(text))
        if appetite == "prefer":
            wants = wants or c.emotion in _GITA_EMOTIONS
        # Part 51: a technical question does not get a Gita lecture, even if
        # the person is frustrated about it. Same for medical/legal/financial
        # questions — those need caution and a professional, not a verse.
        if (c.is_technical or c.is_high_stakes) and c.intent != "gita_question":
            wants = False
        c.needs_gita = wants

    if c.needs_gita:
        c.gita_query = text if c.gita_reference is None else f"{c.gita_reference[0]}.{c.gita_reference[1]}"

    c.needs_task = c.intent in {"task_management", "daily_planning", "weekly_review"}
    c.needs_productivity = (
        c.intent in _PRODUCTIVITY_INTENTS
        or (c.emotion in {"stressed", "tired"} and not c.is_technical)
    )
    c.needs_timer = c.intent == "timer"
    c.needs_web = c.intent == "web_lookup" and not c.is_technical
    c.needs_memory = c.intent in {"memory_read", "memory_write"} or history_len == 0
    c.needs_motivation = c.intent in _MOTIVATION_INTENTS or (
        c.emotion in {"sad", "frustrated", "tired"} and c.intent == "emotional_support"
    )
    c.needs_tool = any([c.needs_gita, c.needs_task, c.needs_timer, c.needs_web,
                        c.needs_productivity,
                        c.intent in {"memory_read", "memory_write"}])

    if c.urgency != "crisis":
        if c.intent in {"timer", "task_management"}:
            c.urgency = "high"
        elif c.intent in {"greeting", "conversation"}:
            c.urgency = "low"

    return c
