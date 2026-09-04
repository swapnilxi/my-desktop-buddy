"""
Voice routes — STT, TTS and the end-to-end voice conversation.

Provider selection lives in `voice/providers.py`, not here. This module's job
is to turn config plus request headers into a chain, hand it to the runner,
and shape the response. That is what makes the whole thing configurable:
adding a provider means adding it to the registry, not editing an if-ladder in
a route.

STT and TTS are independent. "Sarvam ears, Cartesia voice" is a valid
combination, each has its own ordered fallback list, and a provider that
cannot work (no key, wrong capability, not on this OS) is skipped with a
recorded reason rather than attempted.

`POST /voice/converse` is the one that matters for voice: audio in, and one
response carrying the transcript, the orchestrated reply (Gita retrieval,
memory and productivity context included) and the spoken audio. A single round
trip is what makes voice feel immediate instead of stuttery.

Voice synthesis is never allowed to break a conversation: if every TTS
provider fails, `/voice/converse` still returns the transcript and the reply,
with `voice_error` explaining why there is no audio.
"""
import base64
import json
import os
from typing import Any, Optional

from fastapi import APIRouter, Form, HTTPException, Request, Header
from fastapi.responses import Response
from pydantic import BaseModel

from config_manager import get_config
from voice import gemini_voice as GV
from voice import providers as P

router = APIRouter(prefix="/voice", tags=["voice"])


class SpeakRequest(BaseModel):
    # Optional so /voice/test can audition a provider with its own sample
    # sentence. /speak still rejects an empty string with a 400.
    text: str = ""
    voice: Optional[str] = None
    character: Optional[str] = None
    provider: Optional[str] = None
    preset: Optional[str] = None
    language: Optional[str] = None


# ── Turning a request into a chain ───────────────────────────────────────
def _header_keys(**headers: Optional[str]) -> dict[str, str]:
    """Client-supplied keys, mapped onto provider ids."""
    mapping = {
        "gemini": headers.get("x_gemini_key"),
        "deepgram": headers.get("x_deepgram_key"),
        "fish_audio": headers.get("x_fish_audio_key"),
        "cartesia": headers.get("x_cartesia_key"),
        "sarvam": headers.get("x_sarvam_key"),
    }
    return {pid: v.strip() for pid, v in mapping.items() if v and v.strip()}


def _voice_settings(config: Any, overrides: Optional[dict[str, Any]] = None) -> dict[str, Any]:
    """The per-provider choices the chain runner needs, config first."""
    v = config.voice
    settings: dict[str, Any] = {
        "gemini_voice": v.gemini_voice,
        "gemini_tts_model": v.gemini_tts_model,
        "sarvam_speaker": v.sarvam_speaker,
        "sarvam_tts_model": v.sarvam_tts_model,
        "sarvam_stt_model": v.sarvam_stt_model,
        "cartesia_voice_id": v.cartesia_voice_id,
        "cartesia_tts_model": v.cartesia_tts_model,
        "cartesia_stt_model": v.cartesia_stt_model,
        "deepgram_model": v.deepgram_model,
        "tts_voice": v.tts_voice,
        "apple_voice": v.apple_voice,
        "fish_audio_model": v.fish_audio_model,
    }
    settings.update({k: val for k, val in (overrides or {}).items() if val})
    return settings


def _voice_override(provider: Optional[str], voice: Optional[str]) -> dict[str, Any]:
    """
    A one-off `voice` argument, routed to whichever setting that provider uses.

    Each provider names its voice differently (a preset id, a speaker name, a
    UUID, an Aura model, a macOS voice), so a bare `voice=` has to be mapped
    rather than passed through.
    """
    if not voice:
        return {}
    return {
        "gemini": {"gemini_voice": voice},
        "sarvam": {"sarvam_speaker": voice},
        "cartesia": {"cartesia_voice_id": voice},
        "deepgram": {"tts_voice": voice},
        "apple": {"apple_voice": voice},
        "fish_audio": {"fish_audio_reference_id": voice},
    }.get((provider or "").lower(), {})


