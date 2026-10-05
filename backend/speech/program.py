"""
Speech-training program: a seed (the bundled default or an imported JSON) plus the
learner's edits and AI-generated lessons, persisted in ~/.hamsterdesk/speech_program.json.

Store layout
  lessons       every lesson by id — program days, sub-lessons and standalone lessons
  order         program day ids in sequence; "Day N" is a day's position in this list
  sublessons    day id -> ordered sub-lesson ids
  standalone    ordered standalone lesson ids
  seed_lessons  pristine copies of seed lessons, for "revert to original"
  targets       the learner's personal scoring targets (from the seed persona)

Ids are stable (seed days "d1".."dN", generated lessons "g-…"), so inserting a day or
importing a new seed never breaks the sessions that reference a lesson.
"""
import copy
import json
import re
import threading
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from pydantic import BaseModel, field_validator

from config_manager import CONFIG_DIR

DEFAULT_SEED = Path(__file__).with_name("seed_program.json")
STORE_FILE = CONFIG_DIR / "speech_program.json"
_lock = threading.RLock()

FOCUS_PARAMS = (
    "pace", "fillers", "hedging", "passive", "runOn", "pitch", "pitchVariation", "upspeak",
    "resonance", "hnr", "jitterShimmer", "vocalFry", "energy", "sentenceEndDrop", "sentiment",
    "intent", "landing", "pauses", "anchorDrop", "stamina", "pressure",
)
# The parts of a lesson the AI may generate or revise (in display order).
CONTENT_FIELDS = (
    "title", "objective", "warmUp", "prompt", "exampleScript", "focusLabel", "focus",
    "durationMins", "successCriteria", "steps", "sayInstead", "vocabulary", "tips", "notes",
    "challengeQuestions", "benchmark",
)
MAX_DURATION_MINS = 60

# Scoring targets used when the program doesn't set its own (see thresholds()).
DEFAULT_TARGETS: Dict = {
    "f0_range": [85.0, 180.0],
    "pitch_drop_pct": [10.0, 15.0],          # vs the Day 1 baseline
    "wpm_range": [130.0, 160.0],
    "pauses_per_min": [1.5, 6.0],             # deliberate 0.6-2.5 s pauses
    "avg_sentence_words_max": 18.0,
    "run_on_words": 35,
    "filler_pct_max": 2.0,
    "filler_words": [],                        # extra words/phrases to flag
    "hedge_pct_max": 5.0,
    "hedge_replacements": [],                  # e.g. [["I think", "My view is"]]
    "passive_pct_max": 30.0,
    "landing_pct_min": 85.0,
    "hnr_min_db": 20.0,
    "jitter_max_pct": 1.0,
    "shimmer_max_db": 3.0,
    "fatigue_minutes": 45,
    "pressure_latency_sec": [1.0, 2.5],
    "pressure_pace_drop_pct": 5.0,
    "pressure_pitch_drop_pct": [5.0, 15.0],
    "pressure_wpm_range": None,                # absolute pace under challenge, when a lesson sets one
}

_FOCUS_SYNONYMS = {
    "filler": "fillers", "fillerwords": "fillers", "hedge": "hedging", "hedges": "hedging",
    "passivevoice": "passive", "activevoice": "passive", "runon": "runOn", "runons": "runOn",
    "sentencelength": "runOn", "variation": "pitchVariation", "monotone": "pitchVariation",
    "intonation": "pitchVariation", "tonalpattern": "pitchVariation", "f0": "pitch",
    "baselinepitch": "pitch", "pitchfloor": "pitch", "chest": "resonance", "chestvoice": "resonance",
    "chestresonance": "resonance", "jitter": "jitterShimmer", "shimmer": "jitterShimmer",
    "steadiness": "jitterShimmer", "fry": "vocalFry", "volume": "energy", "emphasis": "energy",
    "trailingoff": "sentenceEndDrop", "endings": "sentenceEndDrop", "tone": "sentiment",
    "wpm": "pace", "speed": "pace", "firmlanding": "landing", "landings": "landing",
    "pause": "pauses", "deliberatepause": "pauses", "silence": "pauses", "anchor": "anchorDrop",
    "anchordrops": "anchorDrop", "fatigue": "stamina", "endurance": "stamina",
    "challenge": "pressure", "pressureresponse": "pressure", "qa": "pressure",
}
_FOCUS_LOOKUP = {re.sub(r"[^a-z0-9]", "", p.lower()): p for p in FOCUS_PARAMS}
_FOCUS_LOOKUP.update(_FOCUS_SYNONYMS)

