"""
Voice layer tests — Gemini STT/TTS plumbing and the session lifecycle.

Nothing here calls the Gemini API. What is tested is the code that has to be
right *around* the API call: language detection, the instruction wrapper that
stops the TTS model answering the text instead of reading it, PCM→WAV
wrapping, the fallback chain when a provider is rate-limited, and the fact
that a voice failure never costs the user their reply.
"""
from __future__ import annotations

import io
import wave

import pytest

from voice import gemini_voice as GV


# ── Language detection ───────────────────────────────────────────────────
@pytest.mark.parametrize("text,expected", [
    ("Good morning, your first task is the presentation.", "en-IN"),
    ("नमस्ते दोस्त, आज का दिन कैसा रहा?", "hi-IN"),
    ("Arre dost, chalo thoda focus karte hain", "hi-IN"),
    ("Dost, aaj kaisa raha din?", "hi-IN"),
    ("I finished the report and shipped it.", "en-IN"),
    ("", "en-IN"),
])
def test_language_detection(text, expected):
    assert GV.detect_language(text) == expected


def test_english_is_tagged_indian_english_not_generic():
    """Madhav's English should sound Indian, so plain English is en-IN, not en-US."""
    assert GV.detect_language("Let's start with the presentation.") == "en-IN"


def test_devanagari_always_wins():
    assert GV.detect_language("Start karte hain — शुरू करते हैं") == "hi-IN"


# ── The instruction wrapper ──────────────────────────────────────────────
def test_tts_prompt_tells_the_model_to_read_not_answer():
    """
    Regression for a real 400 from the API: bare Devanagari made the TTS model
    reply "Model tried to generate text, but it should only be used for TTS".
    """
    prompt = GV.build_tts_prompt("नमस्ते", "be warm", "hi-IN")
    assert "Read the transcript below aloud" in prompt
    assert "do not answer it" in prompt
    assert "नमस्ते" in prompt
    assert "be warm" in prompt


def test_tts_prompt_switches_language_guidance():
    hindi = GV.build_tts_prompt("kya haal hai", "s", "hi-IN")
    english = GV.build_tts_prompt("how are you", "s", "en-IN")
    assert "Hinglish" in hindi
    assert "Indian English" in english


# ── Speech cleaning ──────────────────────────────────────────────────────
def test_clean_for_speech_strips_markdown_and_emoji():
    out = GV.clean_for_speech("### Heading\n**bold** `code` 🎉 done")
    assert "#" not in out and "*" not in out and "`" not in out
    assert "🎉" not in out
    assert "bold" in out and "done" in out


def test_clean_for_speech_keeps_devanagari():
    assert "नमस्ते" in GV.clean_for_speech("**नमस्ते** 🙏")


# ── PCM → WAV ────────────────────────────────────────────────────────────
def test_pcm_to_wav_produces_a_playable_container():
    pcm = b"\x00\x01" * 24000          # 1 second of 16-bit mono at 24kHz
    wav_bytes = GV.pcm_to_wav(pcm)
    with wave.open(io.BytesIO(wav_bytes), "rb") as wav:
        assert wav.getnchannels() == 1
        assert wav.getsampwidth() == 2
        assert wav.getframerate() == 24000
        assert wav.getnframes() == 24000
    assert wav_bytes[:4] == b"RIFF"
    assert GV.wav_duration_seconds(wav_bytes) == 1.0


def test_rate_is_read_from_the_response_mime():
    """The API reports the rate in the mime type: audio/L16;codec=pcm;rate=24000."""
    assert GV._rate_from_mime("audio/L16;codec=pcm;rate=24000") == 24000
    assert GV._rate_from_mime("audio/L16;codec=pcm;rate=16000") == 16000
    assert GV._rate_from_mime(None) == GV.PCM_RATE


# ── Presets ──────────────────────────────────────────────────────────────
def test_presets_resolve_by_id_then_buddy_then_default():
    assert GV.preset_for("madhav_calm").id == "madhav_calm"
    assert GV.preset_for(None, "hamster").id == "hamster_squeak"
    assert GV.preset_for(None, "krishna").id == "madhav_warm"
    assert GV.preset_for("nonsense", None).id == GV.DEFAULT_PRESET


