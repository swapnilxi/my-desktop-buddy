"""
Abstract base class for LLM adapters.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass
class ToolCall:
    """One tool the model asked to run."""

    name: str
    arguments: dict[str, Any] = field(default_factory=dict)


@dataclass
class ToolTurn:
    """
    Result of a generation that had tools available.

    `tool_calls` empty means the model answered directly. Adapters that do
    not support tools never return calls.
    """

    text: str = ""
    tool_calls: list[ToolCall] = field(default_factory=list)
    raw: Any = None


class LLMAdapter(ABC):
    """Base class for all LLM provider adapters."""

    @abstractmethod
    async def generate(
        self,
        messages: list[dict],
        system_prompt: str,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
    ) -> str:
        """
        Generate a response from the LLM.

        Args:
            messages: List of {"role": "user"|"assistant", "content": "..."} dicts
            system_prompt: System instruction (context + personality)
            temperature: Creativity parameter (0.0 - 1.0)
            max_tokens: Maximum response length

        Returns:
            The assistant's response text
        """
        pass

    @abstractmethod
    def get_model_name(self) -> str:
        """Return the name of the model being used."""
        pass

    # ── Optional native tool calling ─────────────────────────────────────
    # Adapters that support provider-side function calling override these.
    # The default is "unsupported", so the orchestrator falls back to its
    # deterministic path rather than silently losing a tool call.
    supports_tools: bool = False

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
        Generate with tools available.

        Default implementation ignores the tools and returns plain text, so
        an adapter without tool support degrades instead of failing.
        """
        text = await self.generate(
            messages=messages, system_prompt=system_prompt,
            temperature=temperature, max_tokens=max_tokens,
        )
        return ToolTurn(text=text)
