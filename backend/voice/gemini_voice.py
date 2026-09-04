"""
Gemini voice — STT and TTS through the Gemini API, tuned for Hindi / Hinglish /
Indian English.

Three things were established against the live API and are load-bearing here:

  1. **The TTS model returns raw PCM**, `audio/L16;codec=pcm;rate=24000` — not a
     playable container. `pcm_to_wav` puts a RIFF header on it so an
     `<audio>` element can play it.
  2. **Text alone is not a valid TTS request.** Sending bare Devanagari made the
     model reply *"Model tried to generate text, but it should only be used for
     TTS"* (HTTP 400). Every request therefore goes out with an explicit
     "speak this exactly" instruction, which is also where the accent and tone
     direction lives.
  3. **The free tier rate-limits hard.** Two calls in a row were enough to draw
     a 429. `VoiceQuotaError` is raised separately from other failures so the
     route can fall back to another provider instead of leaving the user with
     silence, and a small cache keeps repeated lines (greetings, the same reply
     replayed) from spending quota twice.

On voices: Gemini's prebuilt voices are **not** locale-specific — there is no
"hi-IN-Neerja" here. An Indian delivery comes from the `language_code`
(`hi-IN` / `en-IN`) plus the accent instruction in the prompt, and the presets
below pair a voice with both. The preset descriptions say so, so nobody reads
"Indian voice" as a claim about the underlying model.
"""
from __future__ import annotations

import asyncio
import io
import re
import struct
import wave
from collections import OrderedDict
from dataclasses import dataclass
from typing import Any, Optional

TTS_MODEL = "gemini-2.5-flash-preview-tts"
TTS_MODEL_PRO = "gemini-2.5-pro-preview-tts"
STT_MODEL = "gemini-2.5-flash"

PCM_RATE = 24000
PCM_WIDTH = 2      # 16-bit
PCM_CHANNELS = 1

MAX_TTS_CHARS = 4000


class VoiceError(RuntimeError):
    """Gemini voice failed for a reason the caller should report."""


class VoiceQuotaError(VoiceError):
    """Rate limited / out of quota — the caller should fall back, not fail."""


# ── Language detection ───────────────────────────────────────────────────
_DEVANAGARI = re.compile(r"[ऀ-ॿ]")

# Romanised Hindi markers. Deliberately common, short, and unambiguous enough
# that they do not fire on ordinary English text.
_HINGLISH_WORDS = re.compile(
    r"\b(hai|hain|nahi|nahin|kya|kyun|kaise|kaisa|kaisi|aap|tum|tumhara|mera|meri|"
    r"apna|abhi|thoda|bahut|bohot|acha|achha|theek|thik|chalo|karo|karna|karte|"
    r"karenge|kar|raha|rahi|rahe|gaya|gayi|hoga|hogi|dost|yaar|arre|arey|bhai|"
    r"matlab|lekin|magar|phir|fir|sab|kuch|koi|jaldi|aaj|kal|din|baat|samajh|"
    r"bilkul|zaroor|shukriya|dhanyavaad|namaste|haan|nahi|mat|mujhe|tujhe|humein)\b",
    re.I,
)


def detect_language(text: str) -> str:
    """
    Best guess at the language code for a reply.

    Returns `hi-IN` for Devanagari or clearly Hinglish text, `en-IN` otherwise.
    English is still tagged `en-IN` on purpose: Madhav's English should sound
    Indian, not American.
    """
    if not text:
        return "en-IN"
    if _DEVANAGARI.search(text):
        return "hi-IN"
    hits = len(_HINGLISH_WORDS.findall(text))
    words = max(1, len(text.split()))
    # Two markers, or one in a short line, is enough — Hinglish replies are
    # mostly English with a few Hindi words carrying the warmth.
    if hits >= 2 or (hits == 1 and words <= 12):
        return "hi-IN"
    return "en-IN"


