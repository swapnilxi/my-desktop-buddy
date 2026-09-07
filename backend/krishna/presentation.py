"""
Presentation payload (Part 63/70) — the single, typed shape describing how
Krishna should *look and sound* for one moment: an animation, a chakra glow
state, a voice delivery mode, whether particles play, and the legacy `mood`
string kept for the existing frontend.

Before this module there were three independent producers of this same
shape, each a hand-built dict with the same five keys spelled slightly
differently (`voice_mode` vs `voiceMode`, an `emotion` key nobody read,
etc.). This model is the one place that shape is defined; everything else
either builds one or reads one.
"""
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

Animation = Literal[
    "IDLE", "THINKING", "LISTENING", "TALKING", "HAPPY", "CELEBRATING",
    "FOCUSED", "MEDITATING", "WAVING", "EXCITED", "CONCERNED",
]
Chakra = Literal["CALM", "FAST", "SLOW", "GLOW", "BREATHE", "ACCELERATE", "CELEBRATE"]
VoiceMode = Literal["NEUTRAL", "SILENT", "HAPPY", "GENTLE", "CALM", "WARM", "SOFT"]


class Presentation(BaseModel):
    animation: Animation = "IDLE"
    chakra: Chakra = "CALM"
    voice_mode: VoiceMode = Field("NEUTRAL", alias="voiceMode")
    particles: bool = False
    mood: str = "idle"

    model_config = {"populate_by_name": True}

    def as_wire(self) -> dict[str, Any]:
        """The plain nested-dict shape (`animation`/`chakra`/`voiceMode`/`particles`)
        used wherever a raw dict is expected rather than this model."""
        return {
            "animation": self.animation,
            "chakra": self.chakra,
            "voiceMode": self.voice_mode,
            "particles": self.particles,
        }
