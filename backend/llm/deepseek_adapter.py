"""
DeepSeek LLM Adapter using the OpenAI-compatible API.
Supports dynamic per-request API keys (client LocalStorage) and server .env fallback.
"""
from __future__ import annotations

import os
from typing import Optional
from openai import AsyncOpenAI
from llm import LLMAdapter
from config_manager import get_config


class DeepSeekAdapter(LLMAdapter):
    """Adapter for DeepSeek models via OpenAI-compatible API."""

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        config = get_config()
        resolved_key = (
            api_key
            or config.api_keys.deepseek_key
            or os.getenv("DEEPSEEK_API_KEY")
            or os.getenv("DEEPSEEK_KEY")
        )
        if not resolved_key:
            raise ValueError(
                "DeepSeek API key not configured. Add your key in Config → API Keys (stored locally in browser) or set DEEPSEEK_API_KEY in .env."
            )
        self.client = AsyncOpenAI(
            api_key=resolved_key,
            base_url="https://api.deepseek.com",
        )
        self.model = model or config.llm.deepseek_model or "deepseek-chat"

    async def generate(
        self,
        messages: list[dict],
        system_prompt: str,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
    ) -> str:
        # Build message list with system prompt
        api_messages = [{"role": "system", "content": system_prompt}]
        for msg in messages:
            api_messages.append({"role": msg["role"], "content": msg["content"]})

        kwargs = {
            "model": self.model,
            "messages": api_messages,
            "temperature": temperature,
        }
        if max_tokens:
            kwargs["max_tokens"] = max_tokens

        response = await self.client.chat.completions.create(**kwargs)

        content = response.choices[0].message.content
        return content or "🐹 *squeak* I couldn't generate a response. Try again?"

    def get_model_name(self) -> str:
        return f"DeepSeek ({self.model})"