# Free-text focus descriptions ("Pace — Words Per Minute", "Upspeak detection + sentence-end
# energy drop", …) -> measured parameters, by keyword.
_FOCUS_KEYWORDS = (
    (r"\bf0\b|fundamental frequency|pitch floor|baseline pitch|^pitch\b|\bpitch\s*[—-]", "pitch"),
    (r"pitch variation|monotone|\brise\b|wave pattern|tonal", "pitchVariation"),
    (r"upspeak", "upspeak"),
    (r"energy drop|trailing|trail off", "sentenceEndDrop"),
    (r"sentence-end pitch|landing|ends? at (?:the )?same pitch", "landing"),
    (r"\bpause", "pauses"),
    (r"anchor|downward shift before", "anchorDrop"),
    (r"\bpace\b|\bwpm\b|words per minute", "pace"),
    (r"filler", "fillers"),
    (r"hedg", "hedging"),
    (r"sentence length|run-on|over-explain", "runOn"),
    (r"\bhnr\b|breath", "hnr"),
    (r"fatigue|stamina|long-form|\d+\+ minutes", "stamina"),
    (r"pressure|challenge|hard question", "pressure"),
    (r"\btone\b", "sentiment"),
    (r"resonance|chest", "resonance"),
    (r"passive|active voice", "passive"),
    (r"all tonal", "anchorDrop"), (r"all tonal", "landing"), (r"all tonal", "pauses"),
)


def _focus_key(raw: str) -> Optional[str]:
    return _FOCUS_LOOKUP.get(re.sub(r"[^a-z0-9]", "", raw.lower()))


def focus_from_text(text: str) -> List[str]:
    low = (text or "").lower()
    out: List[str] = []
    for pattern, key in _FOCUS_KEYWORDS:
        if re.search(pattern, low) and key not in out:
            out.append(key)
    return out


def _to_int(value) -> Optional[int]:
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)):
        return int(round(value))
    nums = re.findall(r"\d+(?:\.\d+)?", str(value))
    # "2–5 mins" -> 5: a range describes the session, so plan for its upper end.
    return int(round(max(float(n) for n in nums))) if nums else None


def _humanize(key: str) -> str:
    words = re.sub(r"([a-z])([A-Z])", r"\1 \2", key).replace("_", " ").strip().split()
    return " ".join([words[0].capitalize()] + [w if w.isupper() else w.lower() for w in words[1:]]) if words else key


class LessonStep(BaseModel):
    title: str = ""
    instruction: str
    durationSec: Optional[int] = None


class LessonNote(BaseModel):
    label: str = "Note"
    text: str


class SayInstead(BaseModel):
    said: str
    instead: str


class VocabPair(BaseModel):
    plain: str
    executive: str


def _as_list(v) -> list:
    return v if isinstance(v, list) else [v] if v else []


def _pair(item, left_keys, right_keys):
    if not isinstance(item, dict):
        return None
    left = next((str(item[k]).strip() for k in left_keys if item.get(k)), "")
    right = next((str(item[k]).strip() for k in right_keys if item.get(k)), "")
    return (left, right) if left and right else None


class LessonContent(BaseModel):
    """The editable body of a lesson — what the AI generates and revises."""

    title: str
    objective: str = ""
    warmUp: str = ""
    prompt: str
    exampleScript: str = ""
    focusLabel: str = ""
    focus: List[str] = []
    durationMins: int = 3
    successCriteria: str = ""
    steps: List[LessonStep] = []
    sayInstead: List[SayInstead] = []
    vocabulary: List[VocabPair] = []
    tips: List[str] = []
    notes: List[LessonNote] = []
    challengeQuestions: List[str] = []
    benchmark: str = ""

    @field_validator("title", "prompt")
    @classmethod
    def _required(cls, v: str) -> str:
        v = (v or "").strip()
        if not v:
            raise ValueError("must not be empty")
        return v

    @field_validator("objective", "warmUp", "exampleScript", "focusLabel", "successCriteria", "benchmark", mode="before")
    @classmethod
    def _text(cls, v) -> str:
        if isinstance(v, list):
            v = " ".join(str(x) for x in v)
        return str(v or "").strip()

    @field_validator("focus", mode="before")
    @classmethod
    def _focus(cls, v) -> List[str]:
        items = v if isinstance(v, list) else re.split(r"[,/+]", str(v)) if v else []
        out: List[str] = []
        for item in items:
            key = _focus_key(str(item))
            if key and key not in out:
                out.append(key)
        return out

    @field_validator("durationMins", mode="before")
    @classmethod
    def _duration(cls, v) -> int:
        n = _to_int(v) or 3
        return max(1, min(MAX_DURATION_MINS, n))

    @field_validator("tips", "challengeQuestions", mode="before")
    @classmethod
    def _strings(cls, v) -> List[str]:
        return [str(s).strip() for s in _as_list(v) if str(s).strip()][:12]

    @field_validator("steps", mode="before")
    @classmethod
    def _steps(cls, v) -> List[dict]:
        out = []
        for s in _as_list(v)[:12]:
            if isinstance(s, str):
                s = {"instruction": s}
            if not isinstance(s, dict):
                continue
            text = str(s.get("instruction") or s.get("text") or s.get("description") or "").strip()
            if text:
                out.append({
                    "title": str(s.get("title") or s.get("name") or "").strip(),
                    "instruction": text,
                    "durationSec": _to_int(s.get("durationSec", s.get("duration_sec", s.get("seconds")))),
                })
        return out

    @field_validator("sayInstead", mode="before")
    @classmethod
    def _say_instead(cls, v) -> List[dict]:
        out = []
        for item in _as_list(v)[:12]:
            pair = _pair(item, ("said", "you_say", "youSay", "instead_of", "before", "plain"),
                         ("instead", "say_instead", "sayInstead", "try", "better", "after"))
            if pair:
                out.append({"said": pair[0], "instead": pair[1]})
        return out

    @field_validator("vocabulary", mode="before")
    @classmethod
    def _vocabulary(cls, v) -> List[dict]:
        out = []
        for item in _as_list(v)[:24]:
            pair = _pair(item, ("plain", "term", "instead_of", "from"), ("executive", "use", "better", "to"))
            if pair:
                out.append({"plain": pair[0], "executive": pair[1]})
        return out

    @field_validator("notes", mode="before")
    @classmethod
    def _notes(cls, v) -> List[dict]:
        out = []
        for item in _as_list(v)[:8]:
            if isinstance(item, str) and item.strip():
                out.append({"label": "Note", "text": item.strip()})
            elif isinstance(item, dict) and str(item.get("text") or "").strip():
                out.append({"label": str(item.get("label") or "Note").strip(), "text": str(item["text"]).strip()})
        return out


