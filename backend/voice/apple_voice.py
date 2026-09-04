"""
macOS `say` — fully local TTS, no key and no network.

This is the last link in the fallback chain for exactly that reason: when
every cloud provider is down, rate-limited or unconfigured, the buddy can
still speak on a Mac.

`list_voices` reads the machine's installed voices, so an Indian English voice
(Rishi, on most macOS installs) shows up in the picker when it is present
rather than being hard-coded and possibly absent.
"""
from __future__ import annotations

import asyncio
import os
import re
import subprocess
import tempfile
from typing import Any, Optional

DEFAULT_VOICE = "Samantha"

# Voices macOS ships that suit this app. Presence is checked at runtime.
PREFERRED = ("Rishi", "Samantha", "Daniel", "Karen", "Moira", "Tessa")

_VOICE_LINE = re.compile(r"^(?P<name>.+?)\s{2,}(?P<lang>[a-z]{2}_[A-Z]{2})\s")


def is_available() -> bool:
    return os.path.exists("/usr/bin/say") or os.path.exists("/usr/local/bin/say")


def _synthesize_sync(text: str, voice: str) -> bytes:
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
            # Named voice may not be installed — retry with the system default.
            subprocess.run(
                ["say", "-o", out_path, "--data-format=LEI16@22050", text],
                check=True, capture_output=True, timeout=60,
            )
        with open(out_path, "rb") as f:
            return f.read()
    finally:
        try:
            os.unlink(out_path)
        except OSError:
            pass


async def synthesize(text: str, voice: Optional[str] = None,
                     **_: Any) -> tuple[bytes, dict[str, Any]]:
    resolved = voice or DEFAULT_VOICE
    audio = await asyncio.to_thread(_synthesize_sync, text, resolved)
    return audio, {"voice": resolved}


def _list_voices_sync() -> list[dict[str, Any]]:
    try:
        out = subprocess.run(["say", "-v", "?"], capture_output=True, timeout=10,
                             text=True, check=True).stdout
    except (subprocess.SubprocessError, FileNotFoundError, OSError):
        return []
    voices: list[dict[str, Any]] = []
    for line in out.splitlines():
        match = _VOICE_LINE.match(line)
        if match:
            voices.append({
                "id": match.group("name").strip(),
                "label": f"{match.group('name').strip()} ({match.group('lang')})",
                "language": match.group("lang").replace("_", "-"),
            })
    # Indian English first, then the other preferred names, then the rest.
    def rank(v: dict[str, Any]) -> tuple:
        indian = 0 if v["language"] == "en-IN" else 1
        preferred = PREFERRED.index(v["id"]) if v["id"] in PREFERRED else len(PREFERRED)
        return (indian, preferred, v["id"])

    voices.sort(key=rank)
    return voices


async def list_voices() -> list[dict[str, Any]]:
    if not is_available():
        return []
    return await asyncio.to_thread(_list_voices_sync)
