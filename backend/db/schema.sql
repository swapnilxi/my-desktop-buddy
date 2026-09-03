-- ==========================================================================
-- Madhav — Krishna AI Companion : Persistent Schema (Part 55)
-- SQLite. One file per user profile at ~/.hamsterdesk/krishna.db
-- ==========================================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ── users ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    display_name  TEXT,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);

-- ── memories (Part 27) ───────────────────────────────────────────────────
-- category: PROFILE | PREFERENCE | GOAL | PROJECT | WORK | LEARNING
--           | HABIT | TASK | DECISION | CONVERSATION_CONTEXT
CREATE TABLE IF NOT EXISTS memories (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL,
    category        TEXT NOT NULL,
    key             TEXT NOT NULL,
    value           TEXT NOT NULL,
    source          TEXT NOT NULL DEFAULT 'conversation',
    user_confirmed  INTEGER NOT NULL DEFAULT 0,
    sensitive       INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_memories_unique
    ON memories(user_id, category, key);
CREATE INDEX IF NOT EXISTS idx_memories_user ON memories(user_id, category);

-- ── conversations & messages ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    title       TEXT,
    mode        TEXT NOT NULL DEFAULT 'friend',
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
    id               TEXT PRIMARY KEY,
    conversation_id  TEXT NOT NULL,
    user_id          TEXT NOT NULL,
    role             TEXT NOT NULL,
    content          TEXT NOT NULL,
    intent           TEXT,
    emotion          TEXT,
    mode             TEXT,
    tools_used       TEXT,
    created_at       TEXT NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at);

-- ── gita_sources (Part 56 — provenance is mandatory) ─────────────────────
CREATE TABLE IF NOT EXISTS gita_sources (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    source_type   TEXT NOT NULL,   -- canonical_sanskrit | translation | commentary | curated_seed
    source_url    TEXT,
    edition       TEXT,
    language      TEXT,
    retrieved_at  TEXT,
    notes         TEXT
);