def test_every_preset_carries_an_accent_instruction():
    """The Indian delivery comes from the style text — it must never be empty."""
    for preset in GV.VOICE_PRESETS.values():
        assert preset.style.strip()
        assert preset.voice.strip()
        assert preset.description.strip()


def test_indian_presets_actually_ask_for_an_indian_accent():
    for pid in ("madhav_warm", "madhav_calm", "madhav_bright",
                "indian_female", "indian_male"):
        assert "Indian accent" in GV.VOICE_PRESETS[pid].style


# ── Quota errors are distinguishable, so callers can fall back ───────────
def test_quota_errors_are_detected():
    assert GV._is_quota_error(Exception("429 RESOURCE_EXHAUSTED"))
    assert GV._is_quota_error(Exception("You exceeded your current quota"))
    assert not GV._is_quota_error(Exception("400 INVALID_ARGUMENT"))


def test_quota_error_is_a_voice_error_subclass():
    """So a caller that only catches VoiceError still degrades gracefully."""
    assert issubclass(GV.VoiceQuotaError, GV.VoiceError)


def test_synthesize_raises_rather_than_returning_silence(seeded, monkeypatch):
    def boom(*_a, **_k):
        raise RuntimeError("429 RESOURCE_EXHAUSTED")

    monkeypatch.setattr(GV, "_first_audio_part", boom)
    with pytest.raises(GV.VoiceError):
        GV.synthesize_sync("hello", "fake-key")


def test_empty_text_is_refused():
    with pytest.raises(GV.VoiceError):
        GV.synthesize_sync("   🎉  ", "fake-key")


# ── Cache ────────────────────────────────────────────────────────────────
def test_cache_round_trips_and_is_bounded():
    GV.clear_cache()
    for i in range(GV._CACHE_LIMIT + 5):
        GV._cache_put((f"k{i}",), b"audio")
    assert len(GV._CACHE) == GV._CACHE_LIMIT
    assert GV._cache_get(("k0",)) is None          # evicted
    assert GV._cache_get((f"k{GV._CACHE_LIMIT + 4}",)) == b"audio"
    GV.clear_cache()


# ── Routes ───────────────────────────────────────────────────────────────
def test_voices_route_lists_presets(client):
    res = client.get("/voice/voices")
    assert res.status_code == 200
    body = res.json()
    ids = {p["id"] for p in body["presets"]}
    assert {"madhav_warm", "indian_female", "hamster_squeak"} <= ids
    assert body["default"] == GV.DEFAULT_PRESET
    assert "hi-IN" in body["languages"]


def test_voices_route_is_honest_about_locale_voices(client):
    """The note must not let 'Indian voice' read as a claim about the model."""
    note = client.get("/voice/voices").json()["note"]
    assert "language-agnostic" in note


def test_converse_rejects_empty_audio(client):
    res = client.post("/voice/converse", content=b"", headers={"Content-Type": "audio/webm"})
    assert res.status_code == 400


def test_speak_rejects_empty_text(client):
    assert client.post("/voice/speak", json={"text": "   "}).status_code == 400


# ── Sessions ─────────────────────────────────────────────────────────────
def test_new_session_creates_an_empty_conversation(client):
    res = client.post("/krishna/sessions", json={}, headers={"X-User-Id": "u1"})
    assert res.status_code == 201
    body = res.json()
    assert body["id"] and body["message_count"] == 0


def test_sessions_are_listed_newest_first(client):
    h = {"X-User-Id": "u1"}
    first = client.post("/krishna/sessions", json={"title": "one"}, headers=h).json()
    second = client.post("/krishna/sessions", json={"title": "two"}, headers=h).json()
    ids = [s["id"] for s in client.get("/krishna/sessions", headers=h).json()["sessions"]]
    assert first["id"] in ids and second["id"] in ids


def test_sessions_are_scoped_to_the_user(client):
    mine = client.post("/krishna/sessions", json={}, headers={"X-User-Id": "u1"}).json()
    theirs = client.get("/krishna/sessions", headers={"X-User-Id": "u2"}).json()["sessions"]
    assert mine["id"] not in [s["id"] for s in theirs]