def _resolve_language(config: Any, requested: Optional[str], text: str = "") -> Optional[str]:
    """
    'auto' means detect per reply; anything else is the user pinning it in
    Config, and that wins over detection.
    """
    if requested:
        return requested
    configured = (config.voice.voice_language or "auto").strip()
    if configured and configured.lower() != "auto":
        return configured
    return GV.detect_language(text) if text else None


async def _read_audio_upload(request: Request) -> tuple[bytes, str]:
    """Pull audio out of a multipart upload or a raw body."""
    raw_content_type = request.headers.get("content-type") or ""
    if raw_content_type.startswith("multipart/form-data"):
        form = await request.form()
        upload = form.get("audio")
        if upload is None or not hasattr(upload, "read"):
            raise HTTPException(status_code=400, detail="No 'audio' file field in upload.")
        audio_bytes = await upload.read()
        content_type = getattr(upload, "content_type", None) or "audio/webm"
    else:
        audio_bytes = await request.body()
        content_type = raw_content_type or "audio/webm"
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio upload.")
    return audio_bytes, content_type


# ══════════════════════════════════════════════════════════════════════════
# Introspection — what the Config screen needs
# ══════════════════════════════════════════════════════════════════════════
@router.get("/providers")
async def providers(
    x_gemini_key: Optional[str] = Header(None),
    x_deepgram_key: Optional[str] = Header(None),
    x_fish_audio_key: Optional[str] = Header(None),
    x_cartesia_key: Optional[str] = Header(None),
    x_sarvam_key: Optional[str] = Header(None),
) -> dict[str, Any]:
    """
    The capability matrix: every provider, what it can do, whether it is
    usable right now, and the voices it offers.

    `available: false` always comes with `unavailable_reason`, so the Config
    screen can say "no API key configured" rather than greying something out
    without explanation.
    """
    config = get_config()
    keys = P.resolve_keys(config, _header_keys(
        x_gemini_key=x_gemini_key, x_deepgram_key=x_deepgram_key,
        x_fish_audio_key=x_fish_audio_key, x_cartesia_key=x_cartesia_key,
        x_sarvam_key=x_sarvam_key,
    ))
    data = await P.catalog(config, keys)
    v = config.voice
    data["selected"] = {
        "tts_provider": v.tts_provider,
        "stt_provider": v.stt_provider,
        "tts_fallback": list(v.tts_fallback or []),
        "stt_fallback": list(v.stt_fallback or []),
        "language": v.voice_language,
        "autoplay": v.voice_autoplay,
        "voices": {
            "gemini": v.gemini_voice, "sarvam": v.sarvam_speaker,
            "cartesia": v.cartesia_voice_id, "deepgram": v.tts_voice,
            "apple": v.apple_voice,
        },
    }
    data["effective_tts_chain"] = P.build_chain(v.tts_provider, list(v.tts_fallback or []), "tts")
    data["effective_stt_chain"] = P.build_chain(v.stt_provider, list(v.stt_fallback or []), "stt")
    return data


@router.get("/voices")
async def voices(
    provider: Optional[str] = None,
    x_gemini_key: Optional[str] = Header(None),
    x_cartesia_key: Optional[str] = Header(None),
) -> dict[str, Any]:
    """
    Voices for one provider, or all of them.

    Kept alongside /providers because the Config picker asks for a single
    provider's voices when the user switches provider.
    """
    config = get_config()
    keys = P.resolve_keys(config, _header_keys(
        x_gemini_key=x_gemini_key, x_cartesia_key=x_cartesia_key,
    ))
    catalog = await P.catalog(config, keys)
    if provider:
        pid = provider.strip().lower()
        if pid not in P.PROVIDERS:
            raise HTTPException(status_code=404, detail=f"No provider called {provider!r}.")
        return {"provider": pid, "voices": catalog["voices"].get(pid, [])}

    # Back-compat: this route used to return only the Gemini presets.
    return {
        "presets": catalog["voices"]["gemini"],
        "default": GV.DEFAULT_PRESET,
        "selected": config.voice.gemini_voice or GV.DEFAULT_PRESET,
        "gemini_available": "gemini" in keys,
        "languages": ["hi-IN", "en-IN"],
        "model": config.voice.gemini_tts_model or GV.TTS_MODEL,
        "voices": catalog["voices"],
        "note": (
            "Gemini prebuilt voices are language-agnostic. The Indian accent and "
            "the Hindi/Hinglish handling come from the per-preset style "
            "instruction plus the detected language code, not from a locale-"
            "specific voice model. Sarvam, Cartesia and macOS `say` do offer "
            "natively Indian voices."
        ),
    }


