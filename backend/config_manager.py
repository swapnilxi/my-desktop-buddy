"""
HamsterDesk Configuration Manager
Handles loading/saving config from ~/.hamsterdesk/config.json with .env and environment variable fallbacks.
"""

import json
import os
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv
from pydantic import BaseModel, Field, model_validator

# ── Load .env from workspace / backend if present ───────────────────
_workspace_root = Path(__file__).resolve().parent.parent
_backend_dir = Path(__file__).resolve().parent

load_dotenv(_workspace_root / ".env")
load_dotenv(_backend_dir / ".env")


# ── Config directory ──────────────────────────────────────────────
CONFIG_DIR = Path.home() / ".hamsterdesk"
CONFIG_FILE = CONFIG_DIR / "config.json"
TODOS_FILE = CONFIG_DIR / "todos.json"


class LLMConfig(BaseModel):
    provider: str = Field(
        default_factory=lambda: os.getenv("DEFAULT_LLM_PROVIDER", "gemini"),
        description="LLM provider: gemini, deepseek, ollama"
    )
    gemini_model: str = Field(
        default_factory=lambda: os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
        description="Gemini model name"
    )
    deepseek_model: str = Field(
        default_factory=lambda: os.getenv("DEEPSEEK_MODEL", "deepseek-chat"),
        description="DeepSeek model name"
    )
    ollama_model: str = Field(
        default_factory=lambda: os.getenv("OLLAMA_MODEL", "llama3"),
        description="Ollama model name"
    )
    ollama_endpoint: str = Field(
        default_factory=lambda: os.getenv("OLLAMA_ENDPOINT", "http://localhost:11434"),
        description="Ollama API endpoint"
    )


class VoiceConfig(BaseModel):
    """
    Speech settings.

    STT and TTS are chosen independently — "Sarvam ears, Cartesia voice" is a
    valid combination — and each has its own ordered fallback list, so a
    rate-limited or unconfigured provider degrades to the next one instead of
    going silent. `mode` is kept as a read/write alias for `tts_provider` so
    older configs and clients keep working.
    """

    mode: str = Field(
        default_factory=lambda: os.getenv("VOICE_MODE") or os.getenv("TTS_PROVIDER", "gemini"),
        description="Legacy alias for tts_provider, kept in sync both ways"
    )
    tts_provider: str = Field(
        default_factory=lambda: os.getenv("VOICE_MODE") or os.getenv("TTS_PROVIDER", "gemini"),
        description="Speaking: gemini, sarvam, cartesia, deepgram, fish_audio, apple, browser"
    )
    stt_provider: str = Field(
        default_factory=lambda: os.getenv("STT_PROVIDER", "gemini"),
        description="Listening: gemini, sarvam, cartesia, deepgram, browser"
    )
    tts_fallback: list[str] = Field(
        default_factory=lambda: ["sarvam", "cartesia", "deepgram", "apple"],
        description="Tried in order when the chosen TTS provider fails"
    )
    stt_fallback: list[str] = Field(
        default_factory=lambda: ["sarvam", "cartesia", "deepgram"],
        description="Tried in order when the chosen STT provider fails"
    )

    # ── Per-provider settings ────────────────────────────────────────────
    gemini_voice: str = Field(
        default_factory=lambda: os.getenv("GEMINI_VOICE", "madhav_warm"),
        description="Gemini voice preset id (voice/gemini_voice.py VOICE_PRESETS)"
    )
    gemini_tts_model: str = Field(
        default_factory=lambda: os.getenv("GEMINI_TTS_MODEL", "gemini-2.5-flash-preview-tts"),
        description="Gemini TTS model. The pro TTS model is heavily rate-limited."
    )
    sarvam_speaker: str = Field(
        default_factory=lambda: os.getenv("SARVAM_SPEAKER", "anand"),
        description="Sarvam bulbul speaker name"
    )
    sarvam_tts_model: str = Field(default="bulbul:v3", description="Sarvam TTS model")
    sarvam_stt_model: str = Field(default="saarika:v2.5", description="Sarvam STT model")
    cartesia_voice_id: str = Field(
        default_factory=lambda: os.getenv("CARTESIA_VOICE_ID", ""),
        description="Cartesia voice UUID; blank uses a known-good Hindi default"
    )
    cartesia_tts_model: str = Field(default="sonic-3", description="Cartesia TTS model")
    cartesia_stt_model: str = Field(default="ink-whisper", description="Cartesia STT model")
    deepgram_model: str = Field(default="nova-2", description="Deepgram STT model")
    tts_voice: str = Field(default="aura-asteria-en", description="Deepgram Aura voice")
    apple_voice: str = Field(default="Samantha", description="macOS `say` voice name")
    fish_audio_model: str = Field(
        default_factory=lambda: os.getenv("FISH_AUDIO_MODEL", "s2.1-pro-free"),
        description="Fish Audio model name"
    )

    # ── Shared ───────────────────────────────────────────────────────────
    voice_language: str = Field(
        default_factory=lambda: os.getenv("VOICE_LANGUAGE", "auto"),
        description="auto | hi-IN | en-IN. 'auto' detects Hindi/Hinglish per reply."
    )
    voice_autoplay: bool = Field(
        default=True, description="Speak replies aloud automatically"
    )

    @model_validator(mode="before")
    @classmethod
    def _accept_legacy_mode(cls, data: object) -> object:
        """
        A config written before the STT/TTS split only has `mode`. Dropping it
        would silently reset the user's chosen voice provider to the default,
        so it is promoted to `tts_provider` when that key is absent.
        """
        if isinstance(data, dict) and data.get("mode") and not data.get("tts_provider"):
            data = {**data, "tts_provider": data["mode"]}
        return data

    @model_validator(mode="after")
    def _sync_mode(self) -> "VoiceConfig":
        # `mode` is still serialized so the existing frontend keeps working;
        # it must never disagree with the field that is actually read.
        if self.mode != self.tts_provider:
            self.mode = self.tts_provider
        return self