def clean_content(data: dict) -> dict:
    """Validate + normalise lesson content (raises pydantic.ValidationError)."""
    return LessonContent(**{k: data[k] for k in CONTENT_FIELDS if k in data}).model_dump()


# ── Seed normalisation (camelCase, snake_case, nested weeks, common synonyms) ──

_ALIASES = {
    "title": ("title", "name", "lesson_title", "lessonTitle", "day_title", "dayTitle"),
    "objective": ("objective", "goal", "aim", "purpose"),
    "warmUp": ("warmUp", "warm_up", "warmup"),
    "prompt": ("prompt", "exercise_prompt", "exercisePrompt", "exercise", "instructions",
               "instruction", "task", "drill", "practice"),
    "exampleScript": ("exampleScript", "example_script", "script", "example"),
    "focusLabel": ("focusLabel", "focus_label", "focus_parameter", "focusParameter", "target",
                   "targetLabel", "target_label", "parameter_focus", "parameterFocus", "todayFocus", "today_focus"),
    "focus": ("focus", "parameters", "focus_params", "focusParams", "target_parameters",
              "targetParameters", "metrics"),
    "durationMins": ("durationMins", "duration_mins", "duration_minutes", "durationMinutes", "duration",
                     "minutes", "estimated_duration", "estimatedDuration", "estimatedDurationMins"),
    "successCriteria": ("successCriteria", "success_criteria", "scoring_target", "scoringTarget", "success",
                        "pass_criteria", "passCriteria", "criteria"),
    "steps": ("steps", "drills", "exercises", "sequence"),
    "sayInstead": ("sayInstead", "say_instead", "say_this_instead", "rewrites"),
    "vocabulary": ("vocabulary", "vocabulary_guide", "vocabularyGuide", "glossary", "vocab"),
    "tips": ("tips", "coaching_tips", "coachingTips", "cues"),
    "challengeQuestions": ("challengeQuestions", "challenge_questions", "board_questions", "boardQuestions",
                           "investor_questions", "pressure_questions", "pressureQuestions", "questions"),
    "benchmark": ("benchmark", "benchmark_note", "benchmarkNote"),
}
_SUBLESSON_KEYS = ("sublessons", "sub_lessons", "subLessons", "lessons", "children")
_NOTE_KEY = re.compile(r"(?:_note|Note)$")


def _pick(raw: dict, field: str):
    for key in _ALIASES[field]:
        if key in raw and raw[key] not in (None, "", []):
            return raw[key]
    return None


def _content_from_raw(raw: dict) -> dict:
    data = {f: _pick(raw, f) for f in CONTENT_FIELDS if f in _ALIASES}
    data = {k: v for k, v in data.items() if v is not None}
    notes = [{"label": _humanize(k).title(), "text": v} for k, v in raw.items()
             if _NOTE_KEY.search(k) and k not in _ALIASES["benchmark"] and isinstance(v, str) and v.strip()]
    data["notes"] = notes + _as_list(raw.get("notes"))
    if isinstance(data.get("focusLabel"), list):
        data["focusLabel"] = ", ".join(map(str, data["focusLabel"]))
    if "prompt" not in data and data.get("steps"):
        data["prompt"] = " ".join(s if isinstance(s, str) else str(s.get("instruction") or s.get("text") or "")
                                  for s in _as_list(data["steps"]))
    content = clean_content(data)
    if not content["focus"]:
        content["focus"] = focus_from_text(f"{content['focusLabel']} {content['successCriteria']}")
    if not content["focusLabel"] and content["focus"]:
        content["focusLabel"] = "Today: " + ", ".join(content["focus"])
    return content


