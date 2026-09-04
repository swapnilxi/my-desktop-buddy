"""
Sarvam AI — STT and TTS built for Indian languages.

Worth being clear about why this provider matters here: unlike Gemini, whose
prebuilt voices are language-agnostic and get their Indian character from an
accent instruction, **Sarvam's voices are natively Indian**. If the user wants
Hindi or Hinglish that sounds genuinely Indian rather than directed, this is
the provider to prefer.

Verified against the live API:
  * TTS  `bulbul:v3`  → `{"audios": ["<base64 RIFF WAV>"]}`, hi-IN and en-IN
    both accepted. Hard limit of 2500 characters per request.
  * STT  `saarika:v2.5` → `{"transcript": ..., "language_code": ...}`.
    It transcribed a Hinglish clip into accurate Devanagari.

Earlier model ids are gone: `bulbul:v1`/`v2` and `saarika:v2` all return a
deprecation 400, so the defaults below are the current ones.
"""
from __future__ import annotations

import base64
from typing import Any, Optional

import httpx

TTS_URL = "https://api.sarvam.ai/text-to-speech"
STT_URL = "https://api.sarvam.ai/speech-to-text"

TTS_MODEL = "bulbul:v3"
STT_MODEL = "saarika:v2.5"

MAX_TTS_CHARS = 2400          # the API rejects >2500; leave headroom

# Speakers the live API reports for bulbul:v3.
SPEAKERS: tuple[str, ...] = (
    "aditya", "ritu", "ashutosh", "priya", "neha", "rahul", "pooja", "rohan",
    "simran", "kavya", "amit", "dev", "ishita", "shreya", "ratan", "varun",
    "manan", "sumit", "roopa", "kabir", "aayan", "shubh", "advait", "anand",
    "tanya", "tarun", "sunny", "mani", "gokul", "vijay", "shruti", "suhani",
    "mohit", "kavitha", "rehan", "soham", "rupali",
)
DEFAULT_SPEAKER = "anand"

LANGUAGES: tuple[str, ...] = (
    "hi-IN", "en-IN", "bn-IN", "gu-IN", "kn-IN", "ml-IN",
    "mr-IN", "od-IN", "pa-IN", "ta-IN", "te-IN",
)


def normalize_language(language: Optional[str]) -> str:
    """Map our internal codes onto Sarvam's. Anything unknown becomes hi-IN."""
    lang = (language or "hi-IN").strip()
    if lang in LANGUAGES:
        return lang
    base = lang.split("-")[0].lower()
    for candidate in LANGUAGES:
        if candidate.lower().startswith(base):
            return candidate
    return "hi-IN"


def normalize_speaker(speaker: Optional[str]) -> str:
    name = (speaker or DEFAULT_SPEAKER).strip().lower()
    return name if name in SPEAKERS else DEFAULT_SPEAKER


async def synthesize(text: str, api_key: str, speaker: Optional[str] = None,
                     language: Optional[str] = None,
                     model: Optional[str] = None) -> tuple[bytes, dict[str, Any]]:
    """Returns (wav_bytes, metadata). Raises RuntimeError with the API's reason."""
    body = text.strip()
    if not body:
        raise RuntimeError("Nothing to speak.")
    truncated = len(body) > MAX_TTS_CHARS
    if truncated:
        cut = body[:MAX_TTS_CHARS]
        body = cut[: cut.rfind(".") + 1] or cut

    payload = {
        "text": body,
        "target_language_code": normalize_language(language),
        "speaker": normalize_speaker(speaker),
        "model": model or TTS_MODEL,
    }
    async with httpx.AsyncClient(timeout=90) as client:
        resp = await client.post(
            TTS_URL, headers={"api-subscription-key": api_key}, json=payload
        )
    if resp.status_code != 200:
        raise RuntimeError(f"Sarvam TTS failed ({resp.status_code}): {resp.text[:200]}")

    data = resp.json()
    audios = data.get("audios") or []
    if not audios:
        raise RuntimeError("Sarvam TTS returned no audio.")
    audio = base64.b64decode(audios[0])
    return audio, {
        "speaker": payload["speaker"],
        "language": payload["target_language_code"],
        "model": payload["model"],
        "truncated": truncated,
        "request_id": data.get("request_id"),
    }


async def transcribe(audio_bytes: bytes, mime_type: str, api_key: str,
                     language: Optional[str] = None,
                     model: Optional[str] = None) -> str:
    suffix = "wav" if "wav" in (mime_type or "") else "webm"
    data = {"model": model or STT_MODEL}
    # Sarvam can auto-detect; only pin the language when the caller asked to.
    if language:
        data["language_code"] = normalize_language(language)

    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            STT_URL,
            headers={"api-subscription-key": api_key},
            files={"file": (f"speech.{suffix}", audio_bytes, mime_type or "audio/webm")},
            data=data,
        )
    if resp.status_code != 200:
        raise RuntimeError(f"Sarvam STT failed ({resp.status_code}): {resp.text[:200]}")
    return (resp.json().get("transcript") or "").strip()


def list_voices() -> list[dict[str, Any]]:
    return [
        {"id": speaker, "label": speaker.title(), "language": "hi-IN / en-IN"}
        for speaker in SPEAKERS
    ]
