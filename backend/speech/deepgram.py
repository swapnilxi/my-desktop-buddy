"""Deepgram pre-recorded transcription with sentiment + intent (Cloud mode)."""
from typing import Dict, List, Optional

import httpx
from fastapi import HTTPException

DEEPGRAM_STT_URL = "https://api.deepgram.com/v1/listen"

INTENT_BUCKETS = {
    "question": ("ask", "question", "inquir", "request", "clarif"),
    "persuade": ("persuad", "convinc", "recommend", "propos", "advoc", "suggest", "pitch"),
    "inform": ("inform", "explain", "describ", "updat", "report", "share", "provid", "present"),
    "assert": ("assert", "state", "declar", "decid", "commit", "announc", "confirm", "direct"),
}


def _bucket(label: str) -> str:
    low = label.lower()
    for name, stems in INTENT_BUCKETS.items():
        if any(s in low for s in stems):
            return name
    return "other"


async def transcribe(audio: bytes, content_type: str, model: str, api_key: str) -> Dict:
    # filler_words=true keeps "um/uh" (Deepgram strips them by default); sentiment/intents need language=en
    params = {
        "model": model, "language": "en", "smart_format": "true", "punctuate": "true",
        "filler_words": "true", "sentiment": "true", "intents": "true",
    }
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            DEEPGRAM_STT_URL, params=params,
            headers={"Authorization": f"Token {api_key}", "Content-Type": content_type or "audio/webm"},
            content=audio,
        )
    if resp.status_code != 200:
        raise HTTPException(502, f"Deepgram failed ({resp.status_code}): {resp.text[:200]}")
    data = resp.json()
    try:
        alt = data["results"]["channels"][0]["alternatives"][0]
    except (KeyError, IndexError):
        raise HTTPException(502, "Unexpected Deepgram response.")

    words = alt.get("words", [])
    confs = [w.get("confidence") for w in words if w.get("confidence") is not None]
    out: Dict = {
        "transcript": (alt.get("transcript") or "").strip(),
        "asr_confidence": (sum(confs) / len(confs)) if confs else None,
        "sentiment_segments": [], "sentiment_average": None, "intent": None,
    }

    sents = (data.get("results") or {}).get("sentiments")
    if sents:
        out["sentiment_segments"] = [
            {"text": s.get("text", ""), "score": float(s.get("sentiment_score", 0.0)), "label": s.get("sentiment")}
            for s in sents.get("segments", [])
        ]
        avg = sents.get("average") or {}
        out["sentiment_average"] = avg.get("sentiment_score")

    ints = (data.get("results") or {}).get("intents")
    if ints:
        weights: Dict[str, float] = {}
        labels: Dict[str, float] = {}
        for seg in ints.get("segments", []):
            for it in seg.get("intents", []):
                c = float(it.get("confidence_score", 0))
                b = _bucket(it.get("intent", ""))
                weights[b] = weights.get(b, 0) + c
                labels[it.get("intent", "")] = max(labels.get(it.get("intent", ""), 0), c)
        out["intent"] = {
            "available": True,
            "categories": [{"intent": k, "score": round(v, 2)} for k, v in sorted(weights.items(), key=lambda x: -x[1])],
            "top": [{"intent": k, "confidence": round(v, 2)} for k, v in sorted(labels.items(), key=lambda x: -x[1])[:5]],
        }
    return out
