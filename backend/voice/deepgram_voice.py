"""
Deepgram — Aura TTS and Nova STT.

Lifted out of `routes/voice.py` so every provider presents the same shape to
the chain runner. Behaviour is unchanged from the version that shipped here
before; only the home moved.
"""
from __future__ import annotations

from typing import Any, Optional

import httpx

TTS_URL = "https://api.deepgram.com/v1/speak"
STT_URL = "https://api.deepgram.com/v1/listen"

STT_MODEL = "nova-2"
DEFAULT_VOICE = "aura-asteria-en"

# Aura's catalogue. All English — Deepgram has no Hindi voice, which is worth
# surfacing in the picker rather than letting someone select it for Hinglish
# and wonder why it reads Hindi words as English.
VOICES: tuple[tuple[str, str], ...] = (
    ("aura-asteria-en", "Asteria — feminine, US"),
    ("aura-luna-en", "Luna — feminine, US"),
    ("aura-stella-en", "Stella — feminine, US"),
    ("aura-athena-en", "Athena — feminine, UK"),
    ("aura-hera-en", "Hera — feminine, US"),
    ("aura-orion-en", "Orion — masculine, US"),
    ("aura-arcas-en", "Arcas — masculine, US"),
    ("aura-perseus-en", "Perseus — masculine, US"),
    ("aura-angus-en", "Angus — masculine, Irish"),
    ("aura-orpheus-en", "Orpheus — masculine, US"),
    ("aura-helios-en", "Helios — masculine, UK"),
    ("aura-zeus-en", "Zeus — masculine, US"),
)


async def synthesize(text: str, api_key: str, voice: Optional[str] = None,
                     **_: Any) -> tuple[bytes, dict[str, Any]]:
    resolved = voice or DEFAULT_VOICE
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            TTS_URL,
            params={"model": resolved},
            headers={"Authorization": f"Token {api_key}",
                     "Content-Type": "application/json"},
            json={"text": text},
        )
    if resp.status_code != 200:
        raise RuntimeError(f"Deepgram TTS failed ({resp.status_code}): {resp.text[:200]}")
    return resp.content, {"voice": resolved}


async def transcribe(audio_bytes: bytes, mime_type: str, api_key: str,
                     model: Optional[str] = None, language: Optional[str] = None,
                     **_: Any) -> str:
    params: dict[str, Any] = {
        "model": model or STT_MODEL, "smart_format": "true", "punctuate": "true",
    }
    if language:
        params["language"] = language

    async with httpx.AsyncClient(timeout=90) as client:
        resp = await client.post(
            STT_URL, params=params,
            headers={"Authorization": f"Token {api_key}",
                     "Content-Type": mime_type or "audio/webm"},
            content=audio_bytes,
        )
    if resp.status_code != 200:
        raise RuntimeError(f"Deepgram STT failed ({resp.status_code}): {resp.text[:200]}")
    try:
        return resp.json()["results"]["channels"][0]["alternatives"][0]["transcript"].strip()
    except (KeyError, IndexError, ValueError):
        raise RuntimeError("Unexpected Deepgram STT response shape.")


def list_voices() -> list[dict[str, Any]]:
    return [{"id": vid, "label": label, "language": "en"} for vid, label in VOICES]
