"""
Fish Audio TTS Manager
Handles voice synthesis via Fish Audio API (https://api.fish.audio/v1/tts)
with per-character voice model IDs configured via .env:
  - FISH_AUDIO_ID_KRISHNA
  - FISH_AUDIO_ID_HAMSTER
  - FISH_AUDIO_ID_PANDA
"""

import logging
import os
from typing import Dict, Optional
import httpx

logger = logging.getLogger(__name__)

FISH_AUDIO_TTS_URL = "https://api.fish.audio/v1/tts"
DEFAULT_FISH_AUDIO_MODEL = "s2.1-pro-free"


def get_character_reference_id(character: Optional[str] = None) -> Optional[str]:
    """
    Look up the Fish Audio reference ID for a given character name.
    Matches environment variables:
      FISH_AUDIO_ID_<CHARACTER_UPPER> (e.g. FISH_AUDIO_ID_KRISHNA, FISH_AUDIO_ID_HAMSTER)
    Falls back to generic FISH_AUDIO_ID if specific character ID is not set.
    """
    if not character:
        character = "hamster"
    clean_char = character.strip().upper().replace(" ", "_").replace("-", "_")

    # 1. Primary lookup: FISH_AUDIO_ID_<CHARACTER>
    ref_id = os.getenv(f"FISH_AUDIO_ID_{clean_char}")

    # 2. Case-insensitive fallback
    if not ref_id:
        ref_id = os.getenv(f"FISH_AUDIO_ID_{character.strip().lower()}")

    # 3. Generic fallback
    if not ref_id:
        ref_id = os.getenv("FISH_AUDIO_ID")

    return ref_id.strip() if ref_id else None


def get_configured_fish_audio_ids() -> Dict[str, bool]:
    """Return dictionary of known buddy characters and whether they have a Fish Audio ID set."""
    characters = ["krishna", "hamster", "panda"]
    return {c: bool(get_character_reference_id(c)) for c in characters}


async def synthesize_fish_audio(
    text: str,
    character: str = "hamster",
    api_key: Optional[str] = None,
    reference_id: Optional[str] = None,
    model: Optional[str] = None,
) -> bytes:
    """
    Synthesize speech using Fish Audio TTS API.
    Returns MP3 audio bytes.

    :param text: Text to speak
    :param character: Buddy character name (e.g. "krishna", "hamster", "panda")
    :param api_key: Fish Audio API key (falls back to FISH_AUDIO_KEY env var)
    :param reference_id: Voice model ID (falls back to FISH_AUDIO_ID_<CHARACTER>)
    :param model: Fish Audio model header (default: FISH_AUDIO_MODEL or "s2.1-pro-free")
    """
    key = api_key or os.getenv("FISH_AUDIO_KEY")
    if not key:
        raise ValueError(
            "No Fish Audio API key configured. Please set FISH_AUDIO_KEY in backend/.env "
            "or enter it in Config → API Keys."
        )

    ref_id = reference_id or get_character_reference_id(character)
    if not ref_id:
        clean_name = character.strip().upper()
        raise ValueError(
            f"Fish Audio voice model ID not found for character '{character}'. "
            f"Please set FISH_AUDIO_ID_{clean_name}=<your_model_id> in backend/.env."
        )

    req_model = model or os.getenv("FISH_AUDIO_MODEL") or DEFAULT_FISH_AUDIO_MODEL

    body = {
        "text": text,
        "reference_id": ref_id,
        "format": "mp3",
    }

    async with httpx.AsyncClient(timeout=45) as client:
        headers = {
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "model": req_model,
        }

        resp = await client.post(
            FISH_AUDIO_TTS_URL,
            headers=headers,
            json=body,
        )

        # Resilient fallback: If paid credits are insufficient (402), retry with free tier model
        if resp.status_code == 402 and req_model != DEFAULT_FISH_AUDIO_MODEL:
            logger.warning(
                f"Fish Audio model '{req_model}' returned 402 (Insufficient credit). "
                f"Retrying with '{DEFAULT_FISH_AUDIO_MODEL}'..."
            )
            headers["model"] = DEFAULT_FISH_AUDIO_MODEL
            resp = await client.post(
                FISH_AUDIO_TTS_URL,
                headers=headers,
                json=body,
            )

    if resp.status_code != 200:
        error_msg = resp.text[:300]
        try:
            err_json = resp.json()
            if isinstance(err_json, dict) and "message" in err_json:
                error_msg = err_json["message"]
        except Exception:
            pass
        raise RuntimeError(f"Fish Audio TTS failed ({resp.status_code}): {error_msg}")

    return resp.content