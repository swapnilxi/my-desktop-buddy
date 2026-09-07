"""
Gita Verse Context — the /gita/explain endpoint (Explain Simply / Go Deeper).

This route deliberately has no LLM logic of its own: it validates the
reference, then calls the same `krishna.orchestrator.respond()` every chat
message goes through. These tests prove that reuse, prove invalid/missing
verses never reach the model, and cover the depth/language directives.
"""
from __future__ import annotations

import pytest


class _StubAdapter:
    def get_model_name(self) -> str:
        return "stub-model"


def _stub_router(monkeypatch, captured: dict):
    import llm.router as router

    async def _stub_generate(**kwargs):
        captured["system_prompt"] = kwargs["system_prompt"]
        captured["messages"] = kwargs["messages"]
        return "Dost, simple language mein — focus on the action, not the outcome.", _StubAdapter()

    monkeypatch.setattr(router, "generate_with_fallback", _stub_generate)


def test_explain_invalid_reference_returns_404_without_any_llm_call(client, monkeypatch):
    import llm.router as router

    # No provider configured at all — if the route reached the LLM, this
    # would surface as a 502/500, not the 404 we expect from validation.
    monkeypatch.setattr(router, "_provider_configured", lambda *a, **k: False)

    res = client.post("/gita/explain", json={"chapter": 20, "verse": 10})
    assert res.status_code == 404
    assert res.json()["detail"]["error"] == "invalid_reference"


def test_explain_valid_but_missing_verse_returns_404_distinctly(client, monkeypatch):
    import llm.router as router

    monkeypatch.setattr(router, "_provider_configured", lambda *a, **k: False)

    # Chapter 18 exists (up to verse 78) but only 18.47/18.66/18.78 are seeded.
    res = client.post("/gita/explain", json={"chapter": 18, "verse": 1})
    assert res.status_code == 404
    detail = res.json()["detail"]
    assert detail["error"] == "not_in_knowledge_base"

    invalid = client.post("/gita/explain", json={"chapter": 20, "verse": 10}).json()["detail"]
    assert detail["message"] != invalid["message"]


def test_explain_reuses_the_orchestrator_reply_shape(client, monkeypatch):
    """Proves this is not a parallel LLM path: the payload is a normal
    KrishnaReply (intent, presentation, gita_used, conversation_id) plus the
    explain-specific depth/language/reference fields."""
    _stub_router(monkeypatch, {})

    res = client.post("/gita/explain", json={"chapter": 2, "verse": 47})
    assert res.status_code == 200
    body = res.json()
    assert body["depth"] == "simple"
    assert body["language"] == "en"
    assert body["reference"] == "2.47"
    assert "intent" in body
    assert "presentation" in body
    assert body["gita_used"]
    assert body["gita_used"][0]["reference"] == "Bhagavad Gita 2.47"
    assert "conversation_id" in body


def test_explain_appends_to_the_same_conversation(client, monkeypatch):
    _stub_router(monkeypatch, {})

    session = client.post("/krishna/sessions", json={}).json()
    res = client.post("/gita/explain", json={
        "chapter": 2, "verse": 47, "conversation_id": session["id"],
    })
    assert res.status_code == 200
    conv_id = res.json()["conversation_id"]
    assert conv_id == session["id"]

    history = client.get(f"/krishna/sessions/{conv_id}").json()
    roles = [m["role"] for m in history["messages"]]
    assert roles == ["user", "assistant"]
    assert "2.47" in history["messages"][0]["content"]


def test_explain_never_lets_the_model_invent_verse_text(client, monkeypatch):
    captured: dict = {}
    _stub_router(monkeypatch, captured)

    client.post("/gita/explain", json={"chapter": 2, "verse": 47})
    assert "Never invent a verse" in captured["system_prompt"]


def test_explain_marks_unverified_seed_text(client, monkeypatch):
    captured: dict = {}
    _stub_router(monkeypatch, captured)

    client.post("/gita/explain", json={"chapter": 2, "verse": 47})
    assert "unverified seed text" in captured["system_prompt"]


@pytest.mark.parametrize("depth,marker", [
    ("simple", "Skip the section headings"),
    ("detailed", "five-section format"),
    ("deep_gita", "expand 'Gita Connection'"),
    ("modern_example", "never claim the verse itself names this modern context"),
])
def test_explain_depth_directives_are_distinct_in_the_prompt(client, monkeypatch, depth, marker):
    captured: dict = {}
    _stub_router(monkeypatch, captured)

    res = client.post("/gita/explain", json={"chapter": 2, "verse": 47, "depth": depth})
    assert res.status_code == 200
    assert res.json()["depth"] == depth
    assert marker in captured["system_prompt"]


@pytest.mark.parametrize("language,marker", [
    ("en", "Reply in English."),
    ("hi", "Reply in Hindi"),
    ("hinglish", "Reply in natural Hinglish"),
])
def test_explain_language_directives(client, monkeypatch, language, marker):
    captured: dict = {}
    _stub_router(monkeypatch, captured)

    res = client.post("/gita/explain", json={"chapter": 2, "verse": 47, "language": language})
    assert res.status_code == 200
    assert res.json()["language"] == language
    assert marker in captured["system_prompt"]
    if language in ("hi", "hinglish"):
        assert "Dharma" in captured["system_prompt"] and "Karma" in captured["system_prompt"]