# ── Voice presets ────────────────────────────────────────────────────────
@dataclass(frozen=True)
class VoicePreset:
    id: str
    label: str
    voice: str            # Gemini prebuilt voice name
    style: str            # accent + tone direction, sent with every request
    description: str
    default_for: tuple[str, ...] = ()

    def as_dict(self) -> dict[str, Any]:
        return {
            "id": self.id, "label": self.label, "voice": self.voice,
            "description": self.description,
            "default_for": list(self.default_for),
        }


_INDIAN_ACCENT = (
    "Speak with a natural Indian accent. Pronounce Hindi words the way a Hindi "
    "speaker would, and English words the way they are spoken in India — do not "
    "flatten them into an American accent."
)

VOICE_PRESETS: dict[str, VoicePreset] = {
    "madhav_warm": VoicePreset(
        id="madhav_warm", label="Madhav — warm", voice="Leda",
        style=(
            f"{_INDIAN_ACCENT} You are a bright, affectionate young companion. "
            "Warm, unhurried, a little playful. Never sing-song, never theatrical."
        ),
        description=(
            "Bright and affectionate. Gemini voice 'Leda' with an Indian-accent "
            "direction — handles Hindi, Hinglish and Indian English."
        ),
        default_for=("krishna",),
    ),
    "madhav_calm": VoicePreset(
        id="madhav_calm", label="Madhav — calm", voice="Aoede",
        style=(
            f"{_INDIAN_ACCENT} Speak gently and slowly, with space between "
            "sentences. Steady and reassuring, the way you would speak to "
            "someone who has had a hard day."
        ),
        description="Slower and gentler. Good for reflection, night mode and difficult moments.",
    ),
    "madhav_bright": VoicePreset(
        id="madhav_bright", label="Madhav — playful", voice="Puck",
        style=(
            f"{_INDIAN_ACCENT} Light, mischievous and quick, like a friend "
            "teasing you out of procrastination. Keep it friendly, never mocking."
        ),
        description="Lighter and quicker. Suits playful mode and celebrations.",
    ),
    "indian_female": VoicePreset(
        id="indian_female", label="Indian English — female", voice="Kore",
        style=(
            f"{_INDIAN_ACCENT} Clear, friendly and professional. Even pacing."
        ),
        description="Neutral and clear. Gemini voice 'Kore' directed to Indian English.",
        default_for=("panda",),
    ),
    "indian_male": VoicePreset(
        id="indian_male", label="Indian English — male", voice="Charon",
        style=(
            f"{_INDIAN_ACCENT} Grounded and steady, with an easy conversational rhythm."
        ),
        description="Deeper and steady. Gemini voice 'Charon' directed to Indian English.",
    ),
    "hamster_squeak": VoicePreset(
        id="hamster_squeak", label="Hammy — chirpy", voice="Zephyr",
        style=(
            "Speak in a bright, energetic, slightly high-pitched and chirpy way, "
            "like a small excitable cartoon pet. Keep it clear, not shrill."
        ),
        description="Bright and energetic. The hamster buddy's voice.",
        default_for=("hamster",),
    ),
}

DEFAULT_PRESET = "madhav_warm"


def preset_for(preset_id: Optional[str] = None,
               buddy_type: Optional[str] = None) -> VoicePreset:
    """Resolve a preset by id, then by buddy, then the default."""
    if preset_id and preset_id in VOICE_PRESETS:
        return VOICE_PRESETS[preset_id]
    if buddy_type:
        buddy = buddy_type.strip().lower()
        for p in VOICE_PRESETS.values():
            if buddy in p.default_for:
                return p
    return VOICE_PRESETS[DEFAULT_PRESET]


def list_presets() -> list[dict[str, Any]]:
    return [p.as_dict() for p in VOICE_PRESETS.values()]


# ── Audio helpers ────────────────────────────────────────────────────────
def _rate_from_mime(mime: Optional[str]) -> int:
    """Read the sample rate out of `audio/L16;codec=pcm;rate=24000`."""
    if not mime:
        return PCM_RATE
    match = re.search(r"rate=(\d+)", mime)
    return int(match.group(1)) if match else PCM_RATE


