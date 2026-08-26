"""
Config routes — load and save application configuration.
"""

from fastapi import APIRouter
from config_manager import AppConfig, get_config, get_masked_config, save_config

router = APIRouter(prefix="/config", tags=["config"])


@router.get("")
async def load_config():
    """Get current config with masked API keys."""
    return get_masked_config()


@router.get("/reveal-keys")
async def reveal_keys():
    """
    Return the real (unmasked) API keys. Local-only desktop app — the
    frontend uses this so the 👁️ toggle can show the actual stored key.
    """
    config = get_config()
    return {
        "gemini_key": config.api_keys.gemini_key,
        "deepseek_key": config.api_keys.deepseek_key,
        "deepgram_key": config.api_keys.deepgram_key,
    }


@router.post("")
async def update_config(config: AppConfig):
    """Save updated configuration."""
    # Merge API keys — keep the stored value when the incoming one is
    # masked (contains •) or empty, so keys are never wiped by accident.
    current = get_config()
    keys = config.api_keys

    for field in ("gemini_key", "deepseek_key", "deepgram_key"):
        incoming = getattr(keys, field)
        if not incoming or "•" in incoming:
            setattr(keys, field, getattr(current.api_keys, field))

    save_config(config)
    return {"status": "ok", "message": "Configuration saved successfully 🐹"}
