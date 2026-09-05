"""
Gemini Live — streaming voice with barge-in.

The turn-based `/voice/converse` path stays: it is cheaper, works with every
provider, and is the right thing when someone taps to talk. This module is for
the other mode — an open mic where Madhav can be interrupted mid-sentence.

Everything here was established against the live API, and each point is a
thing the relay would get wrong otherwise:

  * **Only one model answers on this key.** `gemini-2.5-flash-native-audio-
    preview-09-2025` connects; `gemini-live-2.5-flash-preview`,
    `gemini-2.0-flash-live-001` and `gemini-2.5-flash-preview-native-audio-
    dialog` all close with 1008 "not found ... for bidiGenerateContent".
  * **`session.receive()` is per-turn.** It stops iterating at `turn_complete`,
    so a relay that awaits it once handles exactly one reply and then goes
    deaf. It has to be called again in an outer loop.
  * **Audio in is 16 kHz PCM, audio out is 24 kHz PCM.** Different rates, and
    mixing them up produces chipmunks.
  * **`audio_stream_end` cuts the reply short.** A real microphone keeps
    sending silence and lets the server VAD decide the turn ended, which is
    what the browser client does.
  * **The SDK does not pass an SSL context on the WebSocket path.** Its HTTP
    path uses certifi explicitly (`_api_client.py`), but `live.py` calls
    `websockets.connect()` bare, so on a machine without the system root
    bundle every connection fails `CERTIFICATE_VERIFY_FAILED`. `SSL_CERT_FILE`
    is set below to the same bundle the SDK's HTTP path already uses.

The persona comes from `krishna/persona.py` like every other Krishna surface,
so the character cannot drift just because the transport changed.
"""
from __future__ import annotations

import asyncio
import os
from dataclasses import dataclass, field
from typing import Any, AsyncIterator, Optional

import certifi

# Must happen before the SDK opens a websocket. Same bundle the SDK's HTTP
# path uses; `setdefault` so an operator-supplied value still wins.
os.environ.setdefault("SSL_CERT_FILE", certifi.where())

LIVE_MODEL = "gemini-2.5-flash-native-audio-preview-09-2025"

INPUT_SAMPLE_RATE = 16000
OUTPUT_SAMPLE_RATE = 24000
INPUT_MIME = f"audio/pcm;rate={INPUT_SAMPLE_RATE}"

# Models tried in order. Only the first is known to work on a standard key;
# the rest are here so a key with wider access picks the better model up
# without a code change.
MODEL_CANDIDATES = (
    LIVE_MODEL,
    "gemini-live-2.5-flash-preview",
    "gemini-2.0-flash-live-001",
)


class LiveUnavailable(RuntimeError):
    """The Live API could not be reached — the caller should fall back."""


@dataclass
class LiveConfig:
    api_key: str
    user_id: str
    conversation_id: Optional[str] = None
    buddy_name: Optional[str] = None
    user_name: Optional[str] = None
    mode: str = "friend"
    voice: str = "Leda"
    model: str = LIVE_MODEL
    language: Optional[str] = None
    system_prompt: Optional[str] = None


@dataclass
class TurnState:
    """One exchange, accumulated as the streamed fragments arrive."""

    heard: str = ""
    said: str = ""
    audio_bytes: int = 0
    interrupted: bool = False
    events: list[str] = field(default_factory=list)

    def reset(self) -> None:
        self.heard = ""
        self.said = ""
        self.audio_bytes = 0
        self.interrupted = False
        self.events = []


def build_live_prompt(cfg: LiveConfig) -> str:
    """
    The system prompt for a spoken, interruptible conversation.

    It is the normal Madhav prompt with a spoken-medium addendum: no markdown,
    no headings, shorter turns. Written through `persona.build_system_prompt`
    so the character stays the one source of truth (convention 8).
    """
    if cfg.system_prompt:
        return cfg.system_prompt

    from krishna.intent import Classification
    from krishna.persona import build_system_prompt

    classification = Classification(mode=cfg.mode, intent="conversation")
    base = build_system_prompt(
        classification=classification,
        mode=cfg.mode,
        user_name=cfg.user_name,
        buddy_name=cfg.buddy_name,
    )
    return base + """

YOU ARE SPEAKING ALOUD, NOT WRITING
This is a live voice conversation. Everything you say is read out immediately.

- No markdown, no headings, no bullet points, no emoji — they get read as symbols or lost.
- Keep turns short. One or two sentences, then stop and let them speak. A monologue in a live call is worse than a monologue in text, because they cannot skim it.
- They can interrupt you at any moment. If they do, stop and listen — do not finish the point you were making, and do not repeat it back.
- If they say something you did not catch, ask, rather than guessing.
- Speak the way they speak: if they use Hinglish, use Hinglish."""