def _range(text: str) -> Optional[List[float]]:
    m = re.search(r"(\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*(\d+(?:\.\d+)?)", text)
    return [float(m.group(1)), float(m.group(2))] if m else None


def _first_number(text: str) -> Optional[float]:
    m = re.search(r"(\d+(?:\.\d+)?)", text)
    return float(m.group(1)) if m else None


def _filler_list(text: str) -> List[str]:
    m = re.search(r"flag:\s*([^—–\n;.]+)", text, flags=re.I)  # the list ends at a dash / full stop
    if not m:
        return []
    return [w.strip().strip(".").lower() for w in re.split(r",|\bor\b", m.group(1)) if w.strip().strip(".")]


def _targets_from_persona(persona: dict, signature: dict) -> Dict:
    """Personal scoring targets from the persona's free-text targets and the tonal signature."""
    out: Dict = {}
    raw = persona.get("pitch_targets") or persona.get("targets") or {}
    for key, value in (raw.items() if isinstance(raw, dict) else []):
        k, s = key.lower(), str(value)
        low = s.lower()
        if "hz" in low or k.startswith("baseline") or "f0" in k:
            if _range(s):
                out["f0_range"] = _range(s)
            drop = re.search(r"(\d+)\s*[-–]\s*(\d+)\s*%\s*lower", low)
            if drop:
                out["pitch_drop_pct"] = [float(drop.group(1)), float(drop.group(2))]
        elif "wpm" in low or "pace" in k:
            if _range(s):
                out["wpm_range"] = _range(s)
        elif "pause" in k:
            m = re.search(r"(\d+)\s*[-–]\s*(\d+)\s*(?:\w+\s+)?pauses?\s+per\s+(\d+)\s*min", low)
            if m:
                per = float(m.group(3))
                out["pauses_per_min"] = [float(m.group(1)) / per, float(m.group(2)) / per]
        elif "sentence" in k:
            n = _first_number(s)
            if n:
                out["avg_sentence_words_max"] = n
                out["run_on_words"] = int(max(20, round(n * 2)))
        elif "filler" in k:
            pct = re.search(r"(\d+(?:\.\d+)?)\s*%", s)
            if pct:
                out["filler_pct_max"] = float(pct.group(1))
            words = _filler_list(s)
            if words:
                out["filler_words"] = words
        elif "hedg" in k:
            out["hedge_pct_max"] = 0.0 if "zero" in low or low.startswith("0") else (_first_number(s) or 5.0)
            swap = re.search(r"replace\s+(.+?)\s+with\s+(.+?)\s*(?:$|[.;—–])", s, flags=re.I)
            if swap:
                out["hedge_replacements"] = [[swap.group(1).strip("'\" "), swap.group(2).strip("'\" ")]]
        elif "fatigue" in k or "stamina" in k:
            n = _first_number(s)
            if n:
                out["fatigue_minutes"] = int(n)
    for move in (signature or {}).get("moves", []) if isinstance(signature, dict) else []:
        desc = f"{move.get('name', '')} {move.get('description', '')}".lower()
        if "pressure" in desc or "challenged" in desc:
            pace = re.search(r"slow down\s*(\d+)\s*%", desc)
            pitch = re.search(r"drop pitch\s*(\d+)\s*[-–]\s*(\d+)\s*%", desc)
            if pace:
                out["pressure_pace_drop_pct"] = float(pace.group(1))
            if pitch:
                out["pressure_pitch_drop_pct"] = [float(pitch.group(1)), float(pitch.group(2))]
    return out


def lesson_overrides(text: str) -> Dict:
    """Targets a lesson's own success criteria spell out ("100-130 WPM", "6 pauses per 2 minutes" …)."""
    low = (text or "").lower()
    out: Dict = {}
    wpm = (re.search(r"(\d+)\s*(?:-|–|to)\s*(\d+)\s*wpm", low)
           or re.search(r"wpm[^.\d]*?(\d+)\s*(?:-|–|to)\s*(\d+)", low))  # "WPM drops to 90-110"
    if wpm:
        key = "pressure_wpm_range" if re.search(r"pressure|challenge", low) else "wpm_range"
        out[key] = [float(wpm.group(1)), float(wpm.group(2))]
    f0 = re.search(r"(\d+)\s*(?:-|–|to)\s*(\d+)\s*hz", low)
    if f0:
        out["f0_range"] = [float(f0.group(1)), float(f0.group(2))]
    pauses = re.search(r"(?:minimum|at least)\s*(\d+)\s*(?:\w+\s+){0,2}pauses?\s+per\s+(\d+)[-\s]*min", low)
    if pauses:
        per_min = float(pauses.group(1)) / float(pauses.group(2))
        out["pauses_per_min"] = [per_min, max(per_min * 1.6, per_min + 1.0)]
    avg = re.search(r"average sentence(?: length)? (?:under|below|<)\s*(\d+)\s*words", low)
    if avg:
        out["avg_sentence_words_max"] = float(avg.group(1))
    run_on = re.search(r"(?:zero|no) sentences (?:over|above|longer than)\s*(\d+)\s*words", low)
    if run_on:
        out["run_on_words"] = int(run_on.group(1))
    hnr = re.search(r"hnr[^.\d]*?(?:above|over|>)\s*(\d+(?:\.\d+)?)\s*db", low)
    if hnr:
        out["hnr_min_db"] = float(hnr.group(1))
    filler = re.search(r"(?:below|under|<)\s*(\d+(?:\.\d+)?)\s*%\s*filler|filler[^.]*?(?:below|under|<)\s*(\d+(?:\.\d+)?)\s*%", low)
    if filler:
        out["filler_pct_max"] = float(filler.group(1) or filler.group(2))
    words = _filler_list(text or "")
    if words:
        out["filler_words"] = words
    if re.search(r"zero hedging|no hedging", low):
        out["hedge_pct_max"] = 0.0
    return out


