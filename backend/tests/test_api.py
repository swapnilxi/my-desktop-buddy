"""
HTTP-level tests.

Confirms the app boots with the new routers, the new endpoints behave, and —
importantly — that the pre-existing routes still work unchanged (Part 73:
do not remove working functionality).
"""
from __future__ import annotations

import pytest


# ── The app boots and reports subsystem health (Part 61) ─────────────────
def test_health_reports_subsystems(client):
    body = client.get("/health").json()
    assert body["status"] == "ok"
    assert body["subsystems"]["gita_verses"] > 0
    assert body["subsystems"]["database"] is True


# ── Existing routes must keep working ────────────────────────────────────
def test_existing_todo_routes_still_work(client):
    assert client.get("/todos").json() == []
    created = client.post("/todos", json={"text": "Existing route check"})
    assert created.status_code == 201
    tid = created.json()["id"]
    assert client.patch(f"/todos/{tid}").json()["completed"] is True
    assert client.delete(f"/todos/{tid}").status_code == 204
    assert client.get("/todos").json() == []


def test_existing_config_route_still_works(client):
    body = client.get("/config").json()
    assert "llm" in body and "voice" in body
    assert body["api_keys"]["gemini_key"] in ("", "••••••••")


def test_existing_context_route_still_works(client):
    assert "context" in client.get("/context").json()


# ── Gita routes ──────────────────────────────────────────────────────────
def test_gita_search_route(client):
    body = client.post("/gita/search", json={"query": "detachment from results", "limit": 2}).json()
    assert body["results"][0]["reference"] == "Bhagavad Gita 2.47"
    assert body["results"][0]["sanskrit"]


def test_gita_search_get_variant(client):
    body = client.get("/gita/search", params={"q": "fear", "limit": 2}).json()
    assert body["results"]


def test_gita_verse_route(client):
    body = client.get("/gita/verse/2/47").json()
    assert body["chapter"] == 2 and body["verse"] == 47
    assert body["translations"] and body["verified"] is False


def test_gita_invalid_reference_returns_404(client):
    res = client.get("/gita/verse/20/10")
    assert res.status_code == 404
    detail = res.json()["detail"]
    assert detail["error"] == "invalid_reference"
    assert "18 chapters" in detail["message"]


def test_gita_valid_but_missing_verse_returns_404_with_distinct_error(client):
    detail = client.get("/gita/verse/1/5").json()["detail"]
    assert detail["error"] == "not_in_knowledge_base"


def test_gita_search_with_invalid_reference_returns_404(client):
    res = client.post("/gita/search", json={"chapter": 20, "verse": 10})
    assert res.status_code == 404


def test_gita_chapters_route(client):
    body = client.get("/gita/chapters").json()
    assert body["total_chapters"] == 18 and body["total_verses"] == 700
    assert len(body["chapters"]) == 18


def test_gita_chapter_detail_and_invalid_chapter(client):
    assert client.get("/gita/chapter/2").json()["count"] > 0
    assert client.get("/gita/chapter/20").status_code == 404


def test_gita_sources_route_exposes_provenance(client):
    body = client.get("/gita/sources").json()
    assert body["sources"]
    assert body["unverified_verses"] == body["verses_available"]
    assert "importer" in body["note"]


def test_gita_themes_route(client):
    assert client.get("/gita/themes").json()["themes"]


# ── Daily routes ─────────────────────────────────────────────────────────
def test_daily_bundle_route(client):
    body = client.get("/daily", params={"day": "2026-09-04"}).json()
    assert body["verse"]["available"] and body["word"]["word"] and body["teaching"]["text"]


@pytest.mark.parametrize("path", ["/daily/verse", "/daily/word", "/daily/teaching"])
def test_daily_subroutes(client, path):
    assert client.get(path).status_code == 200


@pytest.mark.parametrize("bad", ["not-a-date", "2026-13-01", "04-09-2026"])
def test_daily_rejects_bad_dates(client, bad):
    assert client.get("/daily", params={"day": bad}).status_code == 400


# ── Memory routes ────────────────────────────────────────────────────────
def test_memory_crud_over_http(client):
    headers = {"X-User-Id": "alice"}
    assert client.get("/memory", headers=headers).json()["memories"] == []

    created = client.post("/memory", headers=headers, json={
        "category": "GOAL", "key": "marathon", "value": "Half marathon in March",
        "user_confirmed": True,
    })
    assert created.status_code == 201
    mid = created.json()["memory"]["id"]

    assert client.get("/memory", headers=headers).json()["count"] == 1
    assert client.patch(f"/memory/{mid}", headers=headers,
                        json={"value": "Full marathon in March"}).json()["value"] == "Full marathon in March"
    assert client.delete(f"/memory/{mid}", headers=headers).status_code == 204
    assert client.get("/memory", headers=headers).json()["count"] == 0


def test_memory_isolation_over_http(client):
    """Part 59 at the HTTP boundary."""
    a, b = {"X-User-Id": "alice"}, {"X-User-Id": "bob"}
    mid = client.post("/memory", headers=b, json={
        "category": "PROFILE", "key": "name", "value": "Bob", "user_confirmed": True,
    }).json()["memory"]["id"]

    assert client.get("/memory", headers=a).json()["count"] == 0
    assert client.delete(f"/memory/{mid}", headers=a).status_code == 404
    assert client.patch(f"/memory/{mid}", headers=a, json={"value": "hacked"}).status_code == 404
    assert client.get("/memory", headers=b).json()["memories"][0]["value"] == "Bob"


def test_memory_sensitive_blocked_over_http(client):
    res = client.post("/memory", headers={"X-User-Id": "alice"}, json={
        "category": "PROFILE", "key": "k", "value": "my password is hunter2",
        "user_confirmed": True,
    })
    assert res.status_code == 409
    assert res.json()["detail"]["reason"] == "sensitive_requires_consent"


