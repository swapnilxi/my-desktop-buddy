"""
`WebSocket /voice/live` — streaming voice with barge-in.

The browser opens one socket and streams 16 kHz PCM16 from the microphone as
binary frames. Everything coming back is either a binary frame (24 kHz PCM16
to play) or a JSON text frame (transcripts, state, errors).

Two sockets' worth of work run concurrently on this one connection:

  * **uplink** — read client frames, forward audio to Gemini
  * **downlink** — read Gemini events, forward to the client

They are separate tasks because they must not block each other. If the
downlink awaited the uplink, an interruption could not be delivered while the
user was still speaking — which is the entire point of barge-in.

Framing choice: audio down is **binary**, not base64 JSON. A reply is a few
hundred kilobytes arriving in ~20 ms slices; base64 would add a third again in
bandwidth and a JSON parse per slice, for no benefit.
"""
from __future__ import annotations

import asyncio
import json
from typing import Any, Optional

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from config_manager import get_config
from db import DEFAULT_USER_ID
from voice import live_session as LS

router = APIRouter(prefix="/voice", tags=["voice"])

# Frames larger than this are refused rather than forwarded. 20 ms of 16 kHz
# PCM16 is 640 bytes; anything near a megabyte is not a microphone.
MAX_FRAME_BYTES = 256 * 1024


@router.get("/live/status")
async def live_status(x_gemini_key: Optional[str] = None) -> dict[str, Any]:
    """
    Whether streaming voice is usable, without opening a socket.

    The UI asks this before showing a Live button, so the button is never
    offered when it cannot work.
    """
    config = get_config()
    import os

    key = (
        x_gemini_key
        or config.api_keys.gemini_key
        or os.getenv("GEMINI_API_KEY")
        or os.getenv("GEMINI_KEY")
    )
    return {
        "available": bool(key),
        "reason": None if key else "Live voice needs a Gemini API key.",
        "model": config.voice.live_model or LS.LIVE_MODEL,
        "input_sample_rate": LS.INPUT_SAMPLE_RATE,
        "output_sample_rate": LS.OUTPUT_SAMPLE_RATE,
        "supports_barge_in": True,
        "note": (
            "Streaming voice keeps the mic open and can be interrupted mid-reply. "
            "It is a separate path from POST /voice/converse, which is turn-based "
            "and works with every provider."
        ),
    }


async def _send_json(ws: WebSocket, payload: dict[str, Any]) -> None:
    try:
        await ws.send_text(json.dumps(payload, ensure_ascii=False))
    except (WebSocketDisconnect, RuntimeError):
        pass


@router.websocket("/live")
async def live_voice(
    websocket: WebSocket,
    user_id: str = Query(DEFAULT_USER_ID),
    conversation_id: Optional[str] = Query(None),
    mode: str = Query("friend"),
    buddy_name: Optional[str] = Query(None),
    user_name: Optional[str] = Query(None),
    voice: Optional[str] = Query(None),
    language: Optional[str] = Query(None),
    key: Optional[str] = Query(None),
) -> None:
    """
    Live voice relay.

    Parameters arrive as query args rather than headers because the browser
    WebSocket API cannot set headers. The Gemini key may come that way too, so
    a browser holding its key in LocalStorage can still use this — it never
    reaches server disk.
    """
    await websocket.accept()

    import os

    config = get_config()
    api_key = (
        key
        or config.api_keys.gemini_key
        or os.getenv("GEMINI_API_KEY")
        or os.getenv("GEMINI_KEY")
    )
    if not api_key:
        await _send_json(websocket, {
            "type": "error",
            "message": "Live voice needs a Gemini API key. Add one in Config → API Keys.",
            "fatal": True,
        })
        await websocket.close(code=1008)
        return

    # `language: auto` is the UI's word for "decide per reply". The Live API
    # has no per-reply hook, so auto simply means: do not pin one.
    resolved_language = None
    requested = (language or config.voice.voice_language or "auto").strip()
    if requested and requested.lower() != "auto":
        resolved_language = requested

    cfg = LS.LiveConfig(
        api_key=api_key,
        user_id=(user_id or DEFAULT_USER_ID).strip() or DEFAULT_USER_ID,
        conversation_id=conversation_id,
        buddy_name=buddy_name,
        user_name=user_name,
        mode=mode or "friend",
        voice=voice or config.voice.live_voice or "Leda",
        model=config.voice.live_model or LS.LIVE_MODEL,
        language=resolved_language,
    )

    try:
        session = await LS.LiveVoiceSession(cfg).__aenter__()
    except LS.LiveUnavailable as exc:
        await _send_json(websocket, {
            "type": "error", "message": str(exc)[:400], "fatal": True,
            "fallback": "converse",
        })
        await websocket.close(code=1011)
        return
    except Exception as exc:
        await _send_json(websocket, {
            "type": "error", "message": f"Live voice failed to start: {exc}"[:400],
            "fatal": True, "fallback": "converse",
        })
        await websocket.close(code=1011)
        return

    await _send_json(websocket, {
        "type": "ready",
        "model": session.model,
        "voice": cfg.voice,
        "input_sample_rate": LS.INPUT_SAMPLE_RATE,
        "output_sample_rate": LS.OUTPUT_SAMPLE_RATE,
        "conversation_id": cfg.conversation_id,
    })

    stop = asyncio.Event()

    async def uplink() -> None:
        """Client → Gemini."""
        try:
            while not stop.is_set():
                message = await websocket.receive()
                if message.get("type") == "websocket.disconnect":
                    break
                data = message.get("bytes")
                if data is not None:
                    if len(data) > MAX_FRAME_BYTES:
                        await _send_json(websocket, {
                            "type": "error",
                            "message": "Audio frame too large; dropped.",
                        })
                        continue
                    await session.send_audio(data)
                    continue

                text = message.get("text")
                if not text:
                    continue
                try:
                    payload = json.loads(text)
                except json.JSONDecodeError:
                    continue
                action = payload.get("type")
                if action == "text":
                    await session.send_text(payload.get("text", ""))
                elif action == "stop":
                    break
        except (WebSocketDisconnect, RuntimeError):
            pass
        finally:
            stop.set()

    async def downlink() -> None:
        """Gemini → client."""
        try:
            async for event in session.events():
                if stop.is_set():
                    break
                if event["type"] == "audio":
                    # Binary: a reply is hundreds of KB in ~20ms slices, and
                    # base64-in-JSON would cost a third more bandwidth plus a
                    # parse per slice.
                    try:
                        await websocket.send_bytes(event["data"])
                    except (WebSocketDisconnect, RuntimeError):
                        break
                else:
                    await _send_json(websocket, event)
                    if event["type"] == "turn_complete" and cfg.conversation_id:
                        await _send_json(websocket, {
                            "type": "conversation",
                            "conversation_id": cfg.conversation_id,
                        })
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            await _send_json(websocket, {"type": "error", "message": str(exc)[:300]})
        finally:
            stop.set()

    up = asyncio.create_task(uplink())
    down = asyncio.create_task(downlink())
    try:
        await stop.wait()
    finally:
        for task in (up, down):
            task.cancel()
        await asyncio.gather(up, down, return_exceptions=True)
        await session.close()
        try:
            await websocket.close()
        except RuntimeError:
            pass