-- ── gita_verses (Part 5) ─────────────────────────────────────────────────
-- Canonical Sanskrit is stored SEPARATELY from translations/commentaries,
-- which live in their own tables and each carry their own source id.
CREATE TABLE IF NOT EXISTS gita_verses (
    id               TEXT PRIMARY KEY,        -- "2.47"
    chapter          INTEGER NOT NULL,
    verse            INTEGER NOT NULL,
    verse_end        INTEGER,                 -- for merged verses e.g. 1.32-33
    sanskrit         TEXT,
    transliteration  TEXT,
    themes           TEXT NOT NULL DEFAULT '[]',
    keywords         TEXT NOT NULL DEFAULT '[]',
    sanskrit_source  TEXT,
    verified         INTEGER NOT NULL DEFAULT 0,
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL,
    FOREIGN KEY (sanskrit_source) REFERENCES gita_sources(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_verse_ref ON gita_verses(chapter, verse);
CREATE INDEX IF NOT EXISTS idx_verse_chapter ON gita_verses(chapter);

CREATE TABLE IF NOT EXISTS gita_translations (
    id         TEXT PRIMARY KEY,
    verse_id   TEXT NOT NULL,
    text       TEXT NOT NULL,
    language   TEXT NOT NULL DEFAULT 'en',
    source     TEXT NOT NULL,
    verified   INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (verse_id) REFERENCES gita_verses(id) ON DELETE CASCADE,
    FOREIGN KEY (source)   REFERENCES gita_sources(id)
);
CREATE INDEX IF NOT EXISTS idx_tr_verse ON gita_translations(verse_id);

CREATE TABLE IF NOT EXISTS gita_commentaries (
    id         TEXT PRIMARY KEY,
    verse_id   TEXT NOT NULL,
    text       TEXT NOT NULL,
    author     TEXT NOT NULL,
    language   TEXT NOT NULL DEFAULT 'en',
    source     TEXT NOT NULL,
    verified   INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (verse_id) REFERENCES gita_verses(id) ON DELETE CASCADE,
    FOREIGN KEY (source)   REFERENCES gita_sources(id)
);
CREATE INDEX IF NOT EXISTS idx_comm_verse ON gita_commentaries(verse_id);

-- Practical application is an INTERPRETATION, never scripture (Parts 6, 9)
CREATE TABLE IF NOT EXISTS gita_applications (
    id        TEXT PRIMARY KEY,
    verse_id  TEXT NOT NULL,
    text      TEXT NOT NULL,
    label     TEXT NOT NULL DEFAULT 'interpretation',
    FOREIGN KEY (verse_id) REFERENCES gita_verses(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_app_verse ON gita_applications(verse_id);

-- ── daily content (Parts 9, 10, 11) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_verses (
    day        TEXT PRIMARY KEY,    -- YYYY-MM-DD
    verse_id   TEXT NOT NULL,
    thought    TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (verse_id) REFERENCES gita_verses(id)
);

CREATE TABLE IF NOT EXISTS word_of_day (
    day         TEXT PRIMARY KEY,
    word_id     TEXT NOT NULL,
    created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS daily_teachings (
    day          TEXT PRIMARY KEY,
    teaching_id  TEXT NOT NULL,
    created_at   TEXT NOT NULL
);

-- ── productivity (Phase 2 tables, created now so Phase 1 migrations settle)
CREATE TABLE IF NOT EXISTS tasks (
    id            TEXT PRIMARY KEY,
    user_id       TEXT NOT NULL,
    title         TEXT NOT NULL,
    description   TEXT,
    priority      TEXT NOT NULL DEFAULT 'medium',
    status        TEXT NOT NULL DEFAULT 'todo',
    deadline      TEXT,
    created_at    TEXT NOT NULL,
    completed_at  TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id, status);

CREATE TABLE IF NOT EXISTS goals (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    name        TEXT NOT NULL,
    reason      TEXT,
    category    TEXT,
    deadline    TEXT,
    progress    INTEGER NOT NULL DEFAULT 0,
    status      TEXT NOT NULL DEFAULT 'active',
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS habits (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    name        TEXT NOT NULL,
    emoji       TEXT,
    cadence     TEXT NOT NULL DEFAULT 'daily',
    created_at  TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS habit_logs (
    id        TEXT PRIMARY KEY,
    habit_id  TEXT NOT NULL,
    day       TEXT NOT NULL,
    done      INTEGER NOT NULL DEFAULT 1,
    note      TEXT,
    FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_habit_day ON habit_logs(habit_id, day);

CREATE TABLE IF NOT EXISTS focus_sessions (
    id            TEXT PRIMARY KEY,
    user_id       TEXT NOT NULL,
    activity      TEXT,
    planned_secs  INTEGER NOT NULL,
    actual_secs   INTEGER,
    session_type  TEXT NOT NULL DEFAULT 'focus',
    started_at    TEXT NOT NULL,
    ended_at      TEXT,
    completed     INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS journal_entries (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    title       TEXT,
    body        TEXT NOT NULL,
    mood        TEXT,
    tags        TEXT NOT NULL DEFAULT '[]',
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── settings / notifications / usage ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
    user_id     TEXT NOT NULL,
    key         TEXT NOT NULL,
    value       TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    PRIMARY KEY (user_id, key)
);

CREATE TABLE IF NOT EXISTS notifications (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    kind        TEXT NOT NULL,
    enabled     INTEGER NOT NULL DEFAULT 0,
    schedule    TEXT,
    updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS usage (
    id           TEXT PRIMARY KEY,
    user_id      TEXT,
    request_id   TEXT,
    intent       TEXT,
    mode         TEXT,
    provider     TEXT,
    model        TEXT,
    tools_used   TEXT,
    latency_ms   INTEGER,
    ok           INTEGER NOT NULL DEFAULT 1,
    error        TEXT,
    created_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_usage_created ON usage(created_at);
