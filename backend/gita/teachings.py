"""
Today's Teaching (Part 11).

Short life principles *inspired by* the Gita's themes. Every entry carries
`label = "inspired_by"` and is rendered with that framing, because Part 11 is
explicit: modern motivational statements must never be dressed up as direct
Gita quotations.

Where a teaching leans on a specific verse, `gita_ref` points at it so the
reader can go check the actual text rather than take our word for it.
"""
from __future__ import annotations

from typing import Any

TEACHINGS: list[dict[str, Any]] = [
    {"id": "effort-over-outcome", "text": "Focus on the effort. The outcome is not yours to hold.",
     "theme": "detachment from results", "gita_ref": [2, 47]},
    {"id": "failure-is-feedback", "text": "A temporary failure is information, not an identity.",
     "theme": "success and failure", "gita_ref": [2, 48]},
    {"id": "mind-master", "text": "Control your mind, or spend the day being controlled by it.",
     "theme": "mind control", "gita_ref": [6, 5]},
    {"id": "duty-sincerely", "text": "Do the work that is actually yours, and do it sincerely.",
     "theme": "duty", "gita_ref": [3, 8]},
    {"id": "own-path", "text": "Don't measure your path against someone else's.",
     "theme": "comparison", "gita_ref": [3, 35]},
    {"id": "discipline-freedom", "text": "Discipline is not a cage. It is what makes freedom usable.",
     "theme": "discipline", "gita_ref": [6, 17]},
    {"id": "courage-is-action", "text": "Courage is acting while the fear is still there.",
     "theme": "fear", "gita_ref": [12, 15]},
    {"id": "anger-costs-judgement", "text": "Anger takes your judgement first. Decide nothing while it lasts.",
     "theme": "anger", "gita_ref": [2, 63]},
    {"id": "practice-beats-force", "text": "A restless mind answers to repetition, not to scolding.",
     "theme": "discipline", "gita_ref": [6, 35]},
    {"id": "small-start", "text": "Action beats inaction — even when the action is embarrassingly small.",
     "theme": "procrastination", "gita_ref": [3, 8]},
    {"id": "storms-pass", "text": "Heat and cold, praise and criticism — all of it arrives and leaves.",
     "theme": "impermanence", "gita_ref": [2, 14]},
    {"id": "friend-to-self", "text": "You are your own closest ally. Stop working against yourself.",
     "theme": "self discipline", "gita_ref": [6, 5]},
    {"id": "steady-not-numb", "text": "Evenness of mind is not feeling less. It is being thrown less.",
     "theme": "equanimity", "gita_ref": [2, 48]},
    {"id": "remove-the-wind", "text": "Before blaming your focus, remove what keeps disturbing it.",
     "theme": "focus", "gita_ref": [6, 19]},
    {"id": "ask-properly", "text": "A precise question learns faster than a confident guess.",
     "theme": "learning", "gita_ref": [4, 34]},
    {"id": "small-offering", "text": "A small thing offered sincerely counts. You don't need an impressive day.",
     "theme": "devotion", "gita_ref": [9, 26]},
    {"id": "forgive-the-miss", "text": "A streak can break. The journey doesn't have to.",
     "theme": "forgiveness", "gita_ref": [12, 13]},
    {"id": "desire-chain", "text": "Notice what you keep replaying. That is where the pull begins.",
     "theme": "desire", "gita_ref": [2, 62]},
    {"id": "rest-is-discipline", "text": "Measured sleep and food are part of the discipline, not a break from it.",
     "theme": "balance", "gita_ref": [6, 17]},
    {"id": "urge-not-order", "text": "An urge is not an instruction. Something in you gets to decide.",
     "theme": "mind control", "gita_ref": [3, 42]},
    {"id": "fit-over-prestige", "text": "Work that suits you, done imperfectly, beats work that impresses.",
     "theme": "duty", "gita_ref": [18, 47]},
    {"id": "put-guilt-down", "text": "Carrying guilt is not the same as repairing the thing.",
     "theme": "grief", "gita_ref": [18, 66]},
    {"id": "one-thing", "text": "On a heavy day, choose one thing. Finishing one is not a small result.",
     "theme": "duty", "gita_ref": [3, 8]},
    {"id": "wisdom-plus-hands", "text": "Wisdom needs someone willing to actually pick up the bow.",
     "theme": "victory", "gita_ref": [18, 78]},
]

TEACHINGS_BY_ID = {t["id"]: t for t in TEACHINGS}
