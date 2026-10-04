"""
DeepSeek LLM Adapter using the OpenAI-compatible API.
Supports dynamic per-request API keys (client LocalStorage) and server .env fallback.
"""
from __future__ import annotations

import json
import os
from typing import Any, Optional
from openai import AsyncOpenAI
from llm import LLMAdapter, ToolCall, ToolTurn
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

    # ── Native tool calling (OpenAI-compatible) ──────────────────────────
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
        Generate with OpenAI-shaped tool definitions.

        Falls back to a plain generation if the provider rejects the tool
        payload, so a tool-schema problem cannot cost the user their reply.
        """
        api_messages: list[dict[str, Any]] = [{"role": "system", "content": system_prompt}]
        for msg in messages:
            api_messages.append({"role": msg["role"], "content": msg["content"]})

        for prior in tool_results or []:
            call_id = prior.get("call_id") or f"call_{prior['name']}"
            api_messages.append({
                "role": "assistant",
                "tool_calls": [{
                    "id": call_id, "type": "function",
                    "function": {"name": prior["name"],
                                 "arguments": json.dumps(prior.get("arguments") or {})},
                }],
            })
            api_messages.append({
                "role": "tool", "tool_call_id": call_id,
                "content": json.dumps(prior.get("result") or {}, ensure_ascii=False),
            })

        kwargs: dict[str, Any] = {
            "model": self.model,
            "messages": api_messages,
            "temperature": temperature,
        }
        if max_tokens:
            kwargs["max_tokens"] = max_tokens
        if tools:
            kwargs["tools"] = [{"type": "function", "function": t} for t in tools]

        try:
            response = await self.client.chat.completions.create(**kwargs)
        except Exception:
            text = await self.generate(
                messages=messages, system_prompt=system_prompt,
                temperature=temperature, max_tokens=max_tokens,
            )
            return ToolTurn(text=text)

        choice = response.choices[0].message
        calls: list[ToolCall] = []
        for tc in (getattr(choice, "tool_calls", None) or []):
            try:
                args = json.loads(tc.function.arguments or "{}")
            except (json.JSONDecodeError, TypeError):
                args = {}
            calls.append(ToolCall(name=tc.function.name, arguments=args))

        return ToolTurn(text=choice.content or "", tool_calls=calls, raw=response)

    def get_model_name(self) -> str:
        return f"DeepSeek ({self.model})"

