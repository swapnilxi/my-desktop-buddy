"""
Memory tests (Parts 27, 28, 59).

The isolation tests are the important ones: Part 59 requires that one user
can NEVER reach another user's memories.
"""
from __future__ import annotations

import pytest

import memory as M


# ── Part 59: save / retrieve / update / delete / disable / clear ──────────
def test_save_and_retrieve(isolated_profile):
    res = M.save_memory("u1", "GOAL", "marathon", "Training for a half marathon",
                        user_confirmed=True)
    assert res["saved"] and res["action"] == "created"
    items = M.list_memories("u1")
    assert len(items) == 1
    assert items[0]["value"] == "Training for a half marathon"
    assert items[0]["user_confirmed"] is True


def test_save_same_key_updates_rather_than_duplicating(isolated_profile):
    M.save_memory("u1", "GOAL", "marathon", "v1", user_confirmed=True)
    res = M.save_memory("u1", "GOAL", "marathon", "v2", user_confirmed=True)
    assert res["action"] == "updated"
    assert len(M.list_memories("u1")) == 1
    assert M.list_memories("u1")[0]["value"] == "v2"


def test_update_memory(isolated_profile):
    mid = M.save_memory("u1", "WORK", "role", "Backend engineer",
                        user_confirmed=True)["memory"]["id"]
    updated = M.update_memory("u1", mid, value="Staff backend engineer")
    assert updated["value"] == "Staff backend engineer"


def test_delete_memory(isolated_profile):
    mid = M.save_memory("u1", "WORK", "role", "Engineer", user_confirmed=True)["memory"]["id"]
    assert M.delete_memory("u1", mid) is True
    assert M.delete_memory("u1", mid) is False
    assert M.list_memories("u1") == []


def test_forget_everything_really_deletes(isolated_profile):
    for i in range(3):
        M.save_memory("u1", "PROJECT", f"p{i}", f"project {i}", user_confirmed=True)
    assert M.forget_everything("u1")["deleted"] == 3
    assert M.list_memories("u1") == []


def test_pause_blocks_writes_and_recall(isolated_profile):
    M.save_memory("u1", "GOAL", "g", "a goal", user_confirmed=True)
    M.set_memory_paused("u1", True)
    assert M.is_memory_paused("u1")
    res = M.save_memory("u1", "GOAL", "g2", "another", user_confirmed=True)
    assert not res["saved"] and res["reason"] == "memory_paused"
    assert M.recall_for_prompt("u1") == []
    M.set_memory_paused("u1", False)
    assert M.save_memory("u1", "GOAL", "g2", "another", user_confirmed=True)["saved"]


# ── Part 59: cross-user isolation ────────────────────────────────────────
def test_users_cannot_see_each_other(isolated_profile):
    M.save_memory("alice", "PROFILE", "name", "Alice", user_confirmed=True)
    M.save_memory("bob", "PROFILE", "name", "Bob", user_confirmed=True)
    assert [m["value"] for m in M.list_memories("alice")] == ["Alice"]
    assert [m["value"] for m in M.list_memories("bob")] == ["Bob"]


def test_user_cannot_read_another_users_memory_by_id(isolated_profile):
    bob_id = M.save_memory("bob", "PROFILE", "name", "Bob",
                           user_confirmed=True)["memory"]["id"]
    assert M.get_memory("alice", bob_id) is None


def test_user_cannot_delete_another_users_memory(isolated_profile):
    bob_id = M.save_memory("bob", "PROFILE", "name", "Bob",
                           user_confirmed=True)["memory"]["id"]
    assert M.delete_memory("alice", bob_id) is False
    assert len(M.list_memories("bob")) == 1


def test_user_cannot_update_another_users_memory(isolated_profile):
    bob_id = M.save_memory("bob", "PROFILE", "name", "Bob",
                           user_confirmed=True)["memory"]["id"]
    assert M.update_memory("alice", bob_id, value="hacked") is None
    assert M.get_memory("bob", bob_id)["value"] == "Bob"


def test_forget_everything_is_scoped_to_one_user(isolated_profile):
    M.save_memory("alice", "GOAL", "a", "alice goal", user_confirmed=True)
    M.save_memory("bob", "GOAL", "b", "bob goal", user_confirmed=True)
    M.forget_everything("alice")
    assert len(M.list_memories("bob")) == 1


