"""
The voice provider registry and the fallback chain runner.

Every speech provider in the app is declared here once, with what it can do
and what it needs, and both `/voice/speak` and `/voice/converse` go through
the same two functions. That means STT and TTS are chosen **independently**
(Sarvam ears with Cartesia voice is a valid combination), each has its own
ordered fallback list, and all of it comes from config rather than from an
`if` ladder buried in a route.

Two rules the runner enforces:

  * **A provider that cannot work is skipped, not attempted.** No key, no
    capability, not on this OS — it never gets a turn, and the reason is
    recorded.
  * **Every failure is reported, never swallowed.** The result carries an
    `attempts` list saying what was tried and why each one failed, so the UI
    can explain a fallback instead of silently sounding different.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable, Optional

from voice import apple_voice, cartesia_voice, deepgram_voice, sarvam_voice
from voice import gemini_voice as gemini


@dataclass(frozen=True)
class Provider:
    id: str
    label: str
    supports_tts: bool
    supports_stt: bool
    description: str
    key_field: Optional[str] = None        # field on config.api_keys
    header: Optional[str] = None           # the X-*-Key header that overrides it
    client_side: bool = False              # the browser does it; server can't
    local: bool = False                    # no network, no key
    indian_voices: str = "none"            # native | directed | none
    languages: tuple[str, ...] = ()
    notes: str = ""

    def as_dict(self) -> dict[str, Any]:
        return {
            "id": self.id, "label": self.label,
            "supports_tts": self.supports_tts, "supports_stt": self.supports_stt,
            "description": self.description, "key_field": self.key_field,
            "client_side": self.client_side, "local": self.local,
            "indian_voices": self.indian_voices,
            "languages": list(self.languages), "notes": self.notes,
        }


PROVIDERS: dict[str, Provider] = {
    "gemini": Provider(
        id="gemini", label="Gemini", supports_tts=True, supports_stt=True,
        key_field="gemini_key", header="x_gemini_key",
        description=(
            "Google Gemini. Transcribes Hinglish accurately in Roman script; "
            "expressive TTS."
        ),
        indian_voices="directed",
        languages=("hi-IN", "en-IN"),
        notes=(
            "Voices are language-agnostic — the Indian accent comes from a style "
            "instruction, not a locale-specific voice. Free-tier TTS is heavily "
            "rate-limited."
        ),
    ),
    "sarvam": Provider(
        id="sarvam", label="Sarvam AI", supports_tts=True, supports_stt=True,
        key_field="sarvam_key", header="x_sarvam_key",
        description="Built for Indian languages. Natively Indian voices, not accented ones.",
        indian_voices="native",
        languages=sarvam_voice.LANGUAGES,
        notes=(
            "Best fidelity for Hindi and Hinglish — on a test clip it produced "
            "accurate Devanagari where others translated or dropped words. TTS "
            "caps at 2500 characters."
        ),
    ),
    "cartesia": Provider(
        id="cartesia", label="Cartesia", supports_tts=True, supports_stt=True,
        key_field="cartesia_key", header="x_cartesia_key",
        description="Sonic TTS and Ink-Whisper STT. Low latency, many languages.",
        indian_voices="native",
        languages=("hi", "en", "ta", "te", "ur", "or"),
        notes=(
            "Genuine Hindi voices for TTS. Its STT *translates* rather than "
            "transcribes mixed Hindi/English — a Hinglish clip came back as "
            "English — so prefer Sarvam or Gemini for Hinglish listening."
        ),
    ),
    "deepgram": Provider(
        id="deepgram", label="Deepgram", supports_tts=True, supports_stt=True,
        key_field="deepgram_key", header="x_deepgram_key",
        description="Nova STT and Aura TTS. Fast and accurate for English.",
        indian_voices="none",
        languages=("en",),
        notes=(
            "English only in both directions. Aura has no Hindi voice, and Nova "
            "dropped most Hindi words from a Hinglish test clip. Fine for "
            "English, wrong for Hinglish."
        ),
    ),
    "fish_audio": Provider(
        id="fish_audio", label="Fish Audio", supports_tts=True, supports_stt=False,
        key_field="fish_audio_key", header="x_fish_audio_key",
        description="Per-character cloned voices. TTS only.",
        indian_voices="none",
        notes="Needs a voice model id per character (FISH_AUDIO_ID_<CHARACTER>).",
    ),
    "apple": Provider(
        id="apple", label="Apple (local)", supports_tts=True, supports_stt=False,
        local=True,
        description="macOS `say`. No key, no network — always there as a last resort.",
        indian_voices="native",
        languages=("en-IN", "en-US", "en-GB"),
        notes="Indian English voices (Rishi, Aman, Tara) if installed on the Mac.",
    ),
    "browser": Provider(
        id="browser", label="Browser (local)", supports_tts=True, supports_stt=True,
        local=True, client_side=True,
        description="The browser's own SpeechRecognition and speechSynthesis.",
        indian_voices="none",
        notes=(
            "Runs in the client, so the backend never handles it — selecting it "
            "means the frontend does the work locally. Unreliable inside Electron, "
            "whose Chromium has no speech key."
        ),
    ),
}

TTS_PROVIDERS = tuple(p.id for p in PROVIDERS.values() if p.supports_tts)
STT_PROVIDERS = tuple(p.id for p in PROVIDERS.values() if p.supports_stt)

# Used when config has no explicit order. Indian-capable providers first, and
# the local one last so there is always something that can speak.
DEFAULT_TTS_CHAIN = ("gemini", "sarvam", "cartesia", "fish_audio", "deepgram", "apple")
DEFAULT_STT_CHAIN = ("gemini", "sarvam", "cartesia", "deepgram")


@dataclass
class Spoken:
    audio: bytes
    media_type: str
    provider: str
    meta: dict[str, Any] = field(default_factory=dict)
    attempts: list[dict[str, str]] = field(default_factory=list)


@dataclass
class Heard:
    transcript: str
    provider: str
    meta: dict[str, Any] = field(default_factory=dict)
    attempts: list[dict[str, str]] = field(default_factory=list)


class NoProviderError(RuntimeError):
    """Nothing in the chain could do the job. Carries every attempt's reason."""

    def __init__(self, message: str, attempts: list[dict[str, str]]):
        super().__init__(message)
        self.attempts = attempts


