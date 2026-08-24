"""
Voice routes — STT and TTS endpoints (stubs for Phase 2).
"""
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel

router = APIRouter(prefix="/voice", tags=["voice"])


class SpeakRequest(BaseModel):
    text: str
    voice: Optional[str] = None


@router.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    """
    Speech-to-text transcription.
    Phase 2: Will support Deepgram and Apple SFSpeechRecognizer.
    """
    # Stub — return placeholder
    raise HTTPException(
        status_code=501,
        detail="Voice transcription coming soon! 🐹🎤 Configure in Phase 2.",
    )


@router.post("/speak")
async def speak(request: SpeakRequest):
    """
    Text-to-speech synthesis.
    Phase 2: Will support Deepgram TTS and Apple AVSpeechSynthesizer.
    """
    # Stub — return placeholder
    raise HTTPException(
        status_code=501,
        detail="Voice synthesis coming soon! 🐹🔊 Configure in Phase 2.",
    )
