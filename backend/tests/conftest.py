"""
Test fixtures.

Every test runs against a throwaway SQLite file and a throwaway todos file,
so nothing in the suite can touch a real ~/.hamsterdesk profile.
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parent.parent
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))


@pytest.fixture(autouse=True)
def isolated_profile(tmp_path, monkeypatch):
    """Point config, DB and todo storage at a temp directory for each test."""
    import config_manager
    import context
    import db

    monkeypatch.setattr(config_manager, "CONFIG_DIR", tmp_path, raising=False)
    monkeypatch.setattr(config_manager, "CONFIG_FILE", tmp_path / "config.json", raising=False)
    monkeypatch.setattr(config_manager, "TODOS_FILE", tmp_path / "todos.json", raising=False)
    monkeypatch.setattr(context, "TODOS_FILE", tmp_path / "todos.json", raising=False)
    monkeypatch.setattr(db, "DB_FILE", tmp_path / "krishna.db", raising=False)

    db.init_db(force=True)
    yield tmp_path
    monkeypatch.setattr(db, "_initialized", False, raising=False)


@pytest.fixture
def seeded(isolated_profile):
    """A database with the curated Gita seed corpus loaded."""
    from gita import seed_if_empty

    seed_if_empty()
    return isolated_profile


@pytest.fixture
def client(seeded):
    """FastAPI test client with the DB already seeded."""
    from fastapi.testclient import TestClient

    import main

    with TestClient(main.app) as c:
        yield c
