"""
LLM Router — Factory function that returns the correct adapter based on config,
with automatic fallback when the primary provider fails (e.g. Gemini free-tier
quota exhaustion → falls back to DeepSeek or Ollama).
"""

from typing import Optional

from llm import LLMAdapter
from config_manager import get_config

FALLBACK_ORDER = ["gemini", "deepseek", "ollama"]


def get_llm_adapter() -> LLMAdapter:
    """Return an LLM adapter instance based on the current configuration."""
    return _adapter_for(get_config().llm.provider)


def _adapter_for(provider: str) -> LLMAdapter:
    provider = provider.lower()
    if provider == "gemini":
        from llm.gemini_adapter import GeminiAdapter
        return GeminiAdapter()
    elif provider == "deepseek":
        from llm.deepseek_adapter import DeepSeekAdapter
        return DeepSeekAdapter()
    elif provider == "ollama":
        from llm.ollama_adapter import OllamaAdapter
        return OllamaAdapter()
    raise ValueError(f"Unknown LLM provider: {provider}. Choose gemini, deepseek, or ollama.")


def _provider_configured(provider: str, config) -> bool:
    """Whether a provider can actually be used right now."""
    provider = provider.lower()
    if provider == "gemini":
        return bool(config.api_keys.gemini_key)
    if provider == "deepseek":
        return bool(config.api_keys.deepseek_key)
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
) -> tuple[str, LLMAdapter]:
    """
    Generate with the configured provider; on quota/rate-limit errors,
    automatically retry with the next configured provider.
    Returns (response_text, adapter_that_answered).
    """
    config = get_config()
    primary = config.llm.provider.lower()

    # Try the primary first, then remaining providers as fallbacks
    order = [primary] + [p for p in FALLBACK_ORDER if p != primary]

    errors: list[str] = []
    last_exc: Optional[Exception] = None

    for provider in order:
        if not _provider_configured(provider, config):
            continue
        try:
            adapter = _adapter_for(provider)
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
            # Only continue to the next provider on quota/rate failures;
            # other errors (bad key etc.) are also worth trying elsewhere though.
            continue

    if last_exc is None:
        raise ValueError(
            "No LLM provider is configured. Add an API key in Config → API Keys."
        )

    if _is_quota_error(last_exc):
        raise RuntimeError(
            f"All LLM providers hit their limits or failed. "
            f"Tried → {' | '.join(errors)}. "
            f"Tip: Gemini free tier allows ~20 requests/day per model — "
            f"switch provider in Config or add billing."
        )
    raise RuntimeError(f"LLM error → {' | '.join(errors)}")