# ── Key resolution ───────────────────────────────────────────────────────
def resolve_keys(config: Any, header_keys: Optional[dict[str, str]] = None) -> dict[str, str]:
    """
    Which provider ids currently have a usable credential.

    Client-supplied headers win over the server config, which is how keys can
    live in browser LocalStorage and never touch server disk.
    """
    import os

    headers = header_keys or {}
    resolved: dict[str, str] = {}
    for provider in PROVIDERS.values():
        if provider.local:
            if provider.id == "apple" and apple_voice.is_available():
                resolved[provider.id] = "local"
            elif provider.id == "browser":
                resolved[provider.id] = "client"
            continue
        if not provider.key_field:
            continue
        value = (
            headers.get(provider.id)
            or getattr(config.api_keys, provider.key_field, "")
            or os.getenv(provider.key_field.upper())
            or os.getenv(provider.key_field.upper().replace("_KEY", "_API_KEY"))
            or ""
        )
        if value:
            resolved[provider.id] = value.strip()
    return resolved


def build_chain(preferred: Optional[str], configured: Optional[list[str]],
                capability: str) -> list[str]:
    """
    The order to try, de-duplicated: the explicit choice first, then the
    user's configured fallbacks, then the built-in defaults as a backstop.
    """
    default = DEFAULT_TTS_CHAIN if capability == "tts" else DEFAULT_STT_CHAIN
    supported = TTS_PROVIDERS if capability == "tts" else STT_PROVIDERS

    order: list[str] = []
    for candidate in [preferred, *(configured or []), *default]:
        if not candidate:
            continue
        pid = str(candidate).strip().lower()
        if pid in supported and pid not in order:
            order.append(pid)
    return order