def test_pause_is_per_user(isolated_profile):
    M.set_memory_paused("alice", True)
    assert M.is_memory_paused("alice") is True
    assert M.is_memory_paused("bob") is False


# ── Part 27: no silent storage of sensitive information ──────────────────
@pytest.mark.parametrize("value,kind", [
    ("My API key is sk-abcdef1234567890abcdef", "credential"),
    ("password is hunter2", "credential"),
    ("card number 4111 1111 1111 1111", "financial"),
    ("my aadhaar is 1234 5678 9012", "government_id"),
    ("I was diagnosed with depression", "health"),
    ("email me at someone@example.com", "contact"),
])
def test_sensitive_values_are_detected(value, kind):
    assert kind in M.classify_sensitivity(value)


@pytest.mark.parametrize("value", [
    "My API key is sk-abcdef1234567890abcdef",
    "card number 4111 1111 1111 1111",
    "I was diagnosed with depression",
])
def test_sensitive_content_refused_without_explicit_consent(isolated_profile, value):
    res = M.save_memory("u1", "PROFILE", "k", value)
    assert not res["saved"]
    assert res["reason"] == "sensitive_requires_consent"
    assert M.list_memories("u1") == []


def test_sensitive_content_stored_only_with_explicit_consent(isolated_profile):
    res = M.save_memory("u1", "PROFILE", "k", "my password is hunter2",
                        user_confirmed=True, allow_sensitive=True)
    assert res["saved"]
    assert res["memory"]["sensitive"] is True


def test_ordinary_content_needs_no_sensitivity_override(isolated_profile):
    assert M.save_memory("u1", "PREFERENCE", "workout", "Prefers morning workouts")["saved"]


def test_proposal_persists_nothing(isolated_profile):
    p = M.propose_memory("GOAL", "marathon", "Wants to run a half marathon")
    assert p.requires_consent
    assert p.as_dict()["actions"] == ["remember", "dont_remember"]
    assert M.list_memories("u1") == []


def test_sensitive_proposal_explains_why_it_is_asking():
    p = M.propose_memory("PROFILE", "card", "card number 4111 1111 1111 1111")
    assert p.sensitive
    assert "won't store it unless you tell me to" in p.prompt


# ── Part 29: recall for prompt excludes sensitive items ──────────────────
def test_recall_excludes_sensitive_even_when_confirmed(isolated_profile):
    M.save_memory("u1", "GOAL", "safe", "Wants to learn Rust", user_confirmed=True)
    M.save_memory("u1", "PROFILE", "secret", "password is hunter2",
                  user_confirmed=True, allow_sensitive=True)
    recalled = M.recall_for_prompt("u1")
    assert [m["key"] for m in recalled] == ["safe"]
    assert not any(m["sensitive"] for m in recalled)


def test_recall_is_bounded(isolated_profile):
    for i in range(30):
        M.save_memory("u1", "PROJECT", f"p{i}", f"project {i}", user_confirmed=True)
    assert len(M.recall_for_prompt("u1", limit=12)) == 12


# ── Validation ───────────────────────────────────────────────────────────
def test_unknown_category_rejected(isolated_profile):
    with pytest.raises(ValueError, match="Unknown memory category"):
        M.save_memory("u1", "NOT_A_CATEGORY", "k", "v", user_confirmed=True)


def test_empty_key_or_value_rejected(isolated_profile):
    with pytest.raises(ValueError):
        M.save_memory("u1", "GOAL", "", "value", user_confirmed=True)
    with pytest.raises(ValueError):
        M.save_memory("u1", "GOAL", "key", "", user_confirmed=True)


def test_all_ten_categories_accepted(isolated_profile):
    for cat in M.CATEGORIES:
        assert M.save_memory("u1", cat, f"k_{cat}", "value", user_confirmed=True)["saved"]
    assert len(M.list_memories("u1")) == len(M.CATEGORIES)


def test_export_includes_pause_state(isolated_profile):
    from memory.store import export_memories

    M.save_memory("u1", "GOAL", "g", "a goal", user_confirmed=True)
    data = export_memories("u1")
    assert data["user_id"] == "u1"
    assert len(data["memories"]) == 1
    assert data["memory_paused"] is False