def _benchmark_links(days: List[dict]) -> Dict[str, List[str]]:
    """Which days compare against which: "Compare to Day 7" / "compare at Day 14, Day 21, Day 30".

    Day numbers are the seed's own ("day": 14), so references survive a seed listing days out of order.
    """
    ids = {d["num"]: d["id"] for d in days}
    order = [d["id"] for d in days]
    links: Dict[str, set] = {}
    for d in days:
        text = (d.get("benchmark") or "").lower()
        if not text:
            continue
        direct = re.search(r"compared? (?:to|with|against)\s*day\s*(\d+)", text)
        if direct and int(direct.group(1)) in ids:
            links.setdefault(d["id"], set()).add(ids[int(direct.group(1))])
            continue
        for n in (int(x) for x in re.findall(r"day\s*(\d+)", text)):
            if n != d["num"] and n in ids:  # this day is the reference point for the days it names
                links.setdefault(ids[n], set()).add(d["id"])
    return {k: sorted(v, key=order.index) for k, v in links.items()}


def _coach_context(raw: dict) -> str:
    parts: List[str] = []
    for key in ("coach_context", "coachContext", "diagnosis", "context"):
        if isinstance(raw.get(key), str) and raw[key].strip():
            parts.append(raw[key].strip())
    if isinstance(raw.get("description"), str):
        parts.append(raw["description"].strip())
    persona = raw.get("persona") or raw.get("profile")
    if isinstance(persona, str):
        parts.append(persona)
    elif isinstance(persona, dict):
        for key, value in persona.items():
            if isinstance(value, dict):
                parts.append(f"{_humanize(key)}: " + "; ".join(f"{_humanize(k)}: {v}" for k, v in value.items()))
            elif isinstance(value, list):
                parts.append(f"{_humanize(key)}: " + "; ".join(map(str, value)))
            elif value:
                parts.append(f"{_humanize(key)}: {value}")
    signature = raw.get("tonal_signature") or raw.get("tonalSignature")
    if isinstance(signature, dict):
        moves = "; ".join(f"({m.get('move', i + 1)}) {m.get('name', '')} — {m.get('description', '')}"
                          for i, m in enumerate(signature.get("moves", [])) if isinstance(m, dict))
        parts.append(f"{signature.get('name', 'Tonal signature')}: {moves}")
    return "\n".join(p for p in parts if p)