def _skip_reason(provider: Provider, keys: dict[str, str], capability: str) -> Optional[str]:
    if capability == "tts" and not provider.supports_tts:
        return "does not do text-to-speech"
    if capability == "stt" and not provider.supports_stt:
        return "does not do speech-to-text"
    if provider.client_side:
        return "runs in the browser, not on the server"
    if provider.id not in keys:
        if provider.local:
            return "not available on this machine"
        return "no API key configured"
    return None


# ── TTS chain ────────────────────────────────────────────────────────────
async def synthesize_with_chain(
    text: str,
    *,
    keys: dict[str, str],
    chain: list[str],
    settings: dict[str, Any],
    language: Optional[str] = None,
    character: Optional[str] = None,
) -> Spoken:
    """
    Speak `text` with the first provider in `chain` that can.

    `settings` carries the per-provider choices from config (voice ids,
    speakers, models) so this function stays free of provider trivia.
    """
    attempts: list[dict[str, str]] = []

    for pid in chain:
        provider = PROVIDERS.get(pid)
        if provider is None:
            attempts.append({"provider": pid, "error": "unknown provider"})
            continue
        skip = _skip_reason(provider, keys, "tts")
        if skip:
            attempts.append({"provider": pid, "error": skip})
            continue

        try:
            audio, meta, media_type = await _synthesize_one(
                pid, text, keys[pid], settings, language, character
            )
            return Spoken(audio, media_type, pid, meta, attempts)
        except Exception as exc:
            attempts.append({"provider": pid, "error": str(exc)[:300]})

    raise NoProviderError(
        "No speech provider could synthesize this. "
        + "; ".join(f"{a['provider']}: {a['error']}" for a in attempts),
        attempts,
    )


async def _synthesize_one(pid: str, text: str, key: str, settings: dict[str, Any],
                          language: Optional[str],
                          character: Optional[str]) -> tuple[bytes, dict[str, Any], str]:
    if pid == "gemini":
        audio, meta = await gemini.synthesize(
            text, key,
            preset_id=settings.get("gemini_voice"),
            buddy_type=character,
            language=language,
            model=settings.get("gemini_tts_model") or None,
        )
        return audio, meta, "audio/wav"

    if pid == "sarvam":
        audio, meta = await sarvam_voice.synthesize(
            text, key,
            speaker=settings.get("sarvam_speaker"),
            language=language or "hi-IN",
            model=settings.get("sarvam_tts_model") or None,
        )
        return audio, meta, "audio/wav"

    if pid == "cartesia":
        audio, meta = await cartesia_voice.synthesize(
            text, key,
            voice_id=settings.get("cartesia_voice_id") or None,
            language=language,
            model=settings.get("cartesia_tts_model") or None,
        )
        return audio, meta, "audio/wav"

    if pid == "deepgram":
        audio, meta = await deepgram_voice.synthesize(
            text, key, voice=settings.get("tts_voice")
        )
        return audio, meta, "audio/mpeg"

    if pid == "fish_audio":
        from voice.fish_audio_manager import get_character_reference_id, synthesize_fish_audio

        ref_id = settings.get("fish_audio_reference_id") or \
            get_character_reference_id(character or "hamster")
        if not ref_id:
            raise RuntimeError(f"no voice model id for character '{character}'")
        audio = await synthesize_fish_audio(
            text=text, character=character or "hamster", api_key=key,
            reference_id=ref_id, model=settings.get("fish_audio_model"),
        )
        return audio, {"reference_id": ref_id}, "audio/mpeg"

    if pid == "apple":
        audio, meta = await apple_voice.synthesize(text, voice=settings.get("apple_voice"))
        return audio, meta, "audio/wav"

    raise RuntimeError(f"{pid} has no synthesis implementation")


