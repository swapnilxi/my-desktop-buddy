"""
Gemini LLM Adapter using the google-genai SDK.
"""
from __future__ import annotations

from typing import Optional
from google import genai
from llm import LLMAdapter
from config_manager import get_config


class GeminiAdapter(LLMAdapter):
    """Adapter for Google Gemini models."""

    def __init__(self):
        config = get_config()
        api_key = config.api_keys.gemini_key
        if not api_key:
            raise ValueError("Gemini API key not configured. Set it in Config → API Keys.")
        self.client = genai.Client(api_key=api_key)
        self.model = config.llm.gemini_model

    async def generate(
        self,
        messages: list[dict],
        system_prompt: str,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
    ) -> str:
        # Build contents from message history
        contents = []
        for msg in messages:
            role = "user" if msg["role"] == "user" else "model"
            contents.append({"role": role, "parts": [{"text": msg["content"]}]})

        # Configure generation
        gen_config = {"temperature": temperature}
        if max_tokens:
            gen_config["max_output_tokens"] = max_tokens

        response = self.client.models.generate_content(
            model=self.model,
            contents=contents,
            config={
                "system_instruction": system_prompt,
                "generation_config": gen_config,
            },
        )

        return response.text or "🐹 *squeak* I couldn't generate a response. Try again?"

    def get_model_name(self) -> str:
        return f"Gemini ({self.model})"
