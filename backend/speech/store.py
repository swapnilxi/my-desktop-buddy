"""Local JSON persistence for speech-training sessions, progress and weekly summaries."""
import json
import threading
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional

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


def _json_default(value):
    """numpy scalars (np.bool_, np.int64 …) from the analysis -> plain Python values."""
    if hasattr(value, "item"):
        return value.item()
    raise TypeError(f"Object of type {type(value).__name__} is not JSON serializable")


def _save(data: Dict) -> None:
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    tmp = STORE_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, default=_json_default))
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


def session_lesson_id(s: Dict) -> Optional[str]:
    """Lesson a session belongs to. Older sessions only stored a day number (seed day ids are dN)."""
    return s.get("lesson_id") or (f"d{s['day']}" if s.get("day") else None)


def session_kind(s: Dict) -> Optional[str]:
    return s.get("lesson_kind") or ("day" if s.get("day") else None)


def session_week(s: Dict) -> Optional[int]:
    if s.get("week"):
        return s["week"]
    return min(4, (s["day"] - 1) // 7 + 1) if s.get("day") else None  # pre-program-store sessions


def completed_day_ids(sessions: List[Dict]) -> set:
    """Program days with at least one recorded session (sub-lessons don't complete a day)."""
    return {session_lesson_id(s) for s in sessions if session_kind(s) == "day"}


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
