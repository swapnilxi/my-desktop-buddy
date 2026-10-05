"""
Speech Training routes.

Sessions
  POST   /speech/analyze               upload a recording for a lesson -> instant feedback, session stored
  GET    /speech/state                 sessions, completed days, streak, weekly summaries, active mode
  DELETE /speech/state                 reset all progress
Program & lessons
  GET    /speech/program               numbered days (with sub-lessons), weeks and standalone lessons
  POST   /speech/program/import        replace the seed with a JSON program (generated lessons are kept)
  POST   /speech/program/reset         back to the bundled program
  POST   /speech/lessons/generate      AI draft of a new lesson (not saved)
  POST   /speech/lessons               save a lesson as a sub-lesson, an inserted day or a standalone lesson
  POST   /speech/lessons/{id}/revise   AI draft of a change to the whole lesson or selected parts (not saved)
  PUT    /speech/lessons/{id}          save edited lesson content
  POST   /speech/lessons/{id}/revert   restore a seed lesson to its original content
  DELETE /speech/lessons/{id}          delete a generated day, a sub-lesson or a standalone lesson

Mode handling (acoustic analysis is identical in both):
  deepgram -> raw audio kept locally, Deepgram (+sentiment/intents) runs in parallel with local acoustics.
  apple    -> Apple on-device transcript (or client fallback transcript), spaCy sentiment, acoustics in parallel.
"""
import asyncio
import json
import math
import os
import statistics
import tempfile
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, Body, File, Form, Header, HTTPException, UploadFile
from pydantic import BaseModel, ValidationError

from config_manager import get_config
from routes.chat import _extract_client_context
from speech import acoustic, apple_stt, deepgram, language, lessons_ai, program, scoring, store

router = APIRouter(prefix="/speech", tags=["speech"])

MIN_WORDS = 10


# ── Weekly summaries ────────────────────────────────────────────

def _weekly_summary(week: int, sessions: List[Dict]) -> Optional[Dict]:
    """Biggest gains vs. the previous reference + the 3 weakest parameters this week."""
    this_week = [s for s in sessions if store.session_week(s) == week]
    if not this_week:
        return None
    earlier_weeks = sorted({store.session_week(s) for s in sessions if (store.session_week(s) or 0) < week})
    if earlier_weeks:
        ref = [s for s in sessions if store.session_week(s) == earlier_weeks[-1]]
        compared_to = f"Week {earlier_weeks[-1]}"
    else:
        # First week: compare against the Day 1 baseline session.
        ref = sessions[:1] if len(this_week) > 1 else []
        compared_to = "Day 1"

    def avg(group: List[Dict]) -> Dict[str, float]:
        out: Dict[str, float] = {}
        for k in scoring.PARAM_LABELS:
            vals = [s["param_scores"][k] for s in group if s["param_scores"].get(k) is not None]
            if vals:
                out[k] = sum(vals) / len(vals)
        return out

    cur, prev = avg(this_week), avg(ref)
    gains = sorted(
        ({"param": k, "label": scoring.PARAM_LABELS[k], "delta": round(cur[k] - prev[k], 1)} for k in cur if k in prev),
        key=lambda x: -x["delta"],
    )
    weakest = sorted(({"param": k, "label": scoring.PARAM_LABELS[k], "score": round(v)} for k, v in cur.items()),
                     key=lambda x: x["score"])[:3]
    presence = [s["scores"]["presence"] for s in this_week]
    return {
        "week": week,
        "generated_at": datetime.now().isoformat(),
        "sessions": len(this_week),
        "avg_presence": round(sum(presence) / len(presence)),
        "compared_to": compared_to,
        "biggest_gains": [g for g in gains if g["delta"] > 0][:3],
        "work_on": weakest,
    }


# ── Baselines for the tonal targets ─────────────────────────────

