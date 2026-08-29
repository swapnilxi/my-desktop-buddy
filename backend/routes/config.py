"""
Config routes — load and save application configuration safely for public/shared use.
"""

from fastapi import APIRouter
from config_manager import AppConfig, get_config, get_masked_config, get_server_capabilities, save_config

router = APIRouter(prefix="/config", tags=["config"])


@router.get("")
async def load_config():
    """Get current config with masked API keys and server capability indicators."""
    return get_masked_config()


@router.get("/reveal-keys")
async def reveal_keys():
    """
    In public / multi-user mode, server environment secrets are NEVER leaked to the client.
    Clients store their own keys in their browser LocalStorage.
    """
    return {
        "gemini_key": "",
        "deepseek_key": "",
        "deepgram_key": "",
        "capabilities": get_server_capabilities(),
    }


@router.post("")
async def update_config(config: AppConfig):
    """
    Save updated non-secret configuration (appearance, theme, voice mode preferences).
    Client API keys stay safely in the user's LocalStorage and are not written to shared server disk.
    """
    save_config(config, persist_secrets=False)
    return {"status": "ok", "message": "Configuration saved successfully 🐹"}

