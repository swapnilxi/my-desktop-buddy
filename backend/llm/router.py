"""
LLM Router — Factory function that returns the correct adapter based on config,
with automatic fallback when the primary provider fails (e.g. Gemini free-tier
quota exhaustion → falls back to DeepSeek or Ollama).
Supports per-request client credentials (from LocalStorage) and server .env keys.
"""

import os
from typing import Optional

from llm import LLMAdapter
from config_manager import get_config

FALLBACK_ORDER = ["gemini", "deepseek", "ollama"]


def _adapter_for(
    provider: str,
    client_keys: Optional[dict] = None,
    client_models: Optional[dict] = None,
) -> LLMAdapter:
    provider = provider.lower()
    keys = client_keys or {}
    models = client_models or {}

    if provider == "gemini":
        from llm.gemini_adapter import GeminiAdapter
        return GeminiAdapter(
            api_key=keys.get("gemini_key"),
            model=models.get("gemini_model")
        )
    elif provider == "deepseek":
        from llm.deepseek_adapter import DeepSeekAdapter
        return DeepSeekAdapter(
            api_key=keys.get("deepseek_key"),
            model=models.get("deepseek_model")
        )
    elif provider == "ollama":
        from llm.ollama_adapter import OllamaAdapter
        return OllamaAdapter()
    raise ValueError(f"Unknown LLM provider: {provider}. Choose gemini, deepseek, or ollama.")


def _provider_configured(provider: str, config, client_keys: Optional[dict] = None) -> bool:
    """Whether a provider can actually be used right now."""
    provider = provider.lower()
    keys = client_keys or {}

    if provider == "gemini":
        return bool(
            keys.get("gemini_key")
            or config.api_keys.gemini_key
            or os.getenv("GEMINI_API_KEY")
            or os.getenv("GEMINI_KEY")
        )
    if provider == "deepseek":
        return bool(
            keys.get("deepseek_key")
            or config.api_keys.deepseek_key
            or os.getenv("DEEPSEEK_API_KEY")
            or os.getenv("DEEPSEEK_KEY")
        )
    if provider == "ollama":
        return True  # local — assumed available
    return False


def _is_quota_error(exc: Exception) -> bool:
    """Detect rate-limit / quota / billing style failures worth falling back on."""
    text = str(exc).lower()
    markers = ("429", "resource_exhausted", "quota", "rate limit", "rate_limit", "exceeded")
    return any(m in text for m in markers)


async def generate_with_fallback(
    messages: list[dict],
    system_prompt: str,
    temperature: float = 0.7,
    max_tokens: Optional[int] = None,
    client_provider: Optional[str] = None,
    client_keys: Optional[dict] = None,
    client_models: Optional[dict] = None,
) -> tuple[str, LLMAdapter]:
    """
    Generate with the configured provider; on quota/rate-limit errors,
    automatically retry with the next configured provider.
    Returns (response_text, adapter_that_answered).
    """
    config = get_config()
    primary = (client_provider or config.llm.provider).lower()

    # Try the primary first, then remaining providers as fallbacks
    order = [primary] + [p for p in FALLBACK_ORDER if p != primary]

    errors: list[str] = []
    last_exc: Optional[Exception] = None

    for provider in order:
        if not _provider_configured(provider, config, client_keys):
            continue
        try:
            adapter = _adapter_for(provider, client_keys, client_models)
            text = await adapter.generate(
                messages=messages,
                system_prompt=system_prompt,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            return text, adapter
        except Exception as exc:
            last_exc = exc
            errors.append(f"{provider}: {exc}")
            continue

    if last_exc is None:
        raise ValueError(
            "No LLM provider key is configured. You can paste your Gemini or DeepSeek API key in the Config tab (stored safely in your browser LocalStorage) or set it in the server .env file."
        )

    if _is_quota_error(last_exc):
        raise RuntimeError(
            f"All configured LLM providers hit their quota limits or failed. "
            f"Tried → {' | '.join(errors)}. "
            f"Tip: Enter your own API key in Config → API Keys (saved in your browser) or check provider billing."
        )
    raise RuntimeError(f"LLM error → {' | '.join(errors)}")