def _extras(ac: Dict, lang: Dict, sessions: List[Dict], challenge: Optional[str]) -> Dict:
    """Day-1 pitch baseline, pressure-response comparison and tonal consistency."""
    with_pitch = [s for s in sessions if (s.get("acoustic") or {}).get("f0_median_hz")]
    f0 = ac.get("f0_median_hz")
    baseline = with_pitch[0] if with_pitch else None  # sessions are stored chronologically
    change = None
    if baseline and f0:
        b = baseline["acoustic"]["f0_median_hz"]
        change = (f0 - b) / b * 100.0

    pressure = None
    if challenge:
        normal = [s for s in sessions if not s.get("challenge")]
        wpms = [s["language"]["wpm"] for s in normal if (s.get("language") or {}).get("wpm")][-10:]
        pitches = [s["acoustic"]["f0_median_hz"] for s in normal if (s.get("acoustic") or {}).get("f0_median_hz")][-10:]
        base_wpm = statistics.median(wpms) if wpms else None
        base_f0 = statistics.median(pitches) if pitches else None
        wpm = lang.get("wpm")
        pressure = {
            "question": challenge.strip()[:400],
            "latency_sec": ac.get("speech_start_sec"),
            "wpm": wpm,
            "baseline_wpm": base_wpm,
            "pace_change_pct": (wpm - base_wpm) / base_wpm * 100.0 if wpm and base_wpm else None,
            "baseline_f0_hz": base_f0,
            "pitch_change_pct": (f0 - base_f0) / base_f0 * 100.0 if f0 and base_f0 else None,
        }

    consistency = None
    recent = [s["acoustic"]["f0_median_hz"] for s in with_pitch[-4:]] + ([f0] if f0 else [])
    if len(recent) >= 3:
        st = [12.0 * math.log2(v / 100.0) for v in recent]
        consistency = {"sessions": len(recent), "f0_std_st": round(statistics.pstdev(st), 2)}

    return {
        "baseline": ({"session_id": baseline["id"], "created_at": baseline["created_at"],
                      "f0_median_hz": baseline["acoustic"]["f0_median_hz"]} if baseline else None),
        "pitch_change_pct": round(change, 1) if change is not None else None,
        "pressure": pressure,
        "consistency": consistency,
    }


def _benchmark_comparisons(prog: Dict, lesson: Dict, sessions: List[Dict], now: Dict) -> List[Dict]:
    """This session vs the latest session of each day the program says to compare against."""
    out = []
    for ref_id in lesson.get("compareTo") or []:
        ref_lesson = program.get_lesson(prog, ref_id)
        day = program.day_number(prog, ref_id)
        title = ref_lesson["title"] if ref_lesson else "baseline"
        previous = [s for s in sessions if store.session_lesson_id(s) == ref_id]
        if not previous:
            out.append({"lesson_id": ref_id, "day": day, "title": title, "missing": True})
            continue
        ref = previous[-1]
        ra, na = ref.get("acoustic") or {}, now["acoustic"]
        rl, nl = ref.get("language") or {}, now["language"]
        rt, nt = ra.get("tonal") or {}, na.get("tonal") or {}
        out.append({
            "lesson_id": ref_id,
            "day": day,
            "title": title,
            "date": ref["created_at"],
            "scores": {k: now["scores"][k] - ref["scores"][k] for k in ("presence", "confidence", "clarity", "authority")},
            "metrics": [
                {"label": "Speaking pitch", "unit": " Hz", "better": "lower",
                 "before": ra.get("f0_median_hz"), "after": na.get("f0_median_hz")},
                {"label": "Pace", "unit": " WPM", "better": "range", "range": now["thresholds"]["wpm_range"],
                 "before": rl.get("wpm"), "after": nl.get("wpm")},
                {"label": "Firm landings", "unit": "%", "better": "higher",
                 "before": rt.get("landing_pct"), "after": nt.get("landing_pct")},
                {"label": "Deliberate pauses", "unit": "/min", "better": "higher",
                 "before": (rt.get("pauses") or {}).get("deliberate_per_min"), "after": (nt.get("pauses") or {}).get("deliberate_per_min")},
                {"label": "Filler words", "unit": "%", "better": "lower",
                 "before": (rl.get("fillers") or {}).get("pct"), "after": (nl.get("fillers") or {}).get("pct")},
            ],
        })
    return out