def pcm_to_wav(pcm: bytes, rate: int = PCM_RATE, channels: int = PCM_CHANNELS,
               width: int = PCM_WIDTH) -> bytes:
    """Wrap raw little-endian PCM in a WAV container so a browser can play it."""
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wav:
        wav.setnchannels(channels)
        wav.setsampwidth(width)
        wav.setframerate(rate)
        wav.writeframes(pcm)
    return buf.getvalue()


def wav_duration_seconds(wav_bytes: bytes) -> float:
    try:
        with wave.open(io.BytesIO(wav_bytes), "rb") as wav:
            return round(wav.getnframes() / float(wav.getframerate()), 2)
    except (wave.Error, ZeroDivisionError, struct.error):
        return 0.0


# ── Prompt construction ──────────────────────────────────────────────────
def build_tts_prompt(text: str, style: str, language: str) -> str:
    """
    The instruction wrapper that makes this a TTS request rather than a chat
    turn. Without it the model may answer the text instead of reading it.
    """
    if language == "hi-IN":
        language_note = (
            "The text is Hindi or Hinglish (Hindi written in Roman script). Read "
            "Hindi words with correct Hindi pronunciation, and read the English "
            "words in it naturally, the way a bilingual Indian speaker switches "
            "between them mid-sentence."
        )
    else:
        language_note = "The text is Indian English. Read it as an Indian speaker would."

    return (
        "Read the transcript below aloud. Output audio only — do not answer it, "
        "do not comment on it, do not add or remove any words.\n"
        f"{style}\n{language_note}\n\n"
        f"TRANSCRIPT:\n{text}"
    )


# Speech should carry the words, not the punctuation used to lay them out.
_SPEECH_STRIP = re.compile(r"[*_`#>~|]")
_HEADING = re.compile(r"^#{1,6}\s*", re.MULTILINE)
_EMOJI = re.compile(
    "[\U0001F300-\U0001FAFF☀-➿️‍⬀-⯿]", flags=re.UNICODE
)


def clean_for_speech(text: str) -> str:
    out = _HEADING.sub("", text or "")
    out = _SPEECH_STRIP.sub("", out)
    out = _EMOJI.sub("", out)
    out = re.sub(r"\n{2,}", "\n", out)
    out = re.sub(r"[ \t]{2,}", " ", out)
    return out.strip()


# ── A tiny cache, because free-tier quota is scarce ──────────────────────
_CACHE: "OrderedDict[tuple, bytes]" = OrderedDict()
_CACHE_LIMIT = 24


def _cache_get(key: tuple) -> Optional[bytes]:
    audio = _CACHE.get(key)
    if audio is not None:
        _CACHE.move_to_end(key)
    return audio


def _cache_put(key: tuple, audio: bytes) -> None:
    _CACHE[key] = audio
    _CACHE.move_to_end(key)
    while len(_CACHE) > _CACHE_LIMIT:
        _CACHE.popitem(last=False)


def clear_cache() -> None:
    _CACHE.clear()


def _is_quota_error(exc: Exception) -> bool:
    text = str(exc)
    return "429" in text or "RESOURCE_EXHAUSTED" in text or "quota" in text.lower()