def test_another_user_cannot_read_or_delete_a_session(client):
    mine = client.post("/krishna/sessions", json={}, headers={"X-User-Id": "u1"}).json()
    assert client.get(f"/krishna/sessions/{mine['id']}",
                      headers={"X-User-Id": "u2"}).status_code == 404
    assert client.delete(f"/krishna/sessions/{mine['id']}",
                         headers={"X-User-Id": "u2"}).status_code == 404
    assert client.delete(f"/krishna/sessions/{mine['id']}",
                         headers={"X-User-Id": "u1"}).status_code == 204


def test_missing_session_is_a_404(client):
    assert client.get("/krishna/sessions/nope",
                      headers={"X-User-Id": "u1"}).status_code == 404


def test_load_history_is_user_scoped(seeded):
    from krishna.orchestrator import create_session, load_history
    from db import get_conn, new_id, now_iso

    session = create_session("u1")
    with get_conn() as conn:
        for role, content in (("user", "hello"), ("assistant", "hi")):
            conn.execute(
                "INSERT INTO messages (id, conversation_id, user_id, role, content,"
                " created_at) VALUES (?,?,?,?,?,?)",
                (new_id(), session["id"], "u1", role, content, now_iso()),
            )

    assert [m["content"] for m in load_history("u1", session["id"])] == ["hello", "hi"]
    # Same conversation id, different user — must return nothing.
    assert load_history("u2", session["id"]) == []


# ══════════════════════════════════════════════════════════════════════════
# Multi-provider layer
#
# No network here. What is tested is the code around the API calls: which
# provider gets a turn, in what order, why one is skipped, and that a failure
# falls through instead of going silent.
# ══════════════════════════════════════════════════════════════════════════
from voice import providers as P


def run(coro):
    """
    Drive one coroutine to completion.

    The suite has no pytest-asyncio and does not need it for these — each test
    awaits exactly one call, so a plain event loop is simpler than a plugin.
    """
    import asyncio

    return asyncio.run(coro)


# ── The registry ─────────────────────────────────────────────────────────
def test_every_provider_declares_a_capability():
    for provider in P.PROVIDERS.values():
        assert provider.supports_tts or provider.supports_stt, provider.id
        assert provider.label and provider.description


def test_capability_lists_match_the_registry():
    assert set(P.TTS_PROVIDERS) == {p.id for p in P.PROVIDERS.values() if p.supports_tts}
    assert set(P.STT_PROVIDERS) == {p.id for p in P.PROVIDERS.values() if p.supports_stt}


def test_the_providers_the_user_asked_for_all_exist():
    assert {"gemini", "sarvam", "cartesia", "deepgram",
            "fish_audio", "apple", "browser"} <= set(P.PROVIDERS)


def test_fish_audio_is_tts_only_and_apple_cannot_listen():
    assert P.PROVIDERS["fish_audio"].supports_tts
    assert not P.PROVIDERS["fish_audio"].supports_stt
    assert not P.PROVIDERS["apple"].supports_stt


def test_local_providers_need_no_key():
    for pid in ("apple", "browser"):
        assert P.PROVIDERS[pid].local
        assert P.PROVIDERS[pid].key_field is None


def test_indian_voice_claims_are_labelled_honestly():
    """
    'native' must mean real Indian voices; Gemini's accent is directed by a
    prompt, so it must not claim native, and Deepgram must claim neither.
    """
    assert P.PROVIDERS["gemini"].indian_voices == "directed"
    assert P.PROVIDERS["sarvam"].indian_voices == "native"
    assert P.PROVIDERS["deepgram"].indian_voices == "none"


# ── Chain building ───────────────────────────────────────────────────────
def test_chain_puts_the_explicit_choice_first():
    chain = P.build_chain("sarvam", ["cartesia", "apple"], "tts")
    assert chain[0] == "sarvam"
    assert chain[1:3] == ["cartesia", "apple"]


def test_chain_deduplicates():
    chain = P.build_chain("gemini", ["gemini", "gemini"], "tts")
    assert chain.count("gemini") == 1


def test_chain_drops_providers_without_the_capability():
    """fish_audio cannot listen, so it must never appear in an STT chain."""
    assert "fish_audio" not in P.build_chain("fish_audio", ["fish_audio"], "stt")
    assert "apple" not in P.build_chain("apple", ["apple"], "stt")


def test_chain_always_ends_up_non_empty():
    assert P.build_chain(None, None, "tts")
    assert P.build_chain("nonsense", ["also-nonsense"], "stt")