def _resolve_deepgram_key(x_deepgram_key: Optional[str]) -> Optional[str]:
    config = get_config()
    return (x_deepgram_key or config.api_keys.deepgram_key
            or os.getenv("DEEPGRAM_API_KEY") or os.getenv("DEEPGRAM_KEY"))


# ── Sessions ────────────────────────────────────────────────────

@router.get("/state")
async def get_state():
    data = store.load()
    sessions = data["sessions"]
    for s in sessions:  # sessions recorded before lessons had ids
        s.setdefault("lesson_id", store.session_lesson_id(s))
        s.setdefault("lesson_kind", store.session_kind(s))
    return {
        "mode": get_config().voice.mode,
        "sessions": sessions,
        "completed_day_ids": sorted(store.completed_day_ids(sessions)),
        "streak": store.streak(sessions),
        "weekly_summaries": data["weekly_summaries"],
    }


@router.delete("/state")
async def reset_state():
    store.reset()
    return {"ok": True}


@router.get("/capabilities")
async def capabilities(x_deepgram_key: Optional[str] = Header(None)):
    mode = get_config().voice.mode
    return {
        "mode": mode,
        "deepgram_key_present": bool(_resolve_deepgram_key(x_deepgram_key)),
        "apple_stt_helper_built": apple_stt.is_built(),
    }


@router.post("/analyze")
async def analyze(
    audio: UploadFile = File(...),
    lesson_id: Optional[str] = Form(None),
    day: Optional[int] = Form(None),          # legacy: day number instead of lesson id
    transcript: Optional[str] = Form(None),   # optional client-side transcript (Local-mode fallback)
    challenge: Optional[str] = Form(None),    # pressure drill: the question the buddy asked aloud
    x_deepgram_key: Optional[str] = Header(None),
):
    try:
        return await _analyze(audio, lesson_id, day, transcript, challenge, x_deepgram_key)
    except HTTPException:
        raise
    except Exception as exc:
        # An unhandled 500 skips the CORS middleware, which the browser reports as an
        # opaque network error; an HTTPException keeps the headers and a readable message.
        raise HTTPException(500, f"Analysis failed: {exc}")