def test_memory_propose_stores_nothing(client):
    headers = {"X-User-Id": "alice"}
    body = client.post("/memory/propose", json={
        "category": "GOAL", "key": "k", "value": "v",
    }).json()
    assert body["actions"] == ["remember", "dont_remember"]
    assert client.get("/memory", headers=headers).json()["count"] == 0


def test_memory_pause_and_forget_over_http(client):
    headers = {"X-User-Id": "alice"}
    client.post("/memory", headers=headers, json={
        "category": "GOAL", "key": "k", "value": "v", "user_confirmed": True})
    assert client.post("/memory/pause", headers=headers, json={"paused": True}).json()["memory_paused"] is True
    assert client.get("/memory", headers=headers).json()["memory_paused"] is True
    client.post("/memory/pause", headers=headers, json={"paused": False})
    assert client.post("/memory/forget-everything", headers=headers).json()["deleted"] == 1


def test_memory_export_route(client):
    headers = {"X-User-Id": "alice"}
    client.post("/memory", headers=headers, json={
        "category": "GOAL", "key": "k", "value": "v", "user_confirmed": True})
    body = client.get("/memory/export", headers=headers).json()
    assert body["user_id"] == "alice" and len(body["memories"]) == 1


def test_memory_bad_category_returns_400(client):
    res = client.post("/memory", headers={"X-User-Id": "alice"}, json={
        "category": "NOPE", "key": "k", "value": "v", "user_confirmed": True})
    assert res.status_code == 400


# ── Krishna routes ───────────────────────────────────────────────────────
def test_modes_route(client):
    body = client.get("/krishna/modes").json()
    ids = [m["id"] for m in body["modes"]]
    assert ids == ["friend", "wise", "productivity", "gita", "meditation",
                   "focus", "playful", "listening"]
    assert next(m for m in body["modes"] if m["default"])["id"] == "friend"


def test_persona_route_states_no_divinity(client):
    body = client.get("/krishna/persona").json()
    assert body["claims_divinity"] is False
    assert "inspired by" in body["disclaimer"]


def test_classify_route(client):
    body = client.post("/krishna/classify", json={"message": "How do I fix this Python bug?"}).json()
    assert body["intent"] == "technical_help"
    assert body["needsGita"] is False


def test_classify_route_flags_invalid_gita_reference(client):
    body = client.post("/krishna/classify", json={"message": "What does Gita 20.10 say?"}).json()
    assert body["gita_reference"]["valid"] is False


def test_motivation_route_is_contextual(client):
    body = client.post("/krishna/motivation", json={
        "intent": "procrastination", "emotion": "neutral",
        "message": "I wasted the whole day"}).json()
    assert "putting something off" in body["reason"]
    assert "You can do it!" in body["avoid"]


def test_celebrate_route_scales_with_magnitude(client):
    assert client.get("/krishna/celebrate", params={"magnitude": "small"}).json()["particles"] is False
    assert client.get("/krishna/celebrate", params={"magnitude": "milestone"}).json()["particles"] is True
    assert client.get("/krishna/celebrate", params={"magnitude": "huge"}).status_code == 400


def test_failure_recovery_route_never_shames(client):
    body = client.get("/krishna/failure-recovery").json()
    assert "shame" in body["never"]
    assert body["steps"][0]["ask"] == "What happened?"


def test_tools_route(client):
    body = client.get("/krishna/tools").json()
    assert len(body["tools"]) >= 16
    assert body["native_tool_calling_enabled"] is False


def test_tool_execute_route_returns_failures_as_200(client):
    """A failed tool is ok=false, not an HTTP error — callers need the reason."""
    body = client.post("/krishna/tools/execute", json={
        "name": "getGitaVerse", "arguments": {"chapter": 20, "verse": 10}}).json()
    assert body["ok"] is False and body["error"] == "invalid_reference"


def test_tool_execute_route_runs_real_tools(client):
    body = client.post("/krishna/tools/execute", json={
        "name": "searchGita", "arguments": {"query": "equanimity", "limit": 1}}).json()
    assert body["ok"] and body["data"]["results"]


def test_events_route(client):
    body = client.get("/krishna/events").json()
    assert "GITA_RETRIEVED" in body["event_names"]
    assert len(body["event_names"]) == 15
    assert client.get("/krishna/events", params={"name": "NOT_AN_EVENT"}).status_code == 400


def test_krishna_chat_rejects_empty_message(client):
    assert client.post("/krishna/chat", json={"message": "   "}).status_code == 400


def test_krishna_chat_without_any_provider_fails_cleanly(client, monkeypatch):
    """
    With no provider available, the user must get a clear error — never a
    fabricated reply. Ollama is normally assumed present, so this stubs the
    availability check to simulate a genuinely empty provider list.
    """
    import llm.router as router

    monkeypatch.setattr(router, "_provider_configured", lambda *a, **k: False)

    res = client.post("/krishna/chat", json={"message": "hello", "mode": "friend"})
    assert res.status_code in (400, 502)
    assert "response" not in res.json()
    assert "detail" in res.json()


def test_krishna_chat_surfaces_provider_failure_rather_than_faking_a_reply(client, monkeypatch):
    """A provider that raises must bubble up as an error, not a silent reply."""
    import llm.router as router

    monkeypatch.setattr(router, "_provider_configured", lambda *a, **k: True)

    def exploding_adapter(*a, **k):
        raise RuntimeError("provider exploded")

    monkeypatch.setattr(router, "_adapter_for", exploding_adapter)

    res = client.post("/krishna/chat", json={"message": "hello"})
    assert res.status_code == 502
    assert "response" not in res.json()