def test_chain_ignores_unknown_providers():
    assert "made-up" not in P.build_chain("made-up", ["gemini"], "tts")


def test_default_tts_chain_ends_local():
    """There must always be a last resort that needs no key and no network."""
    assert P.DEFAULT_TTS_CHAIN[-1] == "apple"


# ── Skip reasons ─────────────────────────────────────────────────────────
def test_skip_reason_explains_itself():
    assert P._skip_reason(P.PROVIDERS["gemini"], {}, "tts") == "no API key configured"
    assert "does not do speech-to-text" == P._skip_reason(
        P.PROVIDERS["fish_audio"], {"fish_audio": "k"}, "stt")
    assert "browser" in P._skip_reason(P.PROVIDERS["browser"], {"browser": "client"}, "tts")
    assert P._skip_reason(P.PROVIDERS["gemini"], {"gemini": "k"}, "tts") is None


# ── The runner falls through ─────────────────────────────────────────────
def test_tts_falls_through_to_the_next_provider(monkeypatch):
    calls: list[str] = []

    async def fake(pid, text, key, settings, language, character):
        calls.append(pid)
        if pid == "gemini":
            raise RuntimeError("429 RESOURCE_EXHAUSTED")
        return b"audio", {"voice": pid}, "audio/wav"

    monkeypatch.setattr(P, "_synthesize_one", fake)
    spoken = run(P.synthesize_with_chain(
        "hi", keys={"gemini": "k", "sarvam": "k"},
        chain=["gemini", "sarvam"], settings={},
    ))
    assert calls == ["gemini", "sarvam"]
    assert spoken.provider == "sarvam"
    # The failure is reported, not swallowed.
    assert spoken.attempts[0]["provider"] == "gemini"
    assert "429" in spoken.attempts[0]["error"]


def test_tts_skips_keyless_providers_without_calling_them(monkeypatch):
    calls: list[str] = []

    async def fake(pid, *_a, **_k):
        calls.append(pid)
        return b"audio", {}, "audio/wav"

    monkeypatch.setattr(P, "_synthesize_one", fake)
    spoken = run(P.synthesize_with_chain(
        "hi", keys={"deepgram": "k"}, chain=["gemini", "sarvam", "deepgram"], settings={},
    ))
    assert calls == ["deepgram"]
    assert spoken.provider == "deepgram"
    assert {a["provider"] for a in spoken.attempts} == {"gemini", "sarvam"}


def test_tts_raises_with_every_reason_when_all_fail(monkeypatch):
    async def always_fail(pid, *_a, **_k):
        raise RuntimeError(f"{pid} exploded")

    monkeypatch.setattr(P, "_synthesize_one", always_fail)
    with pytest.raises(P.NoProviderError) as exc:
        run(P.synthesize_with_chain(
            "hi", keys={"gemini": "k", "sarvam": "k"},
            chain=["gemini", "sarvam"], settings={},
        ))
    assert len(exc.value.attempts) == 2
    assert "gemini exploded" in str(exc.value)


def test_stt_treats_silence_as_try_the_next_one(monkeypatch):
    async def fake(pid, *_a, **_k):
        return ("" if pid == "gemini" else "heard it"), {"model": pid}

    monkeypatch.setattr(P, "_transcribe_one", fake)
    heard = run(P.transcribe_with_chain(
        b"audio", "audio/wav", keys={"gemini": "k", "sarvam": "k"},
        chain=["gemini", "sarvam"], settings={},
    ))
    assert heard.transcript == "heard it"
    assert heard.provider == "sarvam"
    assert heard.attempts[0]["error"] == "no speech detected"


def test_stt_reports_silence_distinctly_from_failure(monkeypatch):
    async def silent(*_a, **_k):
        return "", {}

    monkeypatch.setattr(P, "_transcribe_one", silent)
    with pytest.raises(P.NoProviderError) as exc:
        run(P.transcribe_with_chain(
            b"audio", "audio/wav", keys={"gemini": "k"}, chain=["gemini"], settings={},
        ))
    assert all(a["error"] == "no speech detected" for a in exc.value.attempts)


