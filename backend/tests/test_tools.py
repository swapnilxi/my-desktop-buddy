"""
Tool layer tests (Part 66).

The central rule under test: a tool never reports success for work that did
not happen, and an unbuilt tool fails loudly instead of pretending.
"""
from __future__ import annotations

import pytest

from tools import REGISTRY, execute_tool, gemini_declarations, openai_declarations, tool_catalog


def test_every_tool_from_the_spec_is_registered():
    expected = {
        "searchGita", "getGitaVerse", "saveMemory", "getMemory", "deleteMemory",
        "createTask", "completeTask", "listTasks", "createGoal", "updateGoal",
        "logHabit", "startFocus", "endFocus", "createReminder", "getDailySummary",
        "searchWeb",
    }
    assert expected <= set(REGISTRY)


def test_declarations_are_well_formed():
    for decl in gemini_declarations():
        assert decl["name"] and decl["description"]
        assert decl["parameters"]["type"] == "object"
        assert isinstance(decl["parameters"]["properties"], dict)
    for decl in openai_declarations():
        assert decl["type"] == "function"


def test_disabled_tools_are_declared_but_flagged():
    disabled = [t for t in tool_catalog() if not t["enabled"]]
    assert disabled
    for decl in gemini_declarations():
        spec = REGISTRY[decl["name"]]
        if not spec.enabled:
            assert "NOT YET AVAILABLE" in decl["description"]


# ── Never claim success falsely ──────────────────────────────────────────
@pytest.mark.parametrize("name", ["createGoal", "updateGoal", "logHabit", "createReminder", "searchWeb"])
def test_unbuilt_tools_fail_honestly(seeded, name):
    res = execute_tool(name, {})
    assert res.ok is False
    assert res.error == "not_implemented"
    assert "not built yet" in res.message


def test_unknown_tool_fails(seeded):
    res = execute_tool("teleport", {})
    assert res.ok is False and res.error == "unknown_tool"


def test_missing_required_argument_fails(seeded):
    res = execute_tool("getGitaVerse", {"chapter": 2})
    assert res.ok is False and res.error == "missing_arguments"


def test_handler_exception_becomes_a_failed_result(seeded, monkeypatch):
    """A crashing tool must not raise into the caller."""
    def boom(**_):
        raise RuntimeError("kaboom")

    monkeypatch.setattr(REGISTRY["listTasks"], "handler", boom)
    res = execute_tool("listTasks", {})
    assert res.ok is False and res.error == "tool_error"


# ── Gita tools ───────────────────────────────────────────────────────────
def test_search_gita_tool(seeded):
    res = execute_tool("searchGita", {"query": "detachment from results", "limit": 2})
    assert res.ok
    assert res.data["results"][0]["reference"] == "Bhagavad Gita 2.47"


def test_get_gita_verse_tool(seeded):
    res = execute_tool("getGitaVerse", {"chapter": 2, "verse": 47})
    assert res.ok
    assert res.data["verified"] is False
    assert res.data["sanskrit"]


def test_get_gita_verse_invalid_reference_fails(seeded):
    res = execute_tool("getGitaVerse", {"chapter": 20, "verse": 10})
    assert res.ok is False and res.error == "invalid_reference"
    assert res.data is None


def test_search_gita_invalid_reference_fails(seeded):
    res = execute_tool("searchGita", {"query": "What does Gita 20.10 say?"})
    assert res.ok is False and res.error == "invalid_reference"


# ── Memory tools and the consent gate ────────────────────────────────────
def test_save_memory_requires_consent_first(seeded):
    res = execute_tool("saveMemory", {"category": "GOAL", "key": "k", "value": "v"})
    assert res.ok is False and res.error == "consent_required"
    assert res.data["prompt"]
    assert execute_tool("getMemory", {}).data == []


def test_save_memory_with_consent_persists(seeded):
    res = execute_tool("saveMemory", {"category": "GOAL", "key": "k", "value": "v",
                                      "user_confirmed": True})
    assert res.ok
    assert len(execute_tool("getMemory", {}).data) == 1


def test_save_memory_sensitive_still_refused(seeded):
    res = execute_tool("saveMemory", {"category": "PROFILE", "key": "k",
                                      "value": "password is hunter2", "user_confirmed": True})
    assert res.ok is False and res.error == "sensitive_requires_consent"


def test_delete_missing_memory_fails(seeded):
    res = execute_tool("deleteMemory", {"memory_id": "does-not-exist"})
    assert res.ok is False and res.error == "not_found"


# ── Task tools use the existing todo store ───────────────────────────────
def test_task_lifecycle(seeded):
    created = execute_tool("createTask", {"title": "Write the docs"})
    assert created.ok
    tid = created.data["id"]
    assert execute_tool("listTasks", {}).data[0]["text"] == "Write the docs"
    assert execute_tool("completeTask", {"task_id": tid}).ok
    assert execute_tool("listTasks", {"status": "completed"}).data[0]["completed"] is True


def test_completing_a_missing_task_fails(seeded):
    res = execute_tool("completeTask", {"task_id": 999})
    assert res.ok is False and res.error == "not_found"


def test_empty_task_title_rejected(seeded):
    assert execute_tool("createTask", {"title": "   "}).ok is False


def test_completing_twice_does_not_toggle_back(seeded):
    """Regression: completeTask must be idempotent, not a toggle."""
    tid = execute_tool("createTask", {"title": "One"}).data["id"]
    execute_tool("completeTask", {"task_id": tid})
    execute_tool("completeTask", {"task_id": tid})
    assert execute_tool("listTasks", {}).data[0]["completed"] is True


# ── Focus session tools ──────────────────────────────────────────────────
def test_focus_session_lifecycle(seeded):
    started = execute_tool("startFocus", {"minutes": 25, "activity": "deep work"})
    assert started.ok
    ended = execute_tool("endFocus", {})
    assert ended.ok and ended.data["session_id"] == started.data["session_id"]


def test_ending_with_no_open_session_fails(seeded):
    assert execute_tool("endFocus", {}).ok is False


@pytest.mark.parametrize("minutes", [0, -5, 9999])
def test_absurd_focus_lengths_rejected(seeded, minutes):
    assert execute_tool("startFocus", {"minutes": minutes}).ok is False


# ── Daily summary ────────────────────────────────────────────────────────
def test_daily_summary_tool(seeded):
    execute_tool("createTask", {"title": "Pending thing"})
    res = execute_tool("getDailySummary", {"day": "2026-09-04"})
    assert res.ok
    assert res.data["verse"]["reference"]
    assert res.data["word"]["word"]
    assert res.data["teaching"]["text"]
    assert res.data["tasks"]["pending"] == 1
