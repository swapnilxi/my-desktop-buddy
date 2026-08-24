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


@router.post("")
async def update_config(config: AppConfig):
    """Save updated configuration."""
    # Merge API keys — if masked (contains •), keep the old value
    current = get_config()
    keys = config.api_keys

    if "•" in keys.gemini_key:
        config.api_keys.gemini_key = current.api_keys.gemini_key
    if "•" in keys.deepseek_key:
        config.api_keys.deepseek_key = current.api_keys.deepseek_key
    if "•" in keys.deepgram_key:
        config.api_keys.deepgram_key = current.api_keys.deepgram_key

    save_config(config)
    return {"status": "ok", "message": "Configuration saved successfully 🐹"}
