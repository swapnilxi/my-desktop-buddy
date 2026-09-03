"""
Gemini LLM Adapter using the official google-genai SDK.
Supports dynamic per-request API keys (client LocalStorage) and server .env fallback.
"""
from __future__ import annotations

import os
from typing import Any, Optional
from google import genai
from google.genai import types
from llm import LLMAdapter, ToolCall, ToolTurn
from config_manager import get_config


class GeminiAdapter(LLMAdapter):
    """Adapter for Google Gemini models via Google AI Studio."""

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        config = get_config()
        resolved_key = (
            api_key
            or config.api_keys.gemini_key
            or os.getenv("GEMINI_API_KEY")
            or os.getenv("GEMINI_KEY")
        )
        if not resolved_key:
            raise ValueError(
                "Gemini API key not configured. Add your free key in Config → API Keys (stored locally in browser) or set GEMINI_API_KEY in .env."
            )
        self.api_key = resolved_key
        self.client = genai.Client(api_key=resolved_key)
        self.model = model or config.llm.gemini_model or "gemini-2.5-flash"

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

    # ── Native function calling ──────────────────────────────────────────
    supports_tools = True

    async def generate_with_tools(
        self,
        messages: list[dict],
        system_prompt: str,
        tools: list[dict],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        tool_results: Optional[list[dict]] = None,
    ) -> ToolTurn:
        """
        Generate with Gemini function declarations attached.

        `tool_results` carries a prior round back to the model as
        function_call / function_response turns. Any failure in the tool
        plumbing degrades to a plain text generation rather than erroring —
        losing a tool call is recoverable, losing the reply is not.
        """
        contents: list[Any] = []
        for msg in messages:
            role = "user" if msg["role"] == "user" else "model"
            contents.append({"role": role, "parts": [{"text": msg["content"]}]})

        # Replay the previous tool round so the model can use the outputs.
        for prior in tool_results or []:
            contents.append({
                "role": "model",
                "parts": [{"function_call": {"name": prior["name"],
                                             "args": prior.get("arguments") or {}}}],
            })
            contents.append({
                "role": "user",
                "parts": [{"function_response": {"name": prior["name"],
                                                 "response": prior.get("result") or {}}}],
            })

        try:
            config = types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=temperature,
                max_output_tokens=max_tokens if max_tokens else None,
                tools=[types.Tool(function_declarations=tools)] if tools else None,
            )
            response = self.client.models.generate_content(
                model=self.model, contents=contents, config=config,
            )
        except Exception:
            # Tool plumbing unavailable or rejected — answer without tools.
            text = await self.generate(
                messages=messages, system_prompt=system_prompt,
                temperature=temperature, max_tokens=max_tokens,
            )
            return ToolTurn(text=text)

        calls: list[ToolCall] = []
        for fc in (getattr(response, "function_calls", None) or []):
            calls.append(ToolCall(name=fc.name, arguments=dict(fc.args or {})))

        text = ""
        try:
            text = response.text or ""
        except Exception:
            # Gemini raises when the candidate is function-calls-only.
            text = ""

        return ToolTurn(text=text, tool_calls=calls, raw=response)

    def get_model_name(self) -> str:
        return f"Gemini ({self.model})"