# ══════════════════════════════════════════════════════════════════════════
# STT
# ══════════════════════════════════════════════════════════════════════════
@router.post("/transcribe")
async def transcribe(
    request: Request,
    provider: Optional[str] = None,
    language: Optional[str] = None,
    x_gemini_key: Optional[str] = Header(None),
    x_deepgram_key: Optional[str] = Header(None),
    x_cartesia_key: Optional[str] = Header(None),
    x_sarvam_key: Optional[str] = Header(None),
    x_stt_provider: Optional[str] = Header(None),
) -> dict[str, Any]:
    """
    Speech to text, through the configured STT chain.

    Accepts multipart (field "audio") or a raw audio body.
    """
    config = get_config()
    keys = P.resolve_keys(config, _header_keys(
        x_gemini_key=x_gemini_key, x_deepgram_key=x_deepgram_key,
        x_cartesia_key=x_cartesia_key, x_sarvam_key=x_sarvam_key,
    ))
    audio_bytes, content_type = await _read_audio_upload(request)

    chain = P.build_chain(
        provider or x_stt_provider or config.voice.stt_provider,
        list(config.voice.stt_fallback or []), "stt",
    )
    try:
        heard = await P.transcribe_with_chain(
            audio_bytes, content_type, keys=keys, chain=chain,
            settings=_voice_settings(config),
            language=_resolve_language(config, language),
        )
    except P.NoProviderError as exc:
        # "Nothing heard" is a 422 the user can act on; a provider failure is
        # a 502 they cannot. Distinguishing them is the point.
        if all(a["error"] == "no speech detected" for a in exc.attempts if a):
            raise HTTPException(
                status_code=422,
                detail="Could not make out any speech. Try again, a little longer.",
            )
        raise HTTPException(status_code=502, detail=str(exc)[:500])

    return {
        "transcript": heard.transcript,
        "provider": heard.provider,
        "model": heard.meta.get("model"),
        "attempts": heard.attempts,
    }


# ══════════════════════════════════════════════════════════════════════════
# TTS
# ══════════════════════════════════════════════════════════════════════════
@router.post("/speak")
async def speak(
    request: SpeakRequest,
    x_gemini_key: Optional[str] = Header(None),
    x_deepgram_key: Optional[str] = Header(None),
    x_fish_audio_key: Optional[str] = Header(None),
    x_cartesia_key: Optional[str] = Header(None),
    x_sarvam_key: Optional[str] = Header(None),
    x_buddy_type: Optional[str] = Header(None),
    x_voice_mode: Optional[str] = Header(None),
    x_voice_preset: Optional[str] = Header(None),
):
    """
    Text to speech through the configured TTS chain.

    The provider and voice that actually spoke come back in
    `X-Voice-Provider` / `X-Voice-Meta`, which matters when the requested one
    was rate-limited and the chain fell through to another.
    """
    text = request.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="No text provided.")

    config = get_config()
    keys = P.resolve_keys(config, _header_keys(
        x_gemini_key=x_gemini_key, x_deepgram_key=x_deepgram_key,
        x_fish_audio_key=x_fish_audio_key, x_cartesia_key=x_cartesia_key,
        x_sarvam_key=x_sarvam_key,
    ))
    character = (
        request.character or x_buddy_type or config.hamster.buddy_type or "hamster"
    ).strip().lower()
    chosen = request.provider or x_voice_mode or config.voice.tts_provider

    overrides = _voice_override(chosen, request.voice)
    if request.preset or x_voice_preset:
        overrides["gemini_voice"] = request.preset or x_voice_preset

    chain = P.build_chain(chosen, list(config.voice.tts_fallback or []), "tts")
    try:
        spoken = await P.synthesize_with_chain(
            text, keys=keys, chain=chain,
            settings=_voice_settings(config, overrides),
            language=_resolve_language(config, request.language, text),
            character=character,
        )
    except P.NoProviderError as exc:
        raise HTTPException(status_code=502, detail=str(exc)[:500])

    return Response(
        content=spoken.audio,
        media_type=spoken.media_type,
        headers={
            "X-Voice-Provider": spoken.provider,
            "X-Voice-Meta": json.dumps(
                {**spoken.meta, "attempts": spoken.attempts}, ensure_ascii=False
            )[:1800],
        },
    )