class LiveVoiceSession:
    """
    One live conversation with Gemini.

    Usage is a context manager plus two halves: `send_audio` from whatever is
    reading the microphone, and `events()` from whatever is writing to the
    client. They run concurrently.
    """

    def __init__(self, cfg: LiveConfig):
        self.cfg = cfg
        self.turn = TurnState()
        self._session: Any = None
        self._ctx: Any = None
        self._closed = False
        self._model_used: Optional[str] = None

    # ── Lifecycle ────────────────────────────────────────────────────────
    async def __aenter__(self) -> "LiveVoiceSession":
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=self.cfg.api_key)
        live_config = types.LiveConnectConfig(
            response_modalities=["AUDIO"],
            system_instruction=build_live_prompt(self.cfg),
            # Both directions transcribed: the UI shows the conversation as it
            # happens, and the turn can be persisted like any other.
            input_audio_transcription=types.AudioTranscriptionConfig(),
            output_audio_transcription=types.AudioTranscriptionConfig(),
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name=self.cfg.voice
                    )
                ),
                **({"language_code": self.cfg.language} if self.cfg.language else {}),
            ),
        )

        candidates = [self.cfg.model, *(m for m in MODEL_CANDIDATES if m != self.cfg.model)]
        errors: list[str] = []
        for model in candidates:
            try:
                self._ctx = client.aio.live.connect(model=model, config=live_config)
                self._session = await self._ctx.__aenter__()
                self._model_used = model
                return self
            except Exception as exc:
                errors.append(f"{model}: {str(exc)[:160]}")
                self._ctx = None
        raise LiveUnavailable(
            "Could not open a Gemini Live session. " + "; ".join(errors)
        )

    async def __aexit__(self, *exc: Any) -> None:
        await self.close()

    async def close(self) -> None:
        if self._closed:
            return
        self._closed = True
        if self._ctx is not None:
            try:
                await self._ctx.__aexit__(None, None, None)
            except Exception:
                pass
            self._ctx = None
        self._session = None

    @property
    def model(self) -> Optional[str]:
        return self._model_used

    # ── Input ────────────────────────────────────────────────────────────
    async def send_audio(self, pcm: bytes) -> None:
        """Feed one chunk of 16 kHz mono PCM16 from the microphone."""
        if self._session is None or self._closed or not pcm:
            return
        from google.genai import types

        await self._session.send_realtime_input(
            audio=types.Blob(data=pcm, mime_type=INPUT_MIME)
        )

    async def send_text(self, text: str) -> None:
        """Inject a typed message into the live conversation."""
        if self._session is None or self._closed or not text.strip():
            return
        await self._session.send_client_content(
            turns={"role": "user", "parts": [{"text": text}]}, turn_complete=True
        )

    # ── Output ───────────────────────────────────────────────────────────
    async def events(self) -> AsyncIterator[dict[str, Any]]:
        """
        Normalised events for the client.

        The outer `while` is the important part: `session.receive()` stops at
        every `turn_complete`, so without it the relay would handle one reply
        and then silently stop listening.
        """
        if self._session is None:
            return

        while not self._closed:
            try:
                async for message in self._session.receive():
                    for event in self._translate(message):
                        yield event
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                if self._closed:
                    return
                yield {"type": "error", "message": str(exc)[:300]}
                return

            # A turn ended. Emit it, persist it, and go back to listening.
            if self.turn.heard or self.turn.said:
                yield {
                    "type": "turn_complete",
                    "heard": self.turn.heard.strip(),
                    "said": self.turn.said.strip(),
                    "interrupted": self.turn.interrupted,
                    "audio_bytes": self.turn.audio_bytes,
                }
                await self._persist_turn()
            self.turn.reset()

    def _translate(self, message: Any) -> list[dict[str, Any]]:
        """Turn one SDK message into zero or more client events."""
        out: list[dict[str, Any]] = []
        content = getattr(message, "server_content", None)
        if content is None:
            return out

        # Barge-in. Emitted first and separately so the client can flush its
        # playback queue before anything else in this message is handled —
        # audio that is already buffered must not keep playing over the user.
        if getattr(content, "interrupted", False):
            self.turn.interrupted = True
            out.append({"type": "interrupted"})

        transcription = getattr(content, "input_transcription", None)
        if transcription is not None and transcription.text:
            self.turn.heard += transcription.text
            out.append({"type": "input_transcript", "text": transcription.text,
                        "accumulated": self.turn.heard.strip()})

        output_transcription = getattr(content, "output_transcription", None)
        if output_transcription is not None and output_transcription.text:
            self.turn.said += output_transcription.text
            out.append({"type": "output_transcript", "text": output_transcription.text,
                        "accumulated": self.turn.said.strip()})

        model_turn = getattr(content, "model_turn", None)
        if model_turn is not None:
            for part in getattr(model_turn, "parts", None) or []:
                inline = getattr(part, "inline_data", None)
                if inline is not None and inline.data:
                    self.turn.audio_bytes += len(inline.data)
                    out.append({"type": "audio", "data": inline.data,
                                "sample_rate": OUTPUT_SAMPLE_RATE})

        if getattr(content, "generation_complete", False):
            out.append({"type": "generation_complete"})

        return out

    async def _persist_turn(self) -> None:
        """
        Record the exchange so a live conversation shows up in history like a
        typed one. Never allowed to break the call.
        """
        heard, said = self.turn.heard.strip(), self.turn.said.strip()
        if not heard and not said:
            return
        try:
            from krishna.orchestrator import persist_turn

            self.cfg.conversation_id = persist_turn(
                user_id=self.cfg.user_id,
                conversation_id=self.cfg.conversation_id,
                user_msg=heard,
                reply=said,
                mode=self.cfg.mode,
                source="live",
            )
        except Exception:
            from observability import get_logger

            get_logger("live").warning("live.persist_failed", exc_info=True)
