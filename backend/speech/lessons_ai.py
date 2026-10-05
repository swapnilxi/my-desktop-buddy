"""
AI lesson generation and revision, using the same LLM provider, key and model as chat.

generate_lesson  — a new lesson from the learner's request, shaped for where it will live
revise_lesson    — change the whole lesson, or only the parts the learner selected
"""
import json
import re
from typing import Dict, List, Optional, Sequence, Tuple

from llm.router import generate_with_fallback
from speech.program import CONTENT_FIELDS, FOCUS_PARAMS, clean_content

# Lessons are ~800-2500 tokens of JSON; chat's concise default cap would truncate them.
LESSON_MAX_TOKENS = 3500

SYSTEM_PROMPT = (
    "You are an elite executive voice and speech coach. You design short, practical, measurable "
    "speech-training lessons for one specific learner, and you write them as strict JSON. "
    "Respond with ONE JSON object only — no markdown fences, no commentary before or after it."
)

FIELD_GUIDE = {
    "title": "short lesson name, at most ~8 words",
    "objective": "one sentence: the skill this lesson builds",
    "warmUp": "a 30-60 second warm-up before the exercise (breathing, humming, pitch drop…), or empty",
    "prompt": "the exercise the learner records: exactly what to say, about what, and how to deliver it",
    "exampleScript": "a short model script in the target delivery style ([PAUSE] / [anchor drop] markers welcome), or empty",
    "focusLabel": "the measured focus in plain words, e.g. 'Pace — Words Per Minute (target 100-130 WPM)'",
    "focus": "array of 1-5 measured parameters, chosen ONLY from: " + ", ".join(FOCUS_PARAMS),
    "durationMins": "integer minutes for one recording, 1-60 (most drills 2-5; stamina drills can be 10-45)",
    "successCriteria": "one measurable pass condition the analysis can check, with numbers "
                       "(e.g. '100-130 WPM', 'minimum 6 pauses per 2-minute talk', 'below 1% filler rate')",
    "steps": 'array of 0-5 objects {"title": str, "instruction": str, "durationSec": int} for multi-part drills',
    "sayInstead": 'array of 1-4 {"said": "a weak phrasing this learner tends to use", "instead": "the executive phrasing"}',
    "vocabulary": 'array of {"plain": "plain phrase", "executive": "precise executive term"} — only for '
                  "vocabulary / language lessons, otherwise []",
    "tips": "array of 1-4 short coaching cues",
    "notes": 'array of {"label": "short label", "text": "coaching note"} — e.g. an archetype note or an '
             "accent / language note specific to this learner; may be []",
    "challengeQuestions": "array of 3-5 hard questions the coach asks out loud before recording — ONLY for "
                          "pressure / Q&A / investor-challenge drills; otherwise []",
    "benchmark": "empty, unless this lesson is a benchmark recording to compare against later",
}

MEASURED = (
    "baseline pitch (F0, and its % change vs Day 1), pitch floor, pitch variation in semitones, firm "
    "landings (% of sentences ending at or below their starting pitch), deliberate 1-2 s pauses per "
    "minute, anchor drops (a key point started below baseline pitch after a pause), measured rises that "
    "resolve downward, upspeak, sentence-end energy drops, chest resonance, HNR, jitter/shimmer, vocal "
    "fry, words per minute, filler words, hedging, passive voice, run-on sentences, tone, voice fatigue "
    "across long sessions, and pressure response (pause before answering, pace and pitch vs baseline)"
)

FIELD_LABELS = {
    "title": "Title", "objective": "Objective", "warmUp": "Warm-up", "prompt": "Exercise",
    "exampleScript": "Example script", "focusLabel": "Focus label", "focus": "Measured parameters",
    "durationMins": "Duration", "successCriteria": "Success criteria", "steps": "Steps",
    "sayInstead": "Say this instead", "vocabulary": "Vocabulary guide", "tips": "Coaching tips",
    "notes": "Coaching notes", "challengeQuestions": "Pressure questions", "benchmark": "Benchmark",
}


