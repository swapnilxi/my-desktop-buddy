"""
Gita Verse Context — attaching verses to a conversation (Add to Chat Context).

Covers: honest retrieval of attached verses, the server-side cap, invalid and
valid-but-missing references, the "background, not a mandate" framing, and
that an unrelated technical question is not forced into a scripture answer
just because a verse happens to be attached.
"""
from __future__ import annotations

from krishna.intent import classify
from krishna.orchestrator import _retrieve_context_verses
from krishna.persona import build_system_prompt


def run(coro):
    """Drive one coroutine to completion — no pytest-asyncio in this suite."""
    import asyncio

    return asyncio.run(coro)


def test_attached_context_verse_is_fetched_honestly(seeded):
    results = _retrieve_context_verses([(2, 47)])
    assert len(results) == 1
    r = results[0]
    assert r["reference"] == "Bhagavad Gita 2.47"
    assert r["chapter"] == 2 and r["verse"] == 47
    assert r["sanskrit"]
    assert r["translation"]
    # The curated seed corpus is all unverified until imported from a primary edition.
    assert r["verified"] is False
    assert "error" not in r


def test_multiple_attached_verses_all_reach_the_prompt(seeded):
    results = _retrieve_context_verses([(2, 47), (2, 48)])
    assert {r["reference"] for r in results} == {
        "Bhagavad Gita 2.47", "Bhagavad Gita 2.48",
    }
    prompt = build_system_prompt(classify("hello"), attached_context=results)
    assert "Bhagavad Gita 2.47" in prompt
    assert "Bhagavad Gita 2.48" in prompt


def test_attached_context_deduplicates_repeated_refs(seeded):
    results = _retrieve_context_verses([(2, 47), (2, 47)])
    assert len(results) == 1


def test_attached_context_capped_at_five_server_side(seeded):
    refs = [(2, 47), (2, 48), (2, 11), (2, 13), (2, 14), (2, 20), (2, 22)]
    results = _retrieve_context_verses(refs)
    assert len(results) == 5


def test_attached_context_invalid_reference_is_marked_not_fabricated(seeded):
    results = _retrieve_context_verses([(20, 10)])
    assert results[0]["error"] == "invalid_reference"
    assert "sanskrit" not in results[0]
    prompt = build_system_prompt(classify("hello"), attached_context=results)
    assert "INVALID REFERENCE" in prompt
    assert "Do not use or quote this" in prompt


def test_attached_context_valid_but_missing_is_honest(seeded):
    # Chapter 18 exists and goes up to verse 78, but only 18.47/18.66/18.78 are seeded.
    results = _retrieve_context_verses([(18, 1)])
    assert results[0]["error"] == "not_in_knowledge_base"
    prompt = build_system_prompt(classify("hello"), attached_context=results)
    assert "not yet in the knowledge base" in prompt
    assert "Do not invent it" in prompt
    # Distinct from the invalid-reference message.
    invalid_prompt = build_system_prompt(
        classify("hello"),
        attached_context=_retrieve_context_verses([(20, 10)]),
    )
    assert "INVALID REFERENCE" not in prompt
    assert "not yet in the knowledge base" not in invalid_prompt


def test_attached_context_framed_as_available_not_mandatory(seeded):
    prompt = build_system_prompt(
        classify("hello"), attached_context=_retrieve_context_verses([(2, 47)])
    )
    assert "background, not a mandate" in prompt
    assert "do not force a" in prompt


def test_technical_question_with_attached_context_is_not_forced_into_scripture(seeded):
    """
    The core rule: a Gita reference should never become decoration. Attaching
    a verse makes it *available*, not mandatory — a coding question must
    still get a coding answer, and the classifier's own "ONLY verses you may
    quote" mandate (which belongs to retrieval, not to attached context) must
    not appear.
    """
    message = "How do I fix this Python bug in my FastAPI endpoint?"
    c = classify(message)
    assert c.is_technical
    assert not c.needs_gita

    context = _retrieve_context_verses([(2, 47)])
    prompt = build_system_prompt(c, attached_context=context)

    assert "Answer it technically" in prompt
    assert "ATTACHED SCRIPTURE CONTEXT" in prompt
    assert "the ONLY verses you may quote" not in prompt


def test_gita_context_used_field_on_chat_reply(seeded, monkeypatch):
    import llm.router as router

    class _StubAdapter:
        def get_model_name(self) -> str:
            return "stub-model"

    async def _stub_generate(**kwargs):
        return "Sure — happy to help with the bug.", _StubAdapter()

    monkeypatch.setattr(router, "generate_with_fallback", _stub_generate)

    from krishna.orchestrator import respond

    reply = run(respond(
        message="How do I fix this Python bug?",
        gita_context=[(2, 47), (20, 10)],
        persist=False,
    ))
    used = reply.gita_context_used
    assert len(used) == 2
    by_ref = {(u["chapter"], u["verse"]): u for u in used}
    assert by_ref[(2, 47)]["reference"] == "Bhagavad Gita 2.47"
    assert by_ref[(2, 47)]["error"] is None
    assert by_ref[(20, 10)]["error"] == "invalid_reference"


def test_client_side_cap_enforced_server_side_through_the_route(client, monkeypatch):
    """Even if a client sent more than 5 refs, /krishna/chat must cap at 5."""
    import llm.router as router

    class _StubAdapter:
        def get_model_name(self) -> str:
            return "stub-model"

    async def _stub_generate(**kwargs):
        return "ok", _StubAdapter()

    monkeypatch.setattr(router, "generate_with_fallback", _stub_generate)

    refs = [{"chapter": 2, "verse": v} for v in (47, 48, 11, 13, 14, 20, 22)]
    res = client.post("/krishna/chat", json={"message": "hi", "gita_context": refs})
    assert res.status_code == 200
    assert len(res.json()["gita_context_used"]) == 5
