"""
LLM Router — Factory function that returns the correct adapter based on config.
"""

from llm import LLMAdapter
from config_manager import get_config


def get_llm_adapter() -> LLMAdapter:
    """Return an LLM adapter instance based on the current configuration."""
    config = get_config()
    provider = config.llm.provider.lower()

    if provider == "gemini":
        from llm.gemini_adapter import GeminiAdapter
        return GeminiAdapter()
    elif provider == "deepseek":
        from llm.deepseek_adapter import DeepSeekAdapter
        return DeepSeekAdapter()
    elif provider == "ollama":
        from llm.ollama_adapter import OllamaAdapter
        return OllamaAdapter()
    else:
        raise ValueError(f"Unknown LLM provider: {provider}. Choose gemini, deepseek, or ollama.")
