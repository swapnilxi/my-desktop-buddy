"""
Voice routes — STT and TTS endpoints.

TTS supports:
  - Deepgram Aura (mode="deepgram", requires client key or server DEEPGRAM_API_KEY)
  - Apple native voices via the macOS `say` CLI (mode="apple")

Both return raw audio bytes that the frontend plays directly.
"""
import asyncio
import os
import tempfile
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException, Request, Header
from fastapi.responses import Response
from pydantic import BaseModel

from config_manager import get_config

router = APIRouter(prefix="/voice", tags=["voice"])

DEEPGRAM_TTS_URL = "https://api.deepgram.com/v1/speak"
DEEPGRAM_STT_URL = "https://api.deepgram.com/v1/listen"


try:
    from voice.fish_audio_manager import synthesize_fish_audio, get_character_reference_id
except (ImportError, ModuleNotFoundError):
    from backend.voice.fish_audio_manager import synthesize_fish_audio, get_character_reference_id


class SpeakRequest(BaseModel):
    text: str
    voice: Optional[str] = None
    character: Optional[str] = None


async def _deepgram_stt(audio_bytes: bytes, content_type: str, model: str, api_key: str) -> str:
    """Transcribe audio with Deepgram; returns the transcript text."""
    params = {"model": model, "smart_format": "true", "punctuate": "true"}
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            DEEPGRAM_STT_URL,
            params=params,
            headers={
                "Authorization": f"Token {api_key}",
                "Content-Type": content_type or "audio/webm",
            },
            content=audio_bytes,
        )
    if resp.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"Deepgram STT failed ({resp.status_code}): {resp.text[:200]}",
        )
    data = resp.json()
    try:
        transcript = data["results"]["channels"][0]["alternatives"][0]["transcript"]
    except (KeyError, IndexError):
        raise HTTPException(status_code=502, detail="Unexpected Deepgram STT response.")
    return transcript.strip()


async def _gemini_stt(audio_bytes: bytes, content_type: str, api_key: str) -> str:
    """Transcribe audio with Gemini Flash when Deepgram is not configured."""
    from google import genai
    from google.genai import types

    def _sync_transcribe():
        client = genai.Client(api_key=api_key)
        mime = content_type.split(";")[0].strip() if content_type else "audio/webm"
        if not mime or mime == "application/octet-stream":
            mime = "audio/webm"
        resp = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                types.Part.from_bytes(data=audio_bytes, mime_type=mime),
                "Transcribe this speech audio clip verbatim. Output ONLY the plain transcription text with no preamble or explanation.",
            ],
        )
        return resp.text.strip() if resp.text else ""

    return await asyncio.to_thread(_sync_transcribe)


@router.post("/transcribe")
async def transcribe(
    request: Request,
    x_deepgram_key: Optional[str] = Header(None),
    x_gemini_key: Optional[str] = Header(None),
    x_stt_provider: Optional[str] = Header(None),
):
    """
    Speech-to-text transcription.
    Supports Gemini Flash STT and Deepgram STT.
    Accepts raw audio bytes as the request body.
    """
    config = get_config()
    stt_pref = (x_stt_provider or config.voice.stt_provider or "gemini").lower()

    deepgram_key = (
        x_deepgram_key
        or config.api_keys.deepgram_key
        or os.getenv("DEEPGRAM_API_KEY")
        or os.getenv("DEEPGRAM_KEY")
    )
    gemini_key = (
        x_gemini_key
        or config.api_keys.gemini_key
        or os.getenv("GEMINI_API_KEY")
        or os.getenv("GEMINI_KEY")
    )

    if not deepgram_key and not gemini_key:
        raise HTTPException(
            status_code=400,
            detail=(
                "Microphone listening (STT) requires a Gemini key or Deepgram key (DEEPGRAM_API_KEY). "
                "Note: Fish Audio is active for speaking (TTS), not microphone input (STT). "
                "You can type your message in the chat box, use Apple / Browser dictation, or configure a key in Config."
            ),
        )

    audio_bytes = await request.body()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio upload.")

    content_type = request.headers.get("content-type") or "audio/webm"
    if content_type.startswith("multipart/form-data"):
        content_type = "audio/webm"

    # 1. Prefer Gemini if requested or if Deepgram is missing
    if (stt_pref == "gemini" and gemini_key) or (gemini_key and not deepgram_key):
        try:
            transcript = await _gemini_stt(audio_bytes, content_type, gemini_key)
            if not transcript:
                raise HTTPException(status_code=422, detail="Could not understand the audio. Try again!")
            return {"transcript": transcript, "model": "gemini-2.5-flash"}
        except HTTPException:
            raise
        except Exception as exc:
            if not deepgram_key:
                raise HTTPException(status_code=502, detail=f"Gemini speech transcription failed: {exc}")

    # 2. Use Deepgram
    if deepgram_key:
        model = config.voice.deepgram_model or "nova-2"
        transcript = await _deepgram_stt(audio_bytes, content_type, model, deepgram_key)
        if not transcript:
            raise HTTPException(status_code=422, detail="Could not understand the audio. Try again!")
        return {"transcript": transcript, "model": model}

    # 3. Fallback to Gemini if Deepgram failed but Gemini key exists
    if gemini_key:
        try:
            transcript = await _gemini_stt(audio_bytes, content_type, gemini_key)
            return {"transcript": transcript, "model": "gemini-2.5-flash"}
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Transcription failed: {exc}")

    raise HTTPException(status_code=400, detail="No STT provider key available.")