class RAGConfig(BaseModel):
    enabled: bool = Field(default=False, description="Enable RAG pipeline")
    knowledge_base_path: str = Field(default="", description="Path to knowledge base directory")
    endpoint: str = Field(default="", description="External RAG endpoint URL")


class HamsterConfig(BaseModel):
    buddy_type: str = Field(
        default_factory=lambda: os.getenv("DEFAULT_BUDDY_TYPE", "hamster"),
        description="Buddy character type: hamster, panda"
    )
    name: str = Field(
        default_factory=lambda: os.getenv("HAMSTER_NAME", "Hammy"),
        description="Buddy character name"
    )
    skin: str = Field(default="classic", description="Buddy skin/theme")
    color: str = Field(default="#F4A460", description="Buddy primary color")



class StartupConfig(BaseModel):
    launch_on_login: bool = Field(default=False, description="Launch app on login")
    default_tab: str = Field(default="chat", description="Default active tab")


class APIKeysConfig(BaseModel):
    gemini_key: str = Field(
        default_factory=lambda: os.getenv("GEMINI_API_KEY") or os.getenv("GEMINI_KEY", ""),
        description="Gemini API key"
    )
    deepseek_key: str = Field(
        default_factory=lambda: os.getenv("DEEPSEEK_API_KEY") or os.getenv("DEEPSEEK_KEY", ""),
        description="DeepSeek API key"
    )
    deepgram_key: str = Field(
        default_factory=lambda: os.getenv("DEEPGRAM_API_KEY") or os.getenv("DEEPGRAM_KEY", ""),
        description="Deepgram API key"
    )
    fish_audio_key: str = Field(
        default_factory=lambda: os.getenv("FISH_AUDIO_KEY", ""),
        description="Fish Audio API key"
    )
    cartesia_key: str = Field(
        default_factory=lambda: os.getenv("CARTESIA_API_KEY", ""),
        description="Cartesia API key"
    )
    sarvam_key: str = Field(
        default_factory=lambda: os.getenv("SARVAM_API_KEY", ""),
        description="Sarvam API key"
    )


class AppConfig(BaseModel):
    llm: LLMConfig = Field(default_factory=LLMConfig)
    voice: VoiceConfig = Field(default_factory=VoiceConfig)
    rag: RAGConfig = Field(default_factory=RAGConfig)
    hamster: HamsterConfig = Field(default_factory=HamsterConfig)
    startup: StartupConfig = Field(default_factory=StartupConfig)
    api_keys: APIKeysConfig = Field(default_factory=APIKeysConfig)

    class Config:
        json_schema_extra = {
            "example": {
                "llm": {"provider": "gemini", "gemini_model": "gemini-2.5-flash"},
                "hamster": {"name": "Nibbles", "skin": "classic", "color": "#F4A460"},
            }
        }


# ── Singleton config instance ────────────────────────────────────
_config: Optional[AppConfig] = None


def _ensure_config_dir():
    """Create config directory if it doesn't exist."""
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)