def extract_json(text: str) -> dict:
    """First complete JSON object in a model reply (tolerates code fences and chatter)."""
    t = re.sub(r"```(?:json)?", "", text or "", flags=re.I)
    start = t.find("{")
    if start < 0:
        raise ValueError("The AI reply contained no JSON object.")
    depth, in_str, esc = 0, False, False
    for i in range(start, len(t)):
        ch = t[i]
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
        elif ch == '"':
            in_str = True
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                data = json.loads(t[start:i + 1])
                if not isinstance(data, dict):
                    raise ValueError("The AI reply was not a JSON object.")
                return data
    raise ValueError("The AI reply was cut off before the JSON ended.")


def _schema(fields: Sequence[str]) -> str:
    return "{\n" + ",\n".join(f'  "{f}": <{FIELD_GUIDE[f]}>' for f in fields) + "\n}"


async def _ask(user_prompt: str, llm: Dict) -> str:
    text, _ = await generate_with_fallback(
        messages=[{"role": "user", "content": user_prompt}],
        system_prompt=SYSTEM_PROMPT,
        temperature=0.7,
        max_tokens=LESSON_MAX_TOKENS,
        **llm,
    )
    return text


async def generate_lesson(
    request: str,
    placement_text: str,
    coach_context: str,
    program_outline: str,
    llm: Dict,
    duration_mins: Optional[int] = None,
    style_reference: Optional[dict] = None,
) -> dict:
    duration_rule = f"durationMins must be {duration_mins}." if duration_mins else ""
    reference = (
        "\n\nSTYLE REFERENCE — an existing lesson from this program. Match its depth, tone and level of "
        "personalisation; do not copy it.\n" + json.dumps(style_reference, ensure_ascii=False, indent=1)
        if style_reference else ""
    )
    prompt = f"""LEARNER CONTEXT
{coach_context or "An executive improving clarity, authority and confident delivery."}

PROGRAM OUTLINE
{program_outline}

WHERE THIS LESSON WILL LIVE
{placement_text}{reference}

WHAT THE LEARNER ASKED FOR
{request}

WHAT THE APP CAN MEASURE IN A RECORDING
{MEASURED}

Write one lesson as a JSON object with exactly these keys:
{_schema(CONTENT_FIELDS)}

Rules: make the exercise concrete and specific to the learner's executive / founder context; choose
"focus" parameters the analysis really measures for this drill; make "successCriteria" checkable
against those measurements; keep the language direct and coach-like. {duration_rule}"""
    return clean_content(extract_json(await _ask(prompt, llm)))


async def revise_lesson(
    lesson: dict,
    instruction: str,
    fields: Optional[List[str]],
    coach_context: str,
    llm: Dict,
) -> Tuple[dict, List[str]]:
    """Returns (revised content, changed field names). Only `fields` may change (all when None)."""
    allowed = [f for f in (fields or CONTENT_FIELDS) if f in CONTENT_FIELDS]
    if not allowed:
        raise ValueError("Pick at least one part of the lesson to change.")
    current = clean_content({k: lesson[k] for k in CONTENT_FIELDS})
    whole = len(allowed) == len(CONTENT_FIELDS)
    scope = (
        "You may rewrite any part of the lesson. Return the complete revised lesson."
        if whole else
        "You may change ONLY these keys: " + ", ".join(allowed) + ". Return a JSON object containing only "
        "those keys that you changed, each with its complete new value. Every other part stays exactly as it is."
    )
    prompt = f"""LEARNER CONTEXT
{coach_context or "An executive improving clarity, authority and confident delivery."}

CURRENT LESSON (JSON)
{json.dumps(current, ensure_ascii=False, indent=2)}

REQUESTED CHANGE
{instruction}

{scope}

Key guide:
{_schema(allowed)}"""
    data = extract_json(await _ask(prompt, llm))
    patch = {k: v for k, v in data.items() if k in allowed}
    if not patch:
        raise ValueError("The AI didn't change any of the selected parts — try a more specific request.")
    revised = clean_content({**current, **patch})
    changed = [k for k in CONTENT_FIELDS if revised[k] != current[k]]
    if not changed:
        raise ValueError("The AI returned the lesson unchanged — try a more specific request.")
    return revised, changed
