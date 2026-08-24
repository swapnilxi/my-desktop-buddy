"""
Abstract base class for LLM adapters.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Optional, List


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
