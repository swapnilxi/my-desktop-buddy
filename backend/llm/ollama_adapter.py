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

        async with httpx.AsyncClient(timeout=120.0) as client:
            try:
                response = await client.post(
                    f"{self.endpoint}/api/chat",
                    json=payload,
                )
                response.raise_for_status()
                data = response.json()
                return data.get("message", {}).get("content", "🐹 *squeak* No response from Ollama.")
            except httpx.ConnectError:
                return (
                    "🐹 Oops! I can't reach Ollama. Make sure it's running locally "
                    f"at {self.endpoint}. You can start it with `ollama serve`."
                )
            except Exception as e:
                return f"🐹 Something went wrong with Ollama: {str(e)}"

    def get_model_name(self) -> str:
        return f"Ollama ({self.model})"