# ── STT chain ────────────────────────────────────────────────────────────
async def transcribe_with_chain(
    audio_bytes: bytes,
    mime_type: str,
    *,
    keys: dict[str, str],
    chain: list[str],
    settings: dict[str, Any],
    language: Optional[str] = None,
) -> Heard:
    attempts: list[dict[str, str]] = []

    for pid in chain:
        provider = PROVIDERS.get(pid)
        if provider is None:
            attempts.append({"provider": pid, "error": "unknown provider"})
            continue
        skip = _skip_reason(provider, keys, "stt")
        if skip:
            attempts.append({"provider": pid, "error": skip})
            continue

        try:
            transcript, meta = await _transcribe_one(
                pid, audio_bytes, mime_type, keys[pid], settings, language
            )
        except Exception as exc:
            attempts.append({"provider": pid, "error": str(exc)[:300]})
            continue

        if transcript:
            return Heard(transcript, pid, meta, attempts)
        # Understood the request but heard nothing — try the next set of ears
        # rather than reporting silence as a provider failure.
        attempts.append({"provider": pid, "error": "no speech detected"})

    raise NoProviderError(
        "No provider could transcribe that. "
        + "; ".join(f"{a['provider']}: {a['error']}" for a in attempts),
        attempts,
    )


async def _transcribe_one(pid: str, audio_bytes: bytes, mime_type: str, key: str,
                          settings: dict[str, Any],
                          language: Optional[str]) -> tuple[str, dict[str, Any]]:
    if pid == "gemini":
        text = await gemini.transcribe(audio_bytes, mime_type, key)
        return text, {"model": gemini.STT_MODEL}

    if pid == "sarvam":
        model = settings.get("sarvam_stt_model") or sarvam_voice.STT_MODEL
        text = await sarvam_voice.transcribe(
            audio_bytes, mime_type, key, language=language, model=model
        )
        return text, {"model": model}

    if pid == "cartesia":
        model = settings.get("cartesia_stt_model") or cartesia_voice.STT_MODEL
        text = await cartesia_voice.transcribe(
            audio_bytes, mime_type, key, language=language, model=model
        )
        return text, {"model": model}

    if pid == "deepgram":
        model = settings.get("deepgram_model") or deepgram_voice.STT_MODEL
        text = await deepgram_voice.transcribe(audio_bytes, mime_type, key, model=model)
        return text, {"model": model}

    raise RuntimeError(f"{pid} has no transcription implementation")


# ── Introspection for the Config screen ──────────────────────────────────
async def catalog(config: Any, keys: dict[str, str],
                  include_remote_voices: bool = True) -> dict[str, Any]:
    """The capability matrix plus each provider's voices, for the picker."""
    voices: dict[str, list[dict[str, Any]]] = {
        "gemini": gemini.list_presets(),
        "sarvam": sarvam_voice.list_voices(),
        "deepgram": deepgram_voice.list_voices(),
        "apple": await apple_voice.list_voices(),
        "browser": [],
        "fish_audio": [],
        "cartesia": [],
    }
    if include_remote_voices and "cartesia" in keys:
        voices["cartesia"] = await cartesia_voice.list_voices(keys["cartesia"])

    return {
        "providers": [
            {**p.as_dict(), "available": p.id in keys,
             "unavailable_reason": (
                 None if p.id in keys
                 else "runs in the browser" if p.client_side
                 else "not available on this machine" if p.local
                 else "no API key configured"
             )}
            for p in PROVIDERS.values()
        ],
        "voices": voices,
        "tts_providers": list(TTS_PROVIDERS),
        "stt_providers": list(STT_PROVIDERS),
        "default_tts_chain": list(DEFAULT_TTS_CHAIN),
        "default_stt_chain": list(DEFAULT_STT_CHAIN),
    }