async def _analyze(audio, lesson_id, day, transcript, challenge, x_deepgram_key):
    prog = program.load()
    if not lesson_id and day:
        lesson_id = program.day_id_at(prog, day)
    lesson = program.get_lesson(prog, lesson_id)
    if not lesson:
        raise HTTPException(404, "That lesson no longer exists — reload the program.")
    data = store.load()
    sessions = data["sessions"]
    done = store.completed_day_ids(sessions)
    if not program.is_unlocked(prog, lesson, done):
        day_id = lesson["id"] if lesson["kind"] == "day" else lesson.get("parentId")
        missing = next(d for d in prog["order"] if d not in done)
        raise HTTPException(403, f"Day {program.day_number(prog, day_id)} is locked — complete "
                                 f"Day {program.day_number(prog, missing)} first.")

    raw = await audio.read()
    if len(raw) < 2000:
        raise HTTPException(400, "Recording was too short. Try again and speak for the full time.")

    config = get_config()
    mode = "deepgram" if config.voice.mode == "deepgram" else "local"
    session_id = uuid.uuid4().hex[:12]

    # Retain the raw audio locally before anything is sent to Deepgram.
    store.AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    ext = Path(audio.filename or "rec.webm").suffix or ".webm"
    raw_path = store.AUDIO_DIR / f"{session_id}{ext}"
    raw_path.write_bytes(raw)

    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / "speech.wav"
        try:
            await asyncio.to_thread(acoustic.decode_to_wav, raw_path, wav)
        except Exception as exc:
            raise HTTPException(422, str(exc))

        # Acoustics always run locally and in parallel with transcription.
        acoustic_task = asyncio.to_thread(acoustic.analyze, wav)
        stt: Dict = {}
        notes: List[str] = []

        if mode == "deepgram":
            key = _resolve_deepgram_key(x_deepgram_key)
            if not key:
                raise HTTPException(400, "Deepgram mode is active but no API key is set. Add it in Config → API Keys, or switch to Apple / Local.")
            ct = audio.content_type or "audio/webm"
            stt_task = deepgram.transcribe(raw, ct, config.voice.deepgram_model or "nova-2", key)
        else:
            async def local_stt() -> Dict:
                try:
                    return await apple_stt.transcribe(wav)
                except Exception as exc:  # fall back to a client-provided transcript
                    if transcript and transcript.strip():
                        notes.append("Apple on-device transcription was unavailable; used the browser transcript.")
                        return {"transcript": transcript.strip(), "asr_confidence": None}
                    raise HTTPException(503, f"Apple on-device transcription unavailable: {exc}")
            stt_task = local_stt()

        try:
            ac, stt = await asyncio.gather(acoustic_task, stt_task)
        except ValueError as exc:
            raw_path.unlink(missing_ok=True)
            raise HTTPException(422, str(exc))

    text = stt.get("transcript", "")
    # The learner's own targets: persona (e.g. 100-130 WPM, fillers incl. "na") + this lesson's criteria.
    thresholds = program.thresholds(prog, lesson)
    lang = await asyncio.to_thread(language.analyze, text, ac["speech_span_sec"], thresholds)
    if lang["word_count"] < MIN_WORDS:
        raw_path.unlink(missing_ok=True)
        raise HTTPException(422, f"We only caught {lang['word_count']} words — speak for at least 30 seconds and try again.")

    # Sentiment: Deepgram when available, otherwise the local spaCy-based lexicon.
    if mode == "deepgram" and stt.get("sentiment_segments"):
        scores = [s["score"] for s in stt["sentiment_segments"]]
        sent_source = "deepgram"
        sent_sentences = stt["sentiment_segments"]
    else:
        scores = [s["score"] for s in lang["sentence_sentiment"]]
        sent_source = "local"
        sent_sentences = lang["sentence_sentiment"]
    sentiment = scoring.classify_sentiment(scores, ac.get("pitch_variation_st"))
    sentiment["source"] = sent_source
    sentiment["sentences"] = sent_sentences[:40]

    intent = stt.get("intent") if mode == "deepgram" else None
    extras = {**_extras(ac, lang, sessions, challenge), "thresholds": thresholds}
    ps = scoring.param_scores(ac, lang, sentiment, extras)
    comp = scoring.composites(ps, stt.get("asr_confidence"))
    flags = scoring.build_flags(ac, lang, sentiment, intent, extras)

    day_id = lesson["id"] if lesson["kind"] == "day" else lesson.get("parentId")
    session = {
        "id": session_id,
        "lesson_id": lesson["id"],
        "lesson_kind": lesson["kind"],
        "lesson_title": lesson["title"],
        "parent_id": lesson.get("parentId"),
        "day": program.day_number(prog, day_id) if day_id else None,
        "week": program.lesson_week(prog, lesson),
        "challenge": challenge.strip() if challenge else None,
        "created_at": datetime.now().isoformat(timespec="seconds"),
        "mode": mode,
        "transcript": text,
        "audio_file": str(raw_path),
        "acoustic": ac,
        "chest": scoring.chest_label(ac),
        "language": {k: v for k, v in lang.items() if k != "sentence_sentiment"},
        "sentiment": sentiment,
        "intent": intent,
        "extras": {k: v for k, v in extras.items() if k != "thresholds"},
        "thresholds": thresholds,
        "tonal_moves": scoring.tonal_moves(ac, extras),
        "targets": scoring.build_targets(ac, extras),
        "param_scores": {k: (round(v, 1) if v is not None else None) for k, v in ps.items()},
        "scores": comp,
        "flags": flags,
        "notes": notes,
    }
    session["benchmark_comparisons"] = _benchmark_comparisons(prog, lesson, sessions, session)
    store.add_session(session)

    summary = None
    if lesson["kind"] == "day" and lesson["id"] in program.summary_day_ids(prog):
        summary = _weekly_summary(lesson["week"], store.load()["sessions"])
        if summary:
            store.set_weekly(lesson["week"], summary)

    return {"session": session, "weekly_summary": summary}


