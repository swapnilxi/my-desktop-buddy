"""
Voice routes — STT and TTS endpoints.

TTS supports:
  - Deepgram Aura (mode="deepgram", requires api_keys.deepgram_key)
  - Apple native voices via the macOS `say` CLI (mode="apple")

Both return raw audio bytes that the frontend plays directly.
"""
import asyncio
import tempfile
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response
from pydantic import BaseModel

from config_manager import get_config

router = APIRouter(prefix="/voice", tags=["voice"])

DEEPGRAM_TTS_URL = "https://api.deepgram.com/v1/speak"
DEEPGRAM_STT_URL = "https://api.deepgram.com/v1/listen"


class SpeakRequest(BaseModel):
    text: str
    voice: Optional[str] = None


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


@router.post("/transcribe")
async def transcribe(request: Request):
    """
    Speech-to-text transcription via Deepgram (nova models).
    Accepts the raw audio bytes as the request body — any format Deepgram
    supports works (webm, mp3, wav, m4a...). Content-Type header is used
    to tell Deepgram what it's receiving.
    """
    config = get_config()
    deepgram_key = config.api_keys.deepgram_key
    if not deepgram_key:
        raise HTTPException(
            status_code=400,
            detail="No Deepgram API key configured. Add one in Settings → API Keys.",
        )

    audio_bytes = await request.body()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio upload.")

    content_type = request.headers.get("content-type") or "audio/webm"
    # Strip multipart boundary noise if a client posts form-data
    if content_type.startswith("multipart/form-data"):
        content_type = "audio/webm"

    model = config.voice.deepgram_model or "nova-2"
    transcript = await _deepgram_stt(
        audio_bytes, content_type, model, deepgram_key
    )
    if not transcript:
        raise HTTPException(status_code=422, detail="Could not understand the audio. Try again!")

    return {"transcript": transcript, "model": model}


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
    import os
    import subprocess

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
    return await asyncio.to_thread(_apple_tts_sync, text, voice)


@router.post("/speak")
async def speak(request: SpeakRequest):
    """
    Text-to-speech synthesis. Returns audio bytes (audio/mpeg or audio/wav).
    Uses Deepgram Aura when configured, otherwise falls back to Apple `say`.
    """
    text = request.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="No text provided.")

    config = get_config()
    voice_cfg = config.voice
    deepgram_key = config.api_keys.deepgram_key

    if voice_cfg.mode == "deepgram" and deepgram_key:
        voice = request.voice or voice_cfg.tts_voice or "aura-asteria-en"
        audio = await _deepgram_tts(text, voice, deepgram_key)
        return Response(content=audio, media_type="audio/mpeg")

    # Apple native fallback (macOS)
    voice = request.voice or voice_cfg.apple_voice or "Samantha"
    try:
        audio = await _apple_tts(text, voice)
    except FileNotFoundError:
        raise HTTPException(
            status_code=501,
            detail="Apple TTS unavailable on this system. Configure Deepgram in Settings.",
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Apple TTS failed: {exc}")

    return Response(content=audio, media_type="audio/wav")