# ── Key resolution ───────────────────────────────────────────────────────
def test_client_headers_beat_server_config():
    from config_manager import AppConfig

    config = AppConfig()
    config.api_keys.gemini_key = "from-server"
    keys = P.resolve_keys(config, {"gemini": "from-browser"})
    assert keys["gemini"] == "from-browser"


def test_browser_is_always_resolvable_and_apple_follows_the_machine():
    from config_manager import AppConfig

    keys = P.resolve_keys(AppConfig(), {})
    assert keys.get("browser") == "client"
    from voice import apple_voice

    assert ("apple" in keys) == apple_voice.is_available()


# ── Provider clients: normalisation without network ──────────────────────
def test_sarvam_normalises_language_and_speaker():
    from voice import sarvam_voice as S

    assert S.normalize_language("hi-IN") == "hi-IN"
    assert S.normalize_language("hi") == "hi-IN"
    assert S.normalize_language("klingon") == "hi-IN"
    assert S.normalize_speaker("ANAND") == "anand"
    assert S.normalize_speaker("not-a-speaker") == S.DEFAULT_SPEAKER
    assert S.DEFAULT_SPEAKER in S.SPEAKERS


def test_cartesia_wants_a_bare_language_code():
    from voice import cartesia_voice as C

    assert C.short_language("hi-IN") == "hi"
    assert C.short_language("en-IN") == "en"
    assert C.short_language(None) == "en"


def test_deepgram_voice_catalogue_is_all_english():
    """It is listed as English-only, so nothing may claim otherwise."""
    from voice import deepgram_voice as D

    assert all(v["language"] == "en" for v in D.list_voices())


# ── Config ───────────────────────────────────────────────────────────────
def test_legacy_mode_is_promoted_to_tts_provider():
    """An older config file only has `mode`; dropping it would reset the user."""
    from config_manager import VoiceConfig

    assert VoiceConfig(**{"mode": "sarvam"}).tts_provider == "sarvam"


def test_explicit_tts_provider_beats_legacy_mode():
    from config_manager import VoiceConfig

    cfg = VoiceConfig(**{"mode": "deepgram", "tts_provider": "cartesia"})
    assert cfg.tts_provider == "cartesia"
    assert cfg.mode == "cartesia"          # kept in sync, never contradictory


def test_mode_is_still_serialized_for_the_existing_frontend():
    from config_manager import VoiceConfig

    assert "mode" in VoiceConfig().model_dump()


def test_stt_and_tts_are_independent():
    from config_manager import VoiceConfig

    cfg = VoiceConfig(**{"tts_provider": "cartesia", "stt_provider": "sarvam"})
    assert (cfg.tts_provider, cfg.stt_provider) == ("cartesia", "sarvam")


# ── Routes ───────────────────────────────────────────────────────────────
def test_providers_route_returns_the_matrix(client):
    body = client.get("/voice/providers").json()
    ids = {p["id"] for p in body["providers"]}
    assert {"gemini", "sarvam", "cartesia", "deepgram", "apple", "browser"} <= ids
    assert body["effective_tts_chain"] and body["effective_stt_chain"]
    assert "tts_provider" in body["selected"]


def test_unavailable_providers_always_say_why(client):
    for provider in client.get("/voice/providers").json()["providers"]:
        if not provider["available"]:
            assert provider["unavailable_reason"]


def test_voices_route_can_target_one_provider(client):
    body = client.get("/voice/voices?provider=sarvam").json()
    assert body["provider"] == "sarvam"
    assert any(v["id"] == "anand" for v in body["voices"])


def test_voices_route_rejects_an_unknown_provider(client):
    assert client.get("/voice/voices?provider=nope").status_code == 404


def test_test_route_rejects_an_unknown_provider(client):
    assert client.post("/voice/test", json={"provider": "nope"}).status_code == 404


def test_test_route_does_not_fall_back(client, monkeypatch):
    """
    Auditioning is for finding out whether THIS provider works. Answering with
    a different voice would defeat the point.
    """
    async def boom(pid, *_a, **_k):
        raise RuntimeError(f"{pid} is down")

    monkeypatch.setattr(P, "_synthesize_one", boom)
    body = client.post("/voice/test", json={"provider": "gemini", "text": "hi"}).json()
    assert body["ok"] is False
    assert body["provider"] == "gemini"
    assert body["audio"] is None
    assert [a["provider"] for a in body["attempts"]] == ["gemini"]