# ── TTS ──────────────────────────────────────────────────────────────────
def synthesize_sync(
    text: str,
    api_key: str,
    preset_id: Optional[str] = None,
    buddy_type: Optional[str] = None,
    voice: Optional[str] = None,
    language: Optional[str] = None,
    model: Optional[str] = None,
) -> tuple[bytes, dict[str, Any]]:
    """Synthesize WAV bytes. Returns (wav, metadata). Raises VoiceError on failure."""
    from google import genai
    from google.genai import types

    spoken = clean_for_speech(text)
    if not spoken:
        raise VoiceError("Nothing to speak once formatting was stripped.")
    if len(spoken) > MAX_TTS_CHARS:
        # Cut on a sentence boundary rather than mid-word.
        cut = spoken[:MAX_TTS_CHARS]
        spoken = cut[: cut.rfind(".") + 1] or cut

    preset = preset_for(preset_id, buddy_type)
    voice_name = voice or preset.voice
    lang = language or detect_language(spoken)
    model_name = model or TTS_MODEL

    key = (spoken, voice_name, lang, model_name, preset.id)
    cached = _cache_get(key)
    if cached is not None:
        return cached, {
            "voice": voice_name, "preset": preset.id, "language": lang,
            "model": model_name, "cached": True,
            "duration_seconds": wav_duration_seconds(cached),
        }

    client = genai.Client(api_key=api_key)
    speech_config = types.SpeechConfig(
        voice_config=types.VoiceConfig(
            prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=voice_name)
        ),
        language_code=lang,
    )
    try:
        response = client.models.generate_content(
            model=model_name,
            contents=build_tts_prompt(spoken, preset.style, lang),
            config=types.GenerateContentConfig(
                response_modalities=["AUDIO"], speech_config=speech_config
            ),
        )
    except Exception as exc:
        if _is_quota_error(exc):
            raise VoiceQuotaError(
                "Gemini TTS is rate-limited right now (free-tier quota)."
            ) from exc
        raise VoiceError(f"Gemini TTS failed: {exc}") from exc

    part = _first_audio_part(response)
    if part is None:
        raise VoiceError(
            "Gemini returned no audio for this text. (The TTS model refuses "
            "requests it reads as chat rather than a transcript.)"
        )

    rate = _rate_from_mime(part.inline_data.mime_type)
    wav = pcm_to_wav(part.inline_data.data, rate=rate)
    _cache_put(key, wav)
    return wav, {
        "voice": voice_name, "preset": preset.id, "language": lang,
        "model": model_name, "cached": False,
        "duration_seconds": wav_duration_seconds(wav),
    }


def _first_audio_part(response: Any) -> Any:
    for candidate in getattr(response, "candidates", None) or []:
        content = getattr(candidate, "content", None)
        for part in (getattr(content, "parts", None) or []):
            inline = getattr(part, "inline_data", None)
            if inline is not None and inline.data:
                return part
    return None


async def synthesize(text: str, api_key: str, **kwargs: Any) -> tuple[bytes, dict[str, Any]]:
    return await asyncio.to_thread(synthesize_sync, text, api_key, **kwargs)


# ── STT ──────────────────────────────────────────────────────────────────
STT_INSTRUCTION = (
    "Transcribe this speech clip verbatim.\n"
    "The speaker is likely Indian and may mix Hindi and English in the same "
    "sentence (Hinglish). Write Hindi words in Roman script the way Indians "
    "normally type them (for example: 'kya haal hai', 'thoda focus karte hain'), "
    "unless the speaker is clearly speaking pure Hindi throughout, in which case "
    "use Devanagari.\n"
    "Do not translate. Do not answer the question. Do not add punctuation the "
    "speaker did not imply, and do not add any preamble or explanation.\n"
    "Output ONLY the transcription. If there is no intelligible speech, output "
    "nothing at all."
)


def transcribe_sync(audio_bytes: bytes, mime_type: str, api_key: str,
                    model: Optional[str] = None) -> str:
    from google import genai
    from google.genai import types

    mime = (mime_type or "audio/webm").split(";")[0].strip()
    if not mime or mime == "application/octet-stream":
        mime = "audio/webm"

    client = genai.Client(api_key=api_key)
    try:
        response = client.models.generate_content(
            model=model or STT_MODEL,
            contents=[
                types.Part.from_bytes(data=audio_bytes, mime_type=mime),
                STT_INSTRUCTION,
            ],
        )
    except Exception as exc:
        if _is_quota_error(exc):
            raise VoiceQuotaError("Gemini STT is rate-limited right now.") from exc
        raise VoiceError(f"Gemini STT failed: {exc}") from exc

    return (response.text or "").strip()


async def transcribe(audio_bytes: bytes, mime_type: str, api_key: str,
                     model: Optional[str] = None) -> str:
    return await asyncio.to_thread(transcribe_sync, audio_bytes, mime_type, api_key, model)