# ── Program & lessons ───────────────────────────────────────────

class Placement(BaseModel):
    type: Literal["sublesson", "day", "standalone"]
    dayId: Optional[str] = None
    afterDayId: Optional[str] = None


class GenerateRequest(BaseModel):
    prompt: str
    placement: Placement
    durationMins: Optional[int] = None


class SaveLessonRequest(BaseModel):
    lesson: Dict[str, Any]
    placement: Placement


class ReviseRequest(BaseModel):
    prompt: str
    fields: Optional[List[str]] = None  # None = the whole lesson


class UpdateLessonRequest(BaseModel):
    lesson: Dict[str, Any]


def _llm_context(gemini_key, deepseek_key, provider, gemini_model, deepseek_model) -> Dict:
    keys, models, client_provider = _extract_client_context(gemini_key, deepseek_key, provider, gemini_model, deepseek_model)
    return {"client_provider": client_provider, "client_keys": keys, "client_models": models}


def _placement_text(prog: Dict, placement: Placement) -> str:
    themes = {w["week"]: w["title"] for w in prog["weeks"]}
    if placement.type == "sublesson":
        day = program.get_lesson(prog, placement.dayId)
        if not day or day["kind"] != "day":
            raise HTTPException(404, "Pick the day this sub-lesson belongs to.")
        n = program.day_number(prog, day["id"])
        return (f'A sub-lesson attached to Day {n} — "{day["title"]}" (Week {day["week"]}: {themes.get(day["week"], "")}).\n'
                f"That day's objective: {day['objective']}\nThat day's exercise: {day['prompt']}\n"
                "The sub-lesson should deepen or extend that day's goal with a different, focused drill "
                "(usually 2-5 minutes).")
    if placement.type == "day":
        if not placement.afterDayId:
            first = program.get_lesson(prog, prog["order"][0]) if prog["order"] else None
            return ("A new program day at the very start of the program"
                    + (f', before "{first["title"]}".' if first else "."))
        after = program.get_lesson(prog, placement.afterDayId)
        if not after or after["kind"] != "day":
            raise HTTPException(404, "Pick the day the new day should follow.")
        n = program.day_number(prog, after["id"])
        nxt = program.get_lesson(prog, program.day_id_at(prog, n + 1))
        return (f'A new program day inserted after Day {n} — "{after["title"]}" '
                f'(Week {after["week"]}: {themes.get(after["week"], "")}).'
                + (f' The day after it is "{nxt["title"]}"; the new day must fit the progression between them.' if nxt else
                   " It becomes the final day, so it should consolidate everything before it."))
    return "A standalone lesson the learner can practice any time, outside the day-by-day sequence."


async def _ai(coro):
    """Run an AI call, turning provider / parsing failures into clear HTTP errors."""
    try:
        return await coro
    except ValidationError as exc:
        missing = ", ".join(sorted({str(e["loc"][0]) for e in exc.errors() if e.get("loc")}))
        raise HTTPException(502, f"The AI's lesson was missing or had invalid parts ({missing}). Try again.")
    except json.JSONDecodeError:
        raise HTTPException(502, "The AI returned malformed JSON. Try again.")
    except ValueError as exc:
        msg = str(exc)
        raise HTTPException(400 if "No LLM provider key" in msg else 422, msg)
    except RuntimeError as exc:
        raise HTTPException(502, str(exc))


@router.get("/program")
async def get_program():
    return program.view(program.load())


@router.post("/program/import")
async def import_program(payload: Any = Body(...)):
    try:
        return program.view(program.import_seed(payload))
    except (ValueError, ValidationError) as exc:
        raise HTTPException(400, f"Couldn't import that program: {exc}")


@router.post("/program/reset")
async def reset_program():
    return program.view(program.reset_to_default())