def normalize_seed(raw) -> dict:
    """Turn a seed JSON (any reasonable shape) into {title, description, coach_context, targets, weeks, days}."""
    if isinstance(raw, list):
        raw = {"days": raw}
    if not isinstance(raw, dict):
        raise ValueError("The seed must be a JSON object or a list of days.")
    if isinstance(raw.get("program"), dict):
        raw = {**raw["program"], **{k: v for k, v in raw.items() if k != "program"}}

    weeks_raw = raw.get("weeks") if isinstance(raw.get("weeks"), list) else []
    days_raw = next((raw[k] for k in ("days", "schedule", "plan") if isinstance(raw.get(k), list)), None)
    week_of: List[Optional[int]] = []
    if days_raw is None:
        if not any(isinstance(w, dict) and isinstance(w.get("days"), list) for w in weeks_raw):
            raise ValueError('The seed needs a "days" list (or weeks with "days").')
        days_raw = []
        for i, w in enumerate(weeks_raw):
            n = _to_int(w.get("week") or w.get("number")) or i + 1
            for d in w.get("days") or []:
                days_raw.append(d)
                week_of.append(n)
    if not days_raw:
        raise ValueError("The seed has no days.")

    days, seen = [], set()
    week_titles: Dict[int, str] = {}
    for i, d in enumerate(days_raw):
        if not isinstance(d, dict):
            raise ValueError(f"Day {i + 1} is not an object.")
        num = _to_int(d.get("day") or d.get("day_number") or d.get("dayNumber")) or i + 1
        try:
            content = _content_from_raw(d)
        except Exception as exc:
            raise ValueError(f"Day {num}: {exc}") from exc
        day_id = str(d.get("id") or f"d{num}")
        if day_id in seen:
            day_id = f"d{i + 1}" if f"d{i + 1}" not in seen else f"d{i + 1}-{uuid.uuid4().hex[:4]}"
        seen.add(day_id)
        week = (_to_int(d.get("week") or d.get("week_number") or d.get("weekNumber"))
                or (week_of[i] if i < len(week_of) else None) or (i // 7) + 1)
        title_hint = d.get("week_title") or d.get("weekTitle") or d.get("week_theme") or d.get("weekTheme")
        if title_hint:
            week_titles.setdefault(week, str(title_hint))
        subs = []
        for k, s in enumerate(next((d[key] for key in _SUBLESSON_KEYS if isinstance(d.get(key), list)), [])):
            if isinstance(s, dict):
                try:
                    subs.append({**_content_from_raw(s), "id": str(s.get("id") or f"{day_id}-s{k + 1}")})
                except Exception as exc:
                    raise ValueError(f"Day {i + 1}, sub-lesson {k + 1}: {exc}") from exc
        flag = d.get("weeklySummary", d.get("weekly_summary"))
        days.append({**content, "id": day_id, "num": num, "week": week, "weeklySummary": bool(flag), "sublessons": subs})

    links = _benchmark_links(days)
    for d in days:
        d["compareTo"] = links.get(d["id"], [])
        d.pop("num", None)

    weeks = []
    for w in weeks_raw:
        if isinstance(w, dict):
            n = _to_int(w.get("week") or w.get("number") or w.get("id"))
            if n:
                title = str(w.get("title") or w.get("theme") or w.get("name") or f"Week {n}")
                subtitle = str(w.get("subtitle") or "")
                weeks.append({
                    "week": n,
                    "title": title,
                    "subtitle": subtitle,
                    "summary": str(w.get("summary") or w.get("focus_summary") or w.get("focusSummary")
                                   or w.get("description") or w.get("focus") or ""),
                })
    known = {w["week"] for w in weeks}
    for n in sorted({d["week"] for d in days} - known):
        weeks.append({"week": n, "title": week_titles.get(n, f"Week {n}"), "subtitle": "", "summary": ""})
    weeks.sort(key=lambda w: w["week"])

    persona = raw.get("persona") if isinstance(raw.get("persona"), dict) else {}
    signature = raw.get("tonal_signature") if isinstance(raw.get("tonal_signature"), dict) else {}
    return {
        "title": str(raw.get("title") or raw.get("name") or "Speech Training Program"),
        "description": str(raw.get("description") or ""),
        "coach_context": _coach_context(raw),
        "targets": {**_targets_from_persona(persona, signature), **(raw.get("targets") if isinstance(raw.get("targets"), dict) else {})},
        "weeks": weeks,
        "days": days,
    }


# ── Store ───────────────────────────────────────────────────────

def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _materialize(seed: dict) -> dict:
    lessons, order, subs, pristine = {}, [], {}, {}
    for d in seed["days"]:
        day = {k: d[k] for k in CONTENT_FIELDS}
        day.update(id=d["id"], kind="day", week=d["week"], weeklySummary=d["weeklySummary"],
                   compareTo=d.get("compareTo", []), parentId=None, source="seed")
        lessons[day["id"]] = day
        pristine[day["id"]] = copy.deepcopy(day)
        order.append(day["id"])
        for s in d["sublessons"]:
            sub = {k: s[k] for k in CONTENT_FIELDS}
            sub.update(id=s["id"], kind="sublesson", parentId=day["id"], source="seed")
            lessons[sub["id"]] = sub
            pristine[sub["id"]] = copy.deepcopy(sub)
            subs.setdefault(day["id"], []).append(sub["id"])
    return {
        "version": 2,
        "title": seed["title"],
        "description": seed.get("description", ""),
        "coach_context": seed["coach_context"],
        "targets": seed.get("targets", {}),
        "weeks": seed["weeks"],
        "lessons": lessons,
        "order": order,
        "sublessons": subs,
        "standalone": [],
        "seed_lessons": pristine,
    }


def _upgrade(store: dict) -> dict:
    """Fill fields added after a store was first written."""
    store.setdefault("description", "")
    store.setdefault("targets", {})
    for lesson in store["lessons"].values():
        for field in CONTENT_FIELDS:
            if field not in lesson:
                lesson[field] = [] if field in ("sayInstead", "vocabulary", "notes", "steps", "tips", "challengeQuestions") else ""
        if lesson["kind"] == "day":
            lesson.setdefault("compareTo", [])
    return store


def _default_store() -> dict:
    return _materialize(normalize_seed(json.loads(DEFAULT_SEED.read_text())))


def _read() -> Optional[dict]:
    if STORE_FILE.exists():
        try:
            return _upgrade(json.loads(STORE_FILE.read_text()))
        except Exception:
            return None
    return None


def _write(store: dict) -> None:
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    tmp = STORE_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(store, ensure_ascii=False))
    tmp.replace(STORE_FILE)


def load() -> dict:
    """The current program store (the bundled default until something is changed)."""
    with _lock:
        return _read() or _default_store()


# ── Queries ─────────────────────────────────────────────────────

def get_lesson(store: dict, lesson_id: Optional[str]) -> Optional[dict]:
    return store["lessons"].get(lesson_id or "")


def day_number(store: dict, day_id: str) -> Optional[int]:
    try:
        return store["order"].index(day_id) + 1
    except ValueError:
        return None


def day_id_at(store: dict, number: int) -> Optional[str]:
    return store["order"][number - 1] if 1 <= number <= len(store["order"]) else None


def summary_day_ids(store: dict) -> set:
    """Seed-flagged weekly-summary days, or the last day of each week if none are flagged."""
    flagged = {d for d in store["order"] if store["lessons"][d].get("weeklySummary")}
    if flagged:
        return flagged
    last: Dict[int, str] = {}
    for d in store["order"]:
        last[store["lessons"][d]["week"]] = d
    return set(last.values())


def lesson_week(store: dict, lesson: dict) -> Optional[int]:
    if lesson["kind"] == "day":
        return lesson.get("week")
    if lesson["kind"] == "sublesson":
        parent = get_lesson(store, lesson.get("parentId"))
        return parent.get("week") if parent else None
    return None


def is_unlocked(store: dict, lesson: dict, completed_day_ids: set) -> bool:
    """Linear progression: a day opens once every earlier day is done; sub-lessons follow their day."""
    if lesson["kind"] == "standalone":
        return True
    day_id = lesson["id"] if lesson["kind"] == "day" else lesson.get("parentId")
    if day_id not in store["order"]:
        return True
    return all(d in completed_day_ids for d in store["order"][: store["order"].index(day_id)])


def program_targets(store: dict) -> Dict:
    return {**copy.deepcopy(DEFAULT_TARGETS), **copy.deepcopy(store.get("targets") or {})}


def thresholds(store: dict, lesson: dict) -> Dict:
    """Effective scoring targets for a lesson: defaults < program persona < the lesson's own criteria."""
    merged = program_targets(store)
    own = {**lesson_overrides(lesson.get("focusLabel", "")), **lesson_overrides(lesson.get("successCriteria", ""))}
    if own.get("filler_words"):
        own["filler_words"] = sorted(set(merged.get("filler_words") or []) | set(own["filler_words"]))
    merged.update(own)
    return merged


def _revertable(store: dict, lesson_id: str) -> bool:
    seed = store["seed_lessons"].get(lesson_id)
    if not seed:
        return False
    current = store["lessons"].get(lesson_id) or {}
    return any(current.get(k) != seed.get(k) for k in CONTENT_FIELDS)


def view(store: dict) -> dict:
    """The program as the UI renders it: numbered days with sub-lessons, plus standalone lessons."""
    summaries = summary_day_ids(store)
    days = []
    for n, did in enumerate(store["order"], start=1):
        day = copy.deepcopy(store["lessons"][did])
        day.update(day=n, weeklySummary=did in summaries, revertable=_revertable(store, did))
        day["compareToDays"] = [day_number(store, x) for x in day.get("compareTo", []) if day_number(store, x)]
        day["sublessons"] = []
        for sid in store["sublessons"].get(did, []):
            if sid in store["lessons"]:
                sub = copy.deepcopy(store["lessons"][sid])
                sub.update(parentDay=n, revertable=_revertable(store, sid))
                day["sublessons"].append(sub)
        days.append(day)
    weeks = {w["week"]: dict(w) for w in store["weeks"]}
    for d in days:
        weeks.setdefault(d["week"], {"week": d["week"], "title": f"Week {d['week']}", "subtitle": "", "summary": ""})
    standalone = [dict(copy.deepcopy(store["lessons"][i]), revertable=False)
                  for i in store["standalone"] if i in store["lessons"]]
    return {
        "title": store["title"],
        "description": store.get("description", ""),
        "coach_context": store["coach_context"],
        "targets": program_targets(store),
        "weeks": [weeks[k] for k in sorted(weeks)],
        "days": days,
        "standalone": standalone,
    }


def outline(store: dict) -> str:
    """Compact program outline used as AI context."""
    themes = {w["week"]: w["title"] for w in store["weeks"]}
    lines = []
    for n, did in enumerate(store["order"], start=1):
        d = store["lessons"][did]
        lines.append(f"Day {n} (Week {d['week']}: {themes.get(d['week'], '')}): {d['title']} — {d['focusLabel']}")
    return "\n".join(lines)


# ── Mutations ───────────────────────────────────────────────────

def add_lesson(content: dict, placement: dict) -> dict:
    """Save new lesson content as a sub-lesson, an inserted program day, or a standalone lesson."""
    content = clean_content(content)
    kind = placement.get("type")
    with _lock:
        store = load()
        lesson = {**content, "id": f"g-{uuid.uuid4().hex[:10]}", "source": "generated",
                  "createdAt": _now(), "updatedAt": _now(), "parentId": None}
        if kind == "sublesson":
            parent_id = placement.get("dayId")
            parent = get_lesson(store, parent_id)
            if not parent or parent["kind"] != "day":
                raise KeyError("That day no longer exists.")
            lesson.update(kind="sublesson", parentId=parent_id)
            store["sublessons"].setdefault(parent_id, []).append(lesson["id"])
        elif kind == "day":
            after = placement.get("afterDayId")
            if after and after not in store["order"]:
                raise KeyError("That day no longer exists.")
            index = store["order"].index(after) + 1 if after else 0
            neighbour = get_lesson(store, after) if after else get_lesson(store, store["order"][0] if store["order"] else None)
            lesson.update(kind="day", week=(neighbour or {}).get("week") or 1, weeklySummary=False, compareTo=[])
            store["order"].insert(index, lesson["id"])
        elif kind == "standalone":
            lesson.update(kind="standalone")
            store["standalone"].append(lesson["id"])
        else:
            raise ValueError("placement.type must be sublesson, day or standalone")
        store["lessons"][lesson["id"]] = lesson
        _write(store)
        return lesson


def update_lesson(lesson_id: str, content: dict) -> dict:
    with _lock:
        store = load()
        lesson = get_lesson(store, lesson_id)
        if not lesson:
            raise KeyError("Lesson not found.")
        merged = clean_content({**{k: lesson[k] for k in CONTENT_FIELDS}, **content})
        lesson.update(merged)
        lesson["updatedAt"] = _now()
        if lesson_id in store["seed_lessons"]:
            lesson["source"] = "edited" if _revertable(store, lesson_id) else "seed"
        _write(store)
        return lesson


def revert_lesson(lesson_id: str) -> dict:
    with _lock:
        store = load()
        seed = store["seed_lessons"].get(lesson_id)
        if not seed or lesson_id not in store["lessons"]:
            raise KeyError("Only lessons from the seed can be reverted.")
        store["lessons"][lesson_id] = copy.deepcopy(seed)
        _write(store)
        return store["lessons"][lesson_id]


def delete_lesson(lesson_id: str) -> None:
    with _lock:
        store = load()
        lesson = get_lesson(store, lesson_id)
        if not lesson:
            raise KeyError("Lesson not found.")
        if lesson["kind"] == "day" and lesson_id in store["seed_lessons"]:
            raise PermissionError("Seed days can't be deleted — modify or revert them instead.")
        if lesson["kind"] == "day":
            store["order"].remove(lesson_id)
            for sid in store["sublessons"].pop(lesson_id, []):
                store["lessons"].pop(sid, None)
        elif lesson["kind"] == "sublesson":
            ids = store["sublessons"].get(lesson.get("parentId"), [])
            if lesson_id in ids:
                ids.remove(lesson_id)
        else:
            store["standalone"].remove(lesson_id)
        store["lessons"].pop(lesson_id, None)
        _write(store)


def import_seed(raw) -> dict:
    """Replace the seed. Generated days, sub-lessons and standalone lessons are kept."""
    seed = normalize_seed(raw)
    with _lock:
        old = load()
        new = _materialize(seed)
        prev = None
        for did in old["order"]:
            if did in new["order"]:
                prev = did
                continue
            lesson = old["lessons"].get(did)
            if lesson and lesson.get("source") == "generated":
                new["lessons"][did] = lesson
                new["order"].insert(new["order"].index(prev) + 1 if prev else 0, did)
                prev = did
        for day_id, ids in old["sublessons"].items():
            for sid in ids:
                sub = old["lessons"].get(sid)
                if not sub or sub.get("source") != "generated":
                    continue
                if day_id in new["lessons"]:
                    new["lessons"][sid] = sub
                    new["sublessons"].setdefault(day_id, []).append(sid)
                else:  # its day is gone — keep it as a standalone lesson
                    new["lessons"][sid] = {**sub, "kind": "standalone", "parentId": None}
                    new["standalone"].append(sid)
        for sid in old["standalone"]:
            if sid in old["lessons"] and sid not in new["lessons"]:
                new["lessons"][sid] = old["lessons"][sid]
                new["standalone"].append(sid)
        _write(_upgrade(new))
        return new


def reset_to_default() -> dict:
    """Back to the bundled program (drops generated lessons and edits; sessions are untouched)."""
    with _lock:
        if STORE_FILE.exists():
            STORE_FILE.unlink()
        return load()