@router.post("/test")
async def test_voice(
    request: SpeakRequest,
    x_gemini_key: Optional[str] = Header(None),
    x_deepgram_key: Optional[str] = Header(None),
    x_fish_audio_key: Optional[str] = Header(None),
    x_cartesia_key: Optional[str] = Header(None),
    x_sarvam_key: Optional[str] = Header(None),
) -> dict[str, Any]:
    """
    Audition one provider+voice from the Config screen.

    Unlike /speak this does NOT fall back: the point is to find out whether
    *this* provider works, so a failure is reported as a failure rather than
    quietly answered by a different voice.
    """
    config = get_config()
    keys = P.resolve_keys(config, _header_keys(
        x_gemini_key=x_gemini_key, x_deepgram_key=x_deepgram_key,
        x_fish_audio_key=x_fish_audio_key, x_cartesia_key=x_cartesia_key,
        x_sarvam_key=x_sarvam_key,
    ))
    pid = (request.provider or config.voice.tts_provider or "gemini").strip().lower()
    if pid not in P.PROVIDERS:
        raise HTTPException(status_code=404, detail=f"No provider called {pid!r}.")

    text = request.text.strip() or "Namaste dost. Chalo, aaj ka kaam shuru karte hain."
    overrides = _voice_override(pid, request.voice)
    try:
        spoken = await P.synthesize_with_chain(
            text, keys=keys, chain=[pid],
            settings=_voice_settings(config, overrides),
            language=_resolve_language(config, request.language, text),
            character=(request.character or config.hamster.buddy_type or "krishna").lower(),
        )
    except P.NoProviderError as exc:
        return {
            "ok": False, "provider": pid, "audio": None,
            "error": exc.attempts[0]["error"] if exc.attempts else str(exc),
            "attempts": exc.attempts,
        }

    return {
        "ok": True,
        "provider": spoken.provider,
        "audio": base64.b64encode(spoken.audio).decode("ascii"),
        "audio_mime": spoken.media_type,
        "meta": spoken.meta,
        "error": None,
    }