@router.post("/lessons/generate")
async def generate_lesson(
    req: GenerateRequest,
    x_gemini_key: Optional[str] = Header(None),
    x_deepseek_key: Optional[str] = Header(None),
    x_llm_provider: Optional[str] = Header(None),
    x_gemini_model: Optional[str] = Header(None),
    x_deepseek_model: Optional[str] = Header(None),
):
    if not req.prompt.strip():
        raise HTTPException(400, "Describe the lesson you want.")
    prog = program.load()
    placement_text = _placement_text(prog, req.placement)
    anchor_id = (req.placement.dayId if req.placement.type == "sublesson"
                 else req.placement.afterDayId if req.placement.type == "day"
                 else (prog["order"][0] if prog["order"] else None))
    anchor = program.get_lesson(prog, anchor_id or (prog["order"][0] if prog["order"] else None))
    draft = await _ai(lessons_ai.generate_lesson(
        request=req.prompt.strip(),
        placement_text=placement_text,
        coach_context=prog["coach_context"],
        program_outline=program.outline(prog),
        llm=_llm_context(x_gemini_key, x_deepseek_key, x_llm_provider, x_gemini_model, x_deepseek_model),
        duration_mins=req.durationMins,
        style_reference={k: anchor[k] for k in program.CONTENT_FIELDS} if anchor else None,
    ))
    return {"draft": draft, "placement": req.placement.model_dump()}


@router.post("/lessons")
async def save_lesson(req: SaveLessonRequest):
    try:
        lesson = program.add_lesson(req.lesson, req.placement.model_dump())
    except KeyError as exc:
        raise HTTPException(404, str(exc).strip("'"))
    except (ValueError, ValidationError) as exc:
        raise HTTPException(400, f"That lesson isn't valid: {exc}")
    return {"lesson": lesson, "program": program.view(program.load())}


@router.post("/lessons/{lesson_id}/revise")
async def revise_lesson(
    lesson_id: str,
    req: ReviseRequest,
    x_gemini_key: Optional[str] = Header(None),
    x_deepseek_key: Optional[str] = Header(None),
    x_llm_provider: Optional[str] = Header(None),
    x_gemini_model: Optional[str] = Header(None),
    x_deepseek_model: Optional[str] = Header(None),
):
    if not req.prompt.strip():
        raise HTTPException(400, "Describe what to change.")
    prog = program.load()
    lesson = program.get_lesson(prog, lesson_id)
    if not lesson:
        raise HTTPException(404, "Lesson not found.")
    revised, changed = await _ai(lessons_ai.revise_lesson(
        lesson=lesson,
        instruction=req.prompt.strip(),
        fields=req.fields,
        coach_context=prog["coach_context"],
        llm=_llm_context(x_gemini_key, x_deepseek_key, x_llm_provider, x_gemini_model, x_deepseek_model),
    ))
    return {"draft": revised, "changed": changed}


@router.put("/lessons/{lesson_id}")
async def update_lesson(lesson_id: str, req: UpdateLessonRequest):
    try:
        lesson = program.update_lesson(lesson_id, req.lesson)
    except KeyError as exc:
        raise HTTPException(404, str(exc).strip("'"))
    except (ValueError, ValidationError) as exc:
        raise HTTPException(400, f"That lesson isn't valid: {exc}")
    return {"lesson": lesson, "program": program.view(program.load())}


@router.post("/lessons/{lesson_id}/revert")
async def revert_lesson(lesson_id: str):
    try:
        lesson = program.revert_lesson(lesson_id)
    except KeyError as exc:
        raise HTTPException(404, str(exc).strip("'"))
    return {"lesson": lesson, "program": program.view(program.load())}


@router.delete("/lessons/{lesson_id}")
async def delete_lesson(lesson_id: str):
    try:
        program.delete_lesson(lesson_id)
    except KeyError as exc:
        raise HTTPException(404, str(exc).strip("'"))
    except PermissionError as exc:
        raise HTTPException(403, str(exc))
    return {"program": program.view(program.load())}