def load_config() -> AppConfig:
    """Load config from disk (or .env defaults), or create default if missing."""
    global _config
    _ensure_config_dir()

    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r") as f:
                data = json.load(f)
            _config = AppConfig(**data)
        except (json.JSONDecodeError, Exception):
            _config = AppConfig()
    else:
        _config = AppConfig()

    # Always inject environment variables if the file had empty keys
    env_gemini = os.getenv("GEMINI_API_KEY") or os.getenv("GEMINI_KEY", "")
    env_deepseek = os.getenv("DEEPSEEK_API_KEY") or os.getenv("DEEPSEEK_KEY", "")
    env_deepgram = os.getenv("DEEPGRAM_API_KEY") or os.getenv("DEEPGRAM_KEY", "")
    env_fish_audio = os.getenv("FISH_AUDIO_KEY", "")
    env_cartesia = os.getenv("CARTESIA_API_KEY", "")
    env_sarvam = os.getenv("SARVAM_API_KEY", "")

    if env_gemini and not _config.api_keys.gemini_key:
        _config.api_keys.gemini_key = env_gemini
    if env_deepseek and not _config.api_keys.deepseek_key:
        _config.api_keys.deepseek_key = env_deepseek
    if env_deepgram and not _config.api_keys.deepgram_key:
        _config.api_keys.deepgram_key = env_deepgram
    if env_fish_audio and not _config.api_keys.fish_audio_key:
        _config.api_keys.fish_audio_key = env_fish_audio
    if env_cartesia and not _config.api_keys.cartesia_key:
        _config.api_keys.cartesia_key = env_cartesia
    if env_sarvam and not _config.api_keys.sarvam_key:
        _config.api_keys.sarvam_key = env_sarvam

    return _config


def save_config(config: AppConfig, persist_secrets: bool = False) -> None:
    """
    Save config to disk.
    If persist_secrets is False (default for server/public usage),
    secrets are not written to the shared file.
    """
    global _config
    _ensure_config_dir()
    _config = config

    data = config.model_dump()
    if not persist_secrets:
        # Don't persist API keys to server disk so multiple users don't conflict
        data["api_keys"] = {
            "gemini_key": "",
            "deepseek_key": "",
            "deepgram_key": "",
            "fish_audio_key": "",
            "cartesia_key": "",
            "sarvam_key": "",
        }

    with open(CONFIG_FILE, "w") as f:
        json.dump(data, f, indent=2)


def get_config() -> AppConfig:
    """Get current config (loads from disk/env if not cached)."""
    global _config
    if _config is None:
        return load_config()
    return _config


def get_server_capabilities() -> dict:
    """
    Return non-sensitive info about which services have server-level .env keys configured.
    Never returns raw secret keys.
    """
    config = get_config()
    fish_ids = {}
    try:
        from voice.fish_audio_manager import get_configured_fish_audio_ids
        fish_ids = get_configured_fish_audio_ids()
    except (ImportError, ModuleNotFoundError):
        try:
            from backend.voice.fish_audio_manager import get_configured_fish_audio_ids
            fish_ids = get_configured_fish_audio_ids()
        except Exception:
            pass
    except Exception:
        pass

    return {
        "server_has_gemini": bool(config.api_keys.gemini_key or os.getenv("GEMINI_API_KEY") or os.getenv("GEMINI_KEY")),
        "server_has_deepseek": bool(config.api_keys.deepseek_key or os.getenv("DEEPSEEK_API_KEY") or os.getenv("DEEPSEEK_KEY")),
        "server_has_deepgram": bool(config.api_keys.deepgram_key or os.getenv("DEEPGRAM_API_KEY") or os.getenv("DEEPGRAM_KEY")),
        "server_has_fish_audio": bool(config.api_keys.fish_audio_key or os.getenv("FISH_AUDIO_KEY")),
        "server_has_cartesia": bool(config.api_keys.cartesia_key or os.getenv("CARTESIA_API_KEY")),
        "server_has_sarvam": bool(config.api_keys.sarvam_key or os.getenv("SARVAM_API_KEY")),
        "fish_audio_ids": fish_ids,
    }


def get_masked_config() -> dict:
    """Return config for frontend display, safe for public sharing."""
    config = get_config()
    data = config.model_dump()

    # Never send real keys to client in public mode; show whether server has them
    caps = get_server_capabilities()
    data["server_capabilities"] = caps
    data["api_keys"] = {
        "gemini_key": "••••••••" if caps["server_has_gemini"] else "",
        "deepseek_key": "••••••••" if caps["server_has_deepseek"] else "",
        "deepgram_key": "••••••••" if caps["server_has_deepgram"] else "",
        "fish_audio_key": "••••••••" if caps["server_has_fish_audio"] else "",
        "cartesia_key": "••••••••" if caps["server_has_cartesia"] else "",
        "sarvam_key": "••••••••" if caps["server_has_sarvam"] else "",
    }

    return data

