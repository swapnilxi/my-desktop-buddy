"""
Cartesia — Sonic TTS and Ink-Whisper STT.

Verified against the live API:
  * TTS  `POST /tts/bytes` with `Cartesia-Version: 2024-11-13` returns audio
    bytes directly. `sonic-3` and `sonic-turbo` are live; `sonic`, `sonic-2`
    and `sonic-2-2025-03-07` all answer "Model sunsetted", so the default here
    is `sonic-3`.
  * STT  `POST /stt` with `model=ink-whisper` → `{"text": ...}`. It handled a
    Hinglish clip correctly.
  * `GET /voices/` is paginated (`has_more` / `next_page`) and each voice
    carries a `language`, which is how the Hindi voices below were found.

Voice ids are opaque UUIDs, so a couple of known-good Hindi and English ones
are pinned as defaults rather than making the user paste a UUID to get sound.
"""
from __future__ import annotations

from typing import Any, Optional

import httpx

API_BASE = "https://api.cartesia.ai"
API_VERSION = "2024-11-13"

TTS_MODEL = "sonic-3"
STT_MODEL = "ink-whisper"

# Confirmed present on the live account. `list_voices` fetches the real list;
# these only exist so there is a working default before anyone picks one.
DEFAULT_VOICES: dict[str, dict[str, str]] = {
    "hi": {"id": "4459a9a5-69d6-4680-b970-e13dc51845b6", "name": "Siya — Bright Conversationalist"},
    "en": {"id": "db6b0ed5-d5d3-463d-ae85-518a07d3c2b4", "name": "Skylar — Friendly Guide"},
}
DEFAULT_VOICE_ID = DEFAULT_VOICES["hi"]["id"]


def _headers(api_key: str) -> dict[str, str]:
    return {"X-API-Key": api_key, "Cartesia-Version": API_VERSION}


def short_language(language: Optional[str]) -> str:
    """Cartesia wants a bare code ('hi', 'en'), not a locale ('hi-IN')."""
    return (language or "en").split("-")[0].lower()


async def synthesize(text: str, api_key: str, voice_id: Optional[str] = None,
                     language: Optional[str] = None,
                     model: Optional[str] = None) -> tuple[bytes, dict[str, Any]]:
    body = text.strip()
    if not body:
        raise RuntimeError("Nothing to speak.")

    lang = short_language(language)
    resolved_voice = voice_id or DEFAULT_VOICES.get(lang, DEFAULT_VOICES["en"])["id"]
    resolved_model = model or TTS_MODEL

    async with httpx.AsyncClient(timeout=90) as client:
        resp = await client.post(
            f"{API_BASE}/tts/bytes",
            headers={**_headers(api_key), "Content-Type": "application/json"},
            json={
                "model_id": resolved_model,
                "transcript": body,
                "voice": {"mode": "id", "id": resolved_voice},
                "output_format": {
                    "container": "wav", "encoding": "pcm_s16le", "sample_rate": 24000,
                },
                "language": lang,
            },
        )
    if resp.status_code != 200:
        raise RuntimeError(f"Cartesia TTS failed ({resp.status_code}): {resp.text[:200]}")
    return resp.content, {
        "voice_id": resolved_voice, "model": resolved_model, "language": lang,
    }


async def transcribe(audio_bytes: bytes, mime_type: str, api_key: str,
                     language: Optional[str] = None,
                     model: Optional[str] = None) -> str:
    suffix = "wav" if "wav" in (mime_type or "") else "webm"
    data = {"model": model or STT_MODEL}
    if language:
        data["language"] = short_language(language)

    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            f"{API_BASE}/stt",
            headers=_headers(api_key),
            files={"file": (f"speech.{suffix}", audio_bytes, mime_type or "audio/webm")},
            data=data,
        )
    if resp.status_code != 200:
        raise RuntimeError(f"Cartesia STT failed ({resp.status_code}): {resp.text[:200]}")
    return (resp.json().get("text") or "").strip()


async def list_voices(api_key: str, limit: int = 100) -> list[dict[str, Any]]:
    """
    The account's voices, Indian languages first.

    Fails soft: a voice list that cannot be fetched should degrade the picker,
    not break the Config screen.
    """
    voices: list[dict[str, Any]] = []
    page: Optional[str] = None
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            for _ in range(4):
                params: dict[str, Any] = {"limit": 100}
                if page:
                    params["starting_after"] = page
                resp = await client.get(
                    f"{API_BASE}/voices/", headers=_headers(api_key), params=params
                )
                if resp.status_code != 200:
                    break
                data = resp.json()
                for v in data.get("data", []):
                    voices.append({
                        "id": v["id"],
                        "label": v.get("name") or v.get("description", "")[:48],
                        "language": v.get("language"),
                        "gender": v.get("gender"),
                    })
                if not data.get("has_more"):
                    break
                page = data.get("next_page")
    except Exception:
        return []

    indian = {"hi", "ta", "te", "or", "ur"}
    voices.sort(key=lambda v: (0 if v["language"] in indian else 1, v["language"] or "", v["label"]))
    return voices[:limit]