async def _deepgram_tts(text: str, voice: str, api_key: str) -> bytes:
    """Synthesize speech with Deepgram Aura; returns MP3 bytes."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            DEEPGRAM_TTS_URL,
            params={"model": voice},
            headers={
                "Authorization": f"Token {api_key}",
                "Content-Type": "application/json",
            },
            json={"text": text},
        )
    if resp.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"Deepgram TTS failed ({resp.status_code}): {resp.text[:200]}",
        )
    return resp.content


def _apple_tts_sync(text: str, voice: str) -> bytes:
    """Synthesize speech with macOS `say`; returns WAV bytes."""
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        out_path = tmp.name

    try:
        cmd = ["say", "-o", out_path, "--data-format=LEI16@22050"]
        if voice:
            cmd += ["-v", voice]
        cmd.append(text)
        try:
            subprocess.run(cmd, check=True, capture_output=True, timeout=60)
        except subprocess.CalledProcessError:
            # Named voice may not be installed — retry with system default.
            cmd = ["say", "-o", out_path, "--data-format=LEI16@22050", text]
            subprocess.run(cmd, check=True, capture_output=True, timeout=60)
        with open(out_path, "rb") as f:
            return f.read()
    finally:
        try:
            os.unlink(out_path)
        except OSError:
            pass


async def _apple_tts(text: str, voice: str) -> bytes:
    import subprocess
    return await asyncio.to_thread(_apple_tts_sync, text, voice)


@router.post("/speak")
async def speak(
    request: SpeakRequest,
    x_deepgram_key: Optional[str] = Header(None),
    x_fish_audio_key: Optional[str] = Header(None),
    x_buddy_type: Optional[str] = Header(None),
    x_voice_mode: Optional[str] = Header(None),
):
    """
    Text-to-speech synthesis. Returns audio bytes (audio/mpeg or audio/wav).
    Supports:
      - Fish Audio TTS (mode="fish_audio", per-character voice model IDs)
      - Deepgram Aura (mode="deepgram")
      - Apple native voices (mode="apple") / browser TTS fallback
    """
    text = request.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="No text provided.")

    config = get_config()
    voice_cfg = config.voice
    mode = (x_voice_mode or voice_cfg.mode or "apple").lower()

    # Determine character
    character = (request.character or x_buddy_type or config.hamster.buddy_type or "hamster").strip().lower()

    # 1. Fish Audio Mode
    fish_audio_key = (
        x_fish_audio_key
        or config.api_keys.fish_audio_key
        or os.getenv("FISH_AUDIO_KEY")
    )
    if mode == "fish_audio" or (x_voice_mode == "fish_audio"):
        if not fish_audio_key:
            raise HTTPException(
                status_code=400,
                detail="No Fish Audio API key configured. Enter your key in Config → API Keys or set FISH_AUDIO_KEY in backend/.env.",
            )
        ref_id = request.voice or get_character_reference_id(character)
        if not ref_id:
            env_var = f"FISH_AUDIO_ID_{character.upper()}"
            raise HTTPException(
                status_code=400,
                detail=f"No Fish Audio voice model ID configured for character '{character}'. Please add {env_var}=<model_id> in backend/.env.",
            )
        try:
            audio = await synthesize_fish_audio(
                text=text,
                character=character,
                api_key=fish_audio_key,
                reference_id=ref_id,
                model=voice_cfg.fish_audio_model,
            )
            return Response(content=audio, media_type="audio/mpeg")
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Fish Audio TTS failed: {exc}")

    # 2. Deepgram Aura Mode
    deepgram_key = (
        x_deepgram_key
        or config.api_keys.deepgram_key
        or os.getenv("DEEPGRAM_API_KEY")
        or os.getenv("DEEPGRAM_KEY")
    )
    if (mode == "deepgram" or x_deepgram_key) and deepgram_key:
        voice = request.voice or voice_cfg.tts_voice or "aura-asteria-en"
        audio = await _deepgram_tts(text, voice, deepgram_key)
        return Response(content=audio, media_type="audio/mpeg")

    # 3. Apple native fallback (macOS)
    voice = request.voice or voice_cfg.apple_voice or "Samantha"
    try:
        import subprocess
        audio = await _apple_tts(text, voice)
    except FileNotFoundError:
        raise HTTPException(
            status_code=501,
            detail="Apple TTS unavailable on this server. Configure Fish Audio or Deepgram in Config, or use browser voices.",
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"TTS failed: {exc}")

    return Response(content=audio, media_type="audio/wav")

