"""
HamsterDesk Configuration Manager
Handles loading/saving config from ~/.hamsterdesk/config.json with .env and environment variable fallbacks.
"""

import json
import os
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv
from pydantic import BaseModel, Field

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
    mode: str = Field(
        default_factory=lambda: os.getenv("VOICE_MODE", "apple"),
        description="Voice mode: deepgram, apple"
    )
    deepgram_model: str = Field(default="nova-2", description="Deepgram STT model")
    tts_voice: str = Field(default="aura-asteria-en", description="Deepgram TTS voice")
    apple_voice: str = Field(default="Samantha", description="Apple TTS voice name")


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

    if env_gemini and not _config.api_keys.gemini_key:
        _config.api_keys.gemini_key = env_gemini
    if env_deepseek and not _config.api_keys.deepseek_key:
        _config.api_keys.deepseek_key = env_deepseek
    if env_deepgram and not _config.api_keys.deepgram_key:
        _config.api_keys.deepgram_key = env_deepgram

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
        data["api_keys"] = {"gemini_key": "", "deepseek_key": "", "deepgram_key": ""}

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
    return {
        "server_has_gemini": bool(config.api_keys.gemini_key or os.getenv("GEMINI_API_KEY") or os.getenv("GEMINI_KEY")),
        "server_has_deepseek": bool(config.api_keys.deepseek_key or os.getenv("DEEPSEEK_API_KEY") or os.getenv("DEEPSEEK_KEY")),
        "server_has_deepgram": bool(config.api_keys.deepgram_key or os.getenv("DEEPGRAM_API_KEY") or os.getenv("DEEPGRAM_KEY")),
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
    }

    return data