# ══════════════════════════════════════════════════════════════════════════
# End-to-end voice conversation
# ══════════════════════════════════════════════════════════════════════════
@router.post("/converse")
async def converse(
    request: Request,
    conversation_id: Optional[str] = Form(None),
    mode: Optional[str] = Form(None),
    buddy_name: Optional[str] = Form(None),
    user_name: Optional[str] = Form(None),
    speak_reply: bool = Form(True),
    x_user_id: Optional[str] = Header(None),
    x_gemini_key: Optional[str] = Header(None),
    x_deepseek_key: Optional[str] = Header(None),
    x_deepgram_key: Optional[str] = Header(None),
    x_fish_audio_key: Optional[str] = Header(None),
    x_cartesia_key: Optional[str] = Header(None),
    x_sarvam_key: Optional[str] = Header(None),
    x_llm_provider: Optional[str] = Header(None),
    x_gemini_model: Optional[str] = Header(None),
    x_deepseek_model: Optional[str] = Header(None),
    x_stt_provider: Optional[str] = Header(None),
    x_buddy_type: Optional[str] = Header(None),
    x_voice_mode: Optional[str] = Header(None),
    x_voice_preset: Optional[str] = Header(None),
) -> dict[str, Any]:
    """
    One round trip: speech in → transcript → orchestrated reply → speech out.

    The reply goes through the same `/krishna/chat` orchestrator, so voice gets
    the whole pipeline — Gita retrieval, memory, productivity context, tools —
    rather than the flat legacy prompt the mic used to reach.

    Conversation history is loaded server-side from `conversation_id`, because
    a multipart audio upload is a bad place to carry a transcript.

    Audio comes back as base64 in `audio` with its `audio_mime`. If every TTS
    provider fails, `audio` is null and `voice_error` says why — the transcript
    and the reply are still returned, because losing the answer because the
    voice failed would be the wrong trade.
    """
    from db import DEFAULT_USER_ID
    from krishna.orchestrator import load_history, respond

    config = get_config()
    user_id = (x_user_id or DEFAULT_USER_ID).strip() or DEFAULT_USER_ID
    keys = P.resolve_keys(config, _header_keys(
        x_gemini_key=x_gemini_key, x_deepgram_key=x_deepgram_key,
        x_fish_audio_key=x_fish_audio_key, x_cartesia_key=x_cartesia_key,
        x_sarvam_key=x_sarvam_key,
    ))
    audio_bytes, content_type = await _read_audio_upload(request)

    # ── 1. Speech → text ─────────────────────────────────────────────────
    stt_chain = P.build_chain(
        x_stt_provider or config.voice.stt_provider,
        list(config.voice.stt_fallback or []), "stt",
    )
    if not any(pid in keys for pid in stt_chain):
        raise HTTPException(
            status_code=400,
            detail=(
                "Voice chat needs a speech-recognition key — Gemini, Sarvam, "
                "Cartesia or Deepgram. Add one in Config → API Keys."
            ),
        )
    try:
        heard = await P.transcribe_with_chain(
            audio_bytes, content_type, keys=keys, chain=stt_chain,
            settings=_voice_settings(config),
            language=_resolve_language(config, None),
        )
    except P.NoProviderError as exc:
        if all(a["error"] == "no speech detected" for a in exc.attempts if a):
            raise HTTPException(
                status_code=422,
                detail="Could not make out any speech in that clip. Try again, a little longer.",
            )
        raise HTTPException(status_code=502, detail=str(exc)[:500])

    # ── 2. Text → orchestrated reply (the RAG pipeline) ──────────────────
    client_keys: dict[str, str] = {}
    if x_gemini_key:
        client_keys["gemini_key"] = x_gemini_key.strip()
    if x_deepseek_key:
        client_keys["deepseek_key"] = x_deepseek_key.strip()
    client_models: dict[str, str] = {}
    if x_gemini_model:
        client_models["gemini_model"] = x_gemini_model.strip()
    if x_deepseek_model:
        client_models["deepseek_model"] = x_deepseek_model.strip()

    history = load_history(user_id, conversation_id) if conversation_id else []

    try:
        reply = await respond(
            message=heard.transcript,
            history=history,
            mode=mode,
            user_id=user_id,
            user_name=user_name,
            buddy_name=buddy_name,
            conversation_id=conversation_id,
            client_provider=x_llm_provider,
            client_keys=client_keys or None,
            client_models=client_models or None,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Heard you ({heard.transcript!r}) but the reply failed: {exc}",
        )

    payload: dict[str, Any] = {
        **reply.as_dict(),
        "transcript": heard.transcript,
        "stt_provider": heard.provider,
        "stt_model": heard.meta.get("model"),
        "audio": None,
        "audio_mime": None,
        "voice_provider": None,
        "voice_meta": None,
        "voice_error": None,
    }

    # ── 3. Reply → speech ────────────────────────────────────────────────
    if not speak_reply:
        return payload

    character = (x_buddy_type or config.hamster.buddy_type or "krishna").strip().lower()
    overrides = {"gemini_voice": x_voice_preset} if x_voice_preset else {}
    tts_chain = P.build_chain(
        x_voice_mode or config.voice.tts_provider,
        list(config.voice.tts_fallback or []), "tts",
    )
    try:
        spoken = await P.synthesize_with_chain(
            reply.response, keys=keys, chain=tts_chain,
            settings=_voice_settings(config, overrides),
            language=_resolve_language(config, None, reply.response),
            character=character,
        )
        payload["audio"] = base64.b64encode(spoken.audio).decode("ascii")
        payload["audio_mime"] = spoken.media_type
        payload["voice_provider"] = spoken.provider
        payload["voice_meta"] = {**spoken.meta, "attempts": spoken.attempts}
    except P.NoProviderError as exc:
        # Deliberately not fatal: the user still gets the answer on screen.
        payload["voice_error"] = str(exc)[:400]
    except Exception as exc:
        payload["voice_error"] = str(exc)[:400]

    return payload
