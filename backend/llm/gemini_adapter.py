"""
Gemini LLM Adapter using the official google-genai SDK.
"""
from __future__ import annotations

from typing import Optional
from google import genai
from google.genai import types
from llm import LLMAdapter
from config_manager import get_config


class GeminiAdapter(LLMAdapter):
    """Adapter for Google Gemini models via Google AI Studio."""

    def __init__(self):
        config = get_config()
        api_key = config.api_keys.gemini_key
        if not api_key:
            raise ValueError("Gemini API key not configured. Set it in Config → API Keys.")
        self.client = genai.Client(api_key=api_key)
        self.model = config.llm.gemini_model or "gemini-2.5-flash"

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

        # Configure generation via google-genai SDK types
        config = types.GenerateContentConfig(
            system_instruction=system_prompt,
            temperature=temperature,
            max_output_tokens=max_tokens if max_tokens else None,
        )

        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=contents,
                config=config,
            )
            return response.text or "🐹 *squeak* I couldn't generate a response. Try again?"
        except Exception as e:
            # Fallback to gemini-2.5-flash if configured model name is invalid/deprecated
            if self.model != "gemini-2.5-flash":
                try:
                    response = self.client.models.generate_content(
                        model="gemini-2.5-flash",
                        contents=contents,
                        config=config,
                    )
                    return response.text or "🐹 *squeak* I couldn't generate a response. Try again?"
                except Exception:
                    pass
            raise e

    def get_model_name(self) -> str:
        return f"Gemini ({self.model})"

