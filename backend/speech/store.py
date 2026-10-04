"""Local JSON persistence for speech-training sessions, progress and weekly summaries."""
import json
import threading
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Dict, List

from config_manager import CONFIG_DIR

STORE_FILE = CONFIG_DIR / "speech_training.json"
AUDIO_DIR = CONFIG_DIR / "speech_audio"
_lock = threading.Lock()


def _load() -> Dict:
    if STORE_FILE.exists():
        try:
            return json.loads(STORE_FILE.read_text())
        except Exception:
            pass
    return {"sessions": [], "weekly_summaries": {}}


def _save(data: Dict) -> None:
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    tmp = STORE_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(data))
    tmp.replace(STORE_FILE)


def load() -> Dict:
    with _lock:
        return _load()


def add_session(session: Dict) -> None:
    with _lock:
        data = _load()
        data["sessions"].append(session)
        _save(data)


def set_weekly(week: int, summary: Dict) -> None:
    with _lock:
        data = _load()
        data["weekly_summaries"][str(week)] = summary
        _save(data)


def reset() -> None:
    with _lock:
        _save({"sessions": [], "weekly_summaries": {}})


def completed_days(sessions: List[Dict]) -> List[int]:
    return sorted({s["day"] for s in sessions if s.get("day")})


def streak(sessions: List[Dict]) -> int:
    days = {datetime.fromisoformat(s["created_at"]).date() for s in sessions}
    if not days:
        return 0
    cur = date.today()
    if cur not in days:
        cur -= timedelta(days=1)
    n = 0
    while cur in days:
        n += 1
        cur -= timedelta(days=1)
    return n
