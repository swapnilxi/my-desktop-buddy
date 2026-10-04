"""On-device transcription via Apple's Speech framework (Local mode), through a tiny Swift helper."""
import asyncio
import json
import subprocess
from pathlib import Path
from typing import Dict

SRC = Path(__file__).with_name("apple_stt.swift")
PLIST = Path(__file__).with_name("Info.plist")
BIN = Path.home() / ".hamsterdesk" / "bin" / "apple_stt"


class AppleSTTUnavailable(RuntimeError):
    pass


def _ensure_binary() -> Path:
    if BIN.exists() and BIN.stat().st_mtime >= SRC.stat().st_mtime:
        return BIN
    BIN.parent.mkdir(parents=True, exist_ok=True)
    try:
        proc = subprocess.run(
            ["swiftc", "-O", str(SRC), "-o", str(BIN), "-Xlinker", "-sectcreate", "-Xlinker", "__TEXT",
             "-Xlinker", "__info_plist", "-Xlinker", str(PLIST)],
            capture_output=True, timeout=240,
        )
    except FileNotFoundError:
        raise AppleSTTUnavailable("Apple Speech needs macOS with the Swift toolchain (xcode-select --install).")
    if proc.returncode != 0:
        raise AppleSTTUnavailable("Could not build the Apple Speech helper: " + proc.stderr.decode(errors="ignore")[:200])
    return BIN


def is_built() -> bool:
    return BIN.exists()


def _run(wav: Path) -> Dict:
    binary = _ensure_binary()
    proc = subprocess.run([str(binary), str(wav)], capture_output=True, timeout=150)
    if proc.returncode != 0:
        msg = proc.stderr.decode(errors="ignore").strip()
        raise AppleSTTUnavailable(msg or "Apple Speech recognition crashed — grant Speech Recognition permission to the app that runs the backend (System Settings → Privacy & Security).")
    return json.loads(proc.stdout.decode() or "{}")


async def transcribe(wav: Path) -> Dict:
    res = await asyncio.to_thread(_run, wav)
    return {"transcript": (res.get("transcript") or "").strip(),
            "asr_confidence": res.get("confidence") or None,
            "on_device": res.get("on_device", False)}
