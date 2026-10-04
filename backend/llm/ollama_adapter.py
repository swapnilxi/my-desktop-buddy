"""
Ollama LLM Adapter using the local HTTP API.
"""
from __future__ import annotations

from typing import Optional
import httpx
from llm import LLMAdapter
from config_manager import get_config


class OllamaAdapter(LLMAdapter):
    """Adapter for locally running Ollama models."""

    def __init__(self):
        config = get_config()
        self.endpoint = config.llm.ollama_endpoint
        self.model = config.llm.ollama_model

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

        payload = {
            "model": self.model,
            "messages": api_messages,
            "stream": False,
            "options": {
                "temperature": temperature,
            },
        }
        if max_tokens:
            payload["options"]["num_predict"] = max_tokens

        # Raise on failure (like the other adapters) so the router can fall back or
        # report the real error instead of sending an error string as the buddy's reply.
        async with httpx.AsyncClient(timeout=120.0) as client:
            try:
                response = await client.post(
                    f"{self.endpoint}/api/chat",
                    json=payload,
                )
            except httpx.ConnectError as exc:
                raise RuntimeError(
                    f"Can't reach Ollama at {self.endpoint}. Start it with `ollama serve`."
                ) from exc
            response.raise_for_status()
            content = response.json().get("message", {}).get("content")
            if not content:
                raise RuntimeError("Ollama returned an empty response.")
            return content

    def get_model_name(self) -> str:
        return f"Ollama ({self.model})"
