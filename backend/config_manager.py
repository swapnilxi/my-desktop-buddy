"""
HamsterDesk Configuration Manager
Handles loading/saving config from ~/.hamsterdesk/config.json
"""

import json
import os
from pathlib import Path
from typing import Optional
from pydantic import BaseModel, Field


# ── Config directory ──────────────────────────────────────────────
CONFIG_DIR = Path.home() / ".hamsterdesk"
CONFIG_FILE = CONFIG_DIR / "config.json"
TODOS_FILE = CONFIG_DIR / "todos.json"


class LLMConfig(BaseModel):
    provider: str = Field(default="gemini", description="LLM provider: gemini, deepseek, ollama")
    gemini_model: str = Field(default="gemini-2.5-flash", description="Gemini model name")
    deepseek_model: str = Field(default="deepseek-chat", description="DeepSeek model name")
    ollama_model: str = Field(default="llama3", description="Ollama model name")
    ollama_endpoint: str = Field(default="http://localhost:11434", description="Ollama API endpoint")


class VoiceConfig(BaseModel):
    mode: str = Field(default="apple", description="Voice mode: deepgram, apple")
    deepgram_model: str = Field(default="nova-2", description="Deepgram STT model")
    tts_voice: str = Field(default="aura-asteria-en", description="Deepgram TTS voice")
    apple_voice: str = Field(default="Samantha", description="Apple TTS voice name")


class RAGConfig(BaseModel):
    enabled: bool = Field(default=False, description="Enable RAG pipeline")
    knowledge_base_path: str = Field(default="", description="Path to knowledge base directory")
    endpoint: str = Field(default="", description="External RAG endpoint URL")


class HamsterConfig(BaseModel):
    name: str = Field(default="Hammy", description="Hamster character name")
    skin: str = Field(default="classic", description="Hamster skin/theme")
    color: str = Field(default="#F4A460", description="Hamster primary color")


class StartupConfig(BaseModel):
    launch_on_login: bool = Field(default=False, description="Launch app on login")
    default_tab: str = Field(default="chat", description="Default active tab")


class APIKeysConfig(BaseModel):
    gemini_key: str = Field(default="", description="Gemini API key")
    deepseek_key: str = Field(default="", description="DeepSeek API key")
    deepgram_key: str = Field(default="", description="Deepgram API key")


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
                "llm": {"provider": "gemini", "gemini_model": "gemini-3.7-flash"},
                "hamster": {"name": "Nibbles", "skin": "classic", "color": "#F4A460"},
            }
        }


# ── Singleton config instance ────────────────────────────────────
_config: Optional[AppConfig] = None


def _ensure_config_dir():
    """Create config directory if it doesn't exist."""
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)


def load_config() -> AppConfig:
    """Load config from disk, or create default if missing."""
    global _config
    _ensure_config_dir()

    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r") as f:
                data = json.load(f)
            _config = AppConfig(**data)
        except (json.JSONDecodeError, Exception):
            _config = AppConfig()
            save_config(_config)
    else:
        _config = AppConfig()
        save_config(_config)

    return _config


def save_config(config: AppConfig) -> None:
    """Save config to disk."""
    global _config
    _ensure_config_dir()
    _config = config

    with open(CONFIG_FILE, "w") as f:
        json.dump(config.model_dump(), f, indent=2)


def get_config() -> AppConfig:
    """Get current config (loads from disk if not cached)."""
    global _config
    if _config is None:
        return load_config()
    return _config


def get_masked_config() -> dict:
    """Return config with API keys masked for frontend display."""
    config = get_config()
    data = config.model_dump()

    # Mask API keys — show last 4 chars only
    for key_field in ["gemini_key", "deepseek_key", "deepgram_key"]:
        val = data["api_keys"].get(key_field, "")
        if val and len(val) > 4:
            data["api_keys"][key_field] = "•" * (len(val) - 4) + val[-4:]

    return data
