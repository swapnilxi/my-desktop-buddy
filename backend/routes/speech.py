"""
Speech Training routes.

POST /speech/analyze  — upload a recording; returns instant feedback and stores the session.
GET  /speech/state    — sessions, completed days, streak, weekly summaries, active mode.
DELETE /speech/state  — reset all progress.

Mode handling (acoustic analysis is identical in both):
  deepgram → raw audio kept locally, Deepgram (+sentiment/intents) runs in parallel with local acoustics.
  apple    → Apple on-device transcript (or client fallback transcript), spaCy sentiment, acoustics in parallel.
"""
import asyncio
import os
import tempfile
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from fastapi import APIRouter, File, Form, Header, HTTPException, UploadFile

from config_manager import get_config
from speech import acoustic, apple_stt, deepgram, language, scoring, store

router = APIRouter(prefix="/speech", tags=["speech"])

TOTAL_DAYS = 30
WEEKLY_DAYS = {7: 1, 14: 2, 21: 3, 28: 4}
MIN_WORDS = 10


def _week(day: int) -> int:
    return min(4, (day - 1) // 7 + 1)


def _session_metrics(s: Dict) -> Dict:
    return s["param_scores"]


def _weekly_summary(week: int, sessions: List[Dict]) -> Optional[Dict]:
    """Biggest gains vs. the previous reference + the 3 weakest parameters this week."""
    this_week = [s for s in sessions if _week(s["day"]) == week]
    if not this_week:
        return None
    ref = [s for s in sessions if s["day"] == 1] if week == 1 else [s for s in sessions if _week(s["day"]) == week - 1]
    if week == 1 and ref and len(this_week) == 1 and this_week[0]["day"] == 1:
        ref = []

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
        "compared_to": "Day 1" if week == 1 else f"Week {week - 1}",
        "biggest_gains": [g for g in gains if g["delta"] > 0][:3],
        "work_on": weakest,
    }


def _resolve_deepgram_key(x_deepgram_key: Optional[str]) -> Optional[str]:
    config = get_config()
    return (x_deepgram_key or config.api_keys.deepgram_key
            or os.getenv("DEEPGRAM_API_KEY") or os.getenv("DEEPGRAM_KEY"))


@router.get("/state")
async def get_state():
    data = store.load()
    sessions = data["sessions"]
    return {
        "mode": get_config().voice.mode,
        "sessions": sessions,
        "completed_days": store.completed_days(sessions),
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
    day: int = Form(...),
    transcript: Optional[str] = Form(None),   # optional client-side transcript (Local-mode fallback)
    x_deepgram_key: Optional[str] = Header(None),
):
    if not 1 <= day <= TOTAL_DAYS:
        raise HTTPException(400, "Day must be between 1 and 30.")
    data = store.load()
    done = set(store.completed_days(data["sessions"]))
    if day > 1 and (day - 1) not in done:
        raise HTTPException(403, f"Day {day} is locked — complete Day {day - 1} first.")

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
    lang = await asyncio.to_thread(language.analyze, text, ac["speech_span_sec"])
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
    ps = scoring.param_scores(ac, lang, sentiment)
    comp = scoring.composites(ps, stt.get("asr_confidence"))
    flags = scoring.build_flags(ac, lang, sentiment, intent)

    session = {
        "id": session_id,
        "day": day,
        "created_at": datetime.now().isoformat(timespec="seconds"),
        "mode": mode,
        "transcript": text,
        "audio_file": str(raw_path),
        "acoustic": ac,
        "chest": scoring.chest_label(ac),
        "language": {k: v for k, v in lang.items() if k != "sentence_sentiment"},
        "sentiment": sentiment,
        "intent": intent,
        "param_scores": {k: (round(v, 1) if v is not None else None) for k, v in ps.items()},
        "scores": comp,
        "flags": flags,
        "notes": notes,
    }
    store.add_session(session)

    summary = None
    if day in WEEKLY_DAYS:
        summary = _weekly_summary(WEEKLY_DAYS[day], store.load()["sessions"])
        if summary:
            store.set_weekly(WEEKLY_DAYS[day], summary)

    return {"session": session, "weekly_summary": summary}
