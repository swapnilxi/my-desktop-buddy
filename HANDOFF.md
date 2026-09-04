# Madhav — Krishna AI Companion: Technical Handoff

Self-contained state-of-the-project summary. Written to be pasted into another
model as context for proposing the next set of features.

> **Status.** Two workstreams have landed:
>
> * **Phase 1 — Productivity Intelligence Layer (§11):** backend-complete,
>   frontend not started. Everything works over HTTP; the Today dashboard is
>   still to build. §11.6 lists exactly what remains.
> * **Voice + sessions (§12):** complete end to end, backend *and* frontend.
>   Speech in → orchestrated reply → speech out, in Hindi / Hinglish / Indian
>   English, plus a New chat button. **Seven providers** (Gemini, Sarvam,
>   Cartesia, Deepgram, Fish Audio, Apple, browser), with STT and TTS chosen
>   independently and each having its own fallback chain — all verified
>   against the live APIs with real keys.

---

## 1. What the product is

A desktop AI companion app. The user picks a "buddy" character; the flagship one
is **Madhav**, a Krishna-inspired companion (visually a 7–8 year old with a
peacock feather, golden dhoti and bansuri; mature in judgement). Two other
buddies exist and still work: a hamster (Hammy) and a panda (Bambu).

The product is **not** a chatbot with a Krishna skin. It is a Gita-inspired
personal productivity and growth companion, and the loop is:

**UNDERSTAND → DECIDE → ACT → REFLECT → GROW**

The Gita is used as a source of *practical principles that turn into actions*,
not as a quote generator. The central product test: it should feel like
"Madhav helps me live what I learn from the Gita", not "Madhav gives me Gita
quotes".

**Hard product constraint:** Madhav must never claim to *be* Lord Krishna, to
have supernatural powers, or to know the user's future. It is a devotional
companion *inspired by* Krishna's teachings.

---

## 2. Stack

| Layer | Tech |
|---|---|
| Backend | Python 3.13, FastAPI, Pydantic v2, SQLite (stdlib `sqlite3`) |
| LLM | Provider-agnostic adapters: Gemini (`google-genai`), DeepSeek (OpenAI-compatible), Ollama (local). Automatic fallback chain. |
| Frontend | Next.js 16.3 (App Router, Turbopack), React 19, TypeScript, plain CSS + CSS Modules (no Tailwind) |
| Desktop | Electron shell wrapping the Next app |
| Voice | Pluggable: **Gemini**, **Sarvam AI**, **Cartesia**, Deepgram, Fish Audio, macOS `say`, browser. STT and TTS chosen separately, each with a fallback chain. |
| Tests | pytest (backend, 293 tests). No frontend test runner yet. |

Storage lives in `~/.hamsterdesk/`: `config.json`, `todos.json` (**legacy, now
read-once at migration time**) and `krishna.db` (SQLite).

Characters are built entirely from HTML/TSX + CSS — **no canvas, no SVG
illustrations, no Three.js/WebGL, no image assets** for the character itself.
This is a deliberate constraint from the original design spec.

---

## 3. Repository layout

```
backend/
  main.py                  FastAPI app, routers, /health, lifespan
  config_manager.py        Config + API-key resolution (env / client / disk)
  context.py               Legacy persona + todo injection (hamster/panda path)
  db/
    __init__.py            Connection factory, schema bootstrap, settings helpers
    migrations.py          Idempotent ALTER-TABLE migrations for old profiles
    schema.sql             25 tables
  gita/
    chapters.py            Canonical 18-chapter / 700-verse map + ref validation
    models.py              Pydantic shapes (Verse, Translation, Commentary, ...)
    seed_data.py           33 curated verses (marked unverified)
    store.py               Seeding, lookup, stem-aware search
    importer.py            Import an authoritative edition (only path to verified)
    daily.py               Daily verse / word / teaching (deterministic per day)
    words.py               25 Sanskrit terms
    teachings.py           24 life principles
  krishna/
    persona.py             System-prompt assembly — the ONLY source of character
    modes.py               8 modes + time-of-day tone
    intent.py              Per-message classifier (deterministic, no LLM)
    motivation.py          10 contextual motivation cues
    gita_action.py         Situation → Gita concepts → modern actions (NEW)
    orchestrator.py        The chat pipeline
    events.py              Event bus, 15 events
  productivity/            THE PHASE 1 LAYER (NEW)
    tasks.py               Unified task store + todos.json migration
    goals.py               Goals, milestones, task↔goal links
    habits.py              Habits, logs, streak maths, consistency
    focus.py               Focus sessions + reflection prompts
    timetracking.py        time_entries + every "how long" aggregate
    planning.py            Plan My Day
    stats.py               Today dashboard payload + rolling stats
    review.py              Weekly review + data-derived observations
    insights.py            9 insight types with data-sufficiency gates
    reminders.py           Stored (not pushed) reminders
    brief.py               The productivity block injected into the prompt
  voice/
    providers.py           Provider registry + the fallback chain runner
    gemini_voice.py        Gemini STT/TTS, voice presets, language detection
    sarvam_voice.py        Sarvam AI — natively Indian voices, Hinglish STT
    cartesia_voice.py      Cartesia Sonic TTS + Ink-Whisper STT
    deepgram_voice.py      Deepgram Nova STT + Aura TTS
    apple_voice.py         macOS `say` — local, keyless last resort
    fish_audio_manager.py  Fish Audio per-character voice models
  memory/store.py          Memory CRUD, consent, sensitivity, per-user isolation
  tools/registry.py        23 declared tools + executor
  observability/logging.py Structured JSON logging + usage rows
  llm/                     Adapter base + gemini / deepseek / ollama + router
  routes/                  chat, todos, config, voice, gita, daily, memory,
                           krishna, productivity
  tests/                   293 tests

frontend/src/
  app/page.tsx             Single-page shell: 3 window modes, tab system
  app/globals.css          Full design-token system (honey/espresso dark theme)
  components/Buddies/      Hamster, Panda, Krishna sprites (HTML+CSS) + registry
  components/Krishna/      DailyPanel, GitaPanel, MemoryPanel, VerseCard, CSS module
  components/Chat/         ChatPanel
  components/TodoList/     TodoPanel (includes focus timer UI)
  components/Config/       ConfigPanel
  components/Shell/        WindowChrome, ConfirmDialog
  lib/api.ts               API client (legacy + Krishna sections)
  lib/useConversation.ts   Chat state, session id and the spoken turn
  lib/useFocusTimer.ts     Pomodoro/focus timer hook (client-only — see §11.6)
  lib/speech.ts, audio.ts, speechRecognition.ts, useVoiceRecorder.ts
```

---

## 4. What is BUILT and working

### 4.1 Personality engine
- `krishna/persona.py` is the single place any Krishna system prompt is built,
  so the character cannot drift between features.
- Blocks are injected **conditionally** based on the classifier. A technical
  question gets no scripture instructions at all; a Gita question gets the
  scripture-integrity rules plus the answer format; a "I keep procrastinating"
  gets the coaching flow and the productivity brief but no sermon.
- Prompt contains explicit anti-patterns: no corporate-speak, no opening every
  reply with "Radhe Radhe", no generic motivation ("You can do it!"), no
  answering practical questions with philosophy, no claiming an action
  succeeded when a tool failed.
- Voice: Hinglish that mirrors whatever the user writes; markers like "Dost…",
  "Arre…", "Chalo…" capped at one or two per reply.

### 4.2 Eight modes (`krishna/modes.py`)
`friend` (default), `wise`, `productivity`, `gita`, `meditation`, `focus`,
`playful`, `listening`. Each carries a directive, a max-sentence budget, a
`gita_appetite` (`never` / `when_relevant` / `prefer` / `primary`), and a
humour flag. Time-of-day tone (morning/day/evening/night) layers on top.

### 4.3 Message classifier (`krishna/intent.py`)
Deterministic regex classifier — no LLM call, works offline. Produces:
```json
{"intent":"daily_planning","emotion":"neutral","mode":"friend","urgency":"normal",
 "needsGita":false,"needsMemory":false,"needsTool":true,"needsWeb":false,
 "needsProductivity":true,
 "is_technical":false,"is_high_stakes":false,"safety_flags":[]}
```
~20 intents, ~10 emotions. Its two most important jobs are *suppressing* Gita
retrieval for technical and medical/legal/financial questions, and deciding
whether this turn needs the productivity brief at all.

Phase 1 added the intents `weekly_review`, `goal_setting`, `habit_tracking`
and the `needs_productivity` flag. New intents were placed **after**
`memory_read` in the ordered table so "what do you remember about my goals"
stays a memory question.

### 4.4 Gita knowledge engine
- `chapters.py` holds the canonical chapter→verse-count map (sums to exactly
  700). Any reference is validated against it, so "Gita 20.10" or "2.500" is
  rejected as invalid rather than handed to an LLM. Chapter 13 verse 35 is
  reported as an *edition variant*, not flatly invalid.
- Four separate tables keep **Sanskrit / translation / commentary / practical
  application** distinct. Each translation and commentary carries its own
  source id and `verified` flag.
- Search is stem-aware with a synonym map, so "I am so angry right now" reaches
  the anger verses and "everyone is ahead of me" reaches the comparison verses.
- Three honest outcomes for a lookup: invalid reference / valid but not in the
  knowledge base / found.

### 4.5 Daily content
Daily verse, Word of the Day (25 Sanskrit terms), Today's Teaching (24
principles). Selection is deterministic per calendar date and persisted.
Modern content is labelled `interpretation` or `inspired_by` so it can never
read as a Gita quotation.

### 4.6 Memory system
10 categories (`PROFILE`, `PREFERENCE`, `GOAL`, `PROJECT`, `WORK`, `LEARNING`,
`HABIT`, `TASK`, `DECISION`, `CONVERSATION_CONTEXT`). Nothing is stored without
consent: `propose_memory` builds a Remember / Don't-remember prompt and writes
nothing. Sensitive content (credentials, financial, government ID, health,
contact, location) is refused unless explicitly confirmed, and sensitive items
are never injected into prompts. Pause, forget-everything and JSON export all
work. Every read and write is scoped by `user_id`.

### 4.7 Tool layer — 23 tools
**Enabled (22):** `searchGita`, `getGitaVerse`, `saveMemory`, `getMemory`,
`deleteMemory`, `createTask`, `listTasks`, `completeTask`, `updateTask`,
`createGoal`, `updateGoal`, `linkTaskToGoal`, `logHabit`, `createHabit`,
`startFocus`, `endFocus`, `logTime`, `planMyDay`, `getWeeklyReview`,
`getInsights`, `createReminder`, `getDailySummary`.

**Declared but disabled (1):** `searchWeb` — fails with a clear "not built
yet", deliberately out of scope for this phase.

Every tool returns `{ok, data?, message?, error?}`. A failure is never dressed
up as success. Task tools write to the `tasks` table (they used to delegate to
`todos.json`; see §11.1).

Two messages are worth knowing about because they exist to stop the model
lying:
- `endFocus` returns *"That records time spent, not that the work is done — ask
  them how it actually went."*
- `createReminder` returns *"…it will appear on their Today screen when it is
  due — this build has no scheduler and cannot send them a notification."*

### 4.8 Event bus — 15 events
`KRISHNA_MESSAGE_START/END`, `USER_STARTED/STOPPED_SPEAKING`,
`TASK_COMPLETED/FAILED`, `FOCUS_STARTED/COMPLETED`, `GITA_RETRIEVED`,
`MEMORY_SAVED/DELETED`, `DAILY_GREETING`, `DAILY_VERSE`,
`MEDITATION_STARTED/COMPLETED`. Each has a default presentation
(`animation`, `chakra`, `voiceMode`).

### 4.9 Chat pipeline (`krishna/orchestrator.py`)
```
classify
  → retrieve user context (memory)
  → retrieve productivity context (tasks/goals/habits/focus — only if needed)
  → retrieve Gita (only if relevant)
  → Gita→Action framing (only if the situation maps)
  → assemble prompt
  → generate (optional native tool loop)
  → coordinate presentation
  → log
  → persist
```
Retrieval is **deterministic by default** — the backend fetches, rather than
hoping the model calls a tool. Native provider function calling for *action*
tools is implemented for Gemini and DeepSeek but gated behind
`KRISHNA_NATIVE_TOOLS=1` (off; unverified against live APIs). The action-tool
allowlist now includes the whole productivity set.

Response shape (Phase 1 added `productivity_used` and `gita_action`):
```json
{"response":"...","model":"...","mode":"friend","intent":"daily_planning",
 "emotion":"neutral",
 "presentation":{"animation":"TALKING","chakra":"CALM","voiceMode":"NEUTRAL","particles":false},
 "hamster_mood":"speaking",
 "gita_used":[],"gita_invalid_message":null,"tools_used":[],
 "memory_proposal":null,"memories_used":2,
 "productivity_used":true,
 "gita_action":{"id":"PROCRASTINATION","concepts":[...],"actions":[...],
                "action_label":"modern interpretation","disclaimer":"..."},
 "classification":{...},"events":[...],"safety_flags":[],"request_id":"..."}
```

### 4.10 Frontend
- `components/Krishna/DailyPanel.tsx` — Daily verse + Word of the Day + Teaching
- `components/Krishna/GitaPanel.tsx` — search, theme chips, full verse, distinct
  invalid-reference state
- `components/Krishna/VerseCard.tsx` — verified/unverified badges, per-source
  attribution, "different commentators interpret this differently" disclosure
- `components/Krishna/MemoryPanel.tsx` — **built and working but currently not
  mounted** (its tab was removed by request). Ready to drop into ConfigPanel.
- `components/TodoList/TodoPanel.tsx` — task list + focus timer UI. Still talks
  to the legacy `/todos` endpoints, which is fine: those are now DB-backed and
  the wire shape is unchanged.
- Tabs `🌅 Today` and `📖 Gita` appear only for the Krishna buddy.

- `components/Chat/ChatPanel.tsx` — transcript, mic, and the **New chat**
  button in a session bar above the messages.

**No frontend work has been done for the Phase 1 productivity layer yet** (see
§11.6). The voice and session work in §12 *is* complete on both sides.

---

## 5. API surface

```
GET    /health                      status + subsystem readiness
GET    /context                     legacy prompt preview

POST   /chat                        LEGACY flat-prompt chat (hamster/panda)
GET    /greeting                    short buddy greeting
GET    /todos  POST /todos  PATCH /todos/{id}  DELETE /todos/{id}
                                    LEGACY shape, now backed by the tasks table
GET    /config  POST /config  GET /config/reveal-keys
GET    /voice/providers             capability matrix + effective chains
GET    /voice/voices?provider=      voices for one provider (or all)
POST   /voice/transcribe?provider=  STT through the configured chain
POST   /voice/speak                 TTS chain + X-Voice-Provider header
POST   /voice/test                  audition ONE provider (never falls back)
POST   /voice/converse              audio in → transcript + reply + audio out

POST   /krishna/chat                ORCHESTRATED chat (the main entry point)
POST   /krishna/classify            expose the classifier
GET    /krishna/modes               8 modes + current time context
GET    /krishna/persona             identity + disclaimer + traits
POST   /krishna/motivation          contextual motivation cue
GET    /krishna/celebrate           presentation payload by magnitude
GET    /krishna/failure-recovery    the no-shame recovery flow
GET    /krishna/tools               tool catalog + whether native calling is on
POST   /krishna/tools/execute       run one tool (failures return 200 + ok:false)
GET    /krishna/events              recent events + event vocabulary
POST   /krishna/sessions            start a fresh conversation ("New chat")
GET    /krishna/sessions            recent sessions, newest first
GET    /krishna/sessions/{id}       that session's messages
DELETE /krishna/sessions/{id}       delete a session

POST   /gita/search    GET /gita/search
GET    /gita/verse/{chapter}/{verse}
GET    /gita/chapters  GET /gita/chapter/{n}
GET    /gita/themes    GET /gita/sources

GET    /daily          GET /daily/verse  GET /daily/word  GET /daily/teaching

GET    /memory         POST /memory      POST /memory/propose
PATCH  /memory/{id}    DELETE /memory/{id}
POST   /memory/pause   POST /memory/forget-everything   GET /memory/export
```

### 5.1 Productivity router (NEW — 37 endpoints)

```
GET    /productivity/today                    everything the Today screen needs
GET    /productivity/stats?days=7             rolling-window numbers
GET    /productivity/plan                     proposed + saved plan for a day
POST   /productivity/plan                     commit a plan
GET    /productivity/weekly-review            the week + data-derived observations
GET    /productivity/insights?days=30&types=  patterns, with sufficiency gates

GET    /productivity/tasks       POST /productivity/tasks
GET    /productivity/tasks/{id}  PATCH /productivity/tasks/{id}
DELETE /productivity/tasks/{id}

GET    /productivity/goals       POST /productivity/goals
GET    /productivity/goals/{id}  PATCH /productivity/goals/{id}
DELETE /productivity/goals/{id}
POST   /productivity/goals/{id}/milestones
PATCH  /productivity/goals/{id}/milestones/{mid}
DELETE /productivity/goals/{id}/milestones/{mid}
POST   /productivity/goals/{id}/tasks         link an existing task to the goal

GET    /productivity/habits      POST /productivity/habits
PATCH  /productivity/habits/{id} DELETE /productivity/habits/{id}
POST   /productivity/habits/{id}/log

GET    /productivity/focus                    active session + recent + modes
POST   /productivity/focus/start
POST   /productivity/focus/end                returns a reflection PROMPT
POST   /productivity/focus/{id}/reflect

GET    /productivity/time?scope=day|week
POST   /productivity/time/start  POST /productivity/time/stop
POST   /productivity/time/log                 record time after the fact

GET    /productivity/reminders   POST /productivity/reminders
DELETE /productivity/reminders/{id}

GET    /productivity/situations                the Gita→Action map + disclaimer
```

Auth/context is passed via headers: `X-User-Id`, `X-Gemini-Key`,
`X-DeepSeek-Key`, `X-LLM-Provider`, `X-Gemini-Model`, `X-DeepSeek-Model`,
`X-Buddy-Type`, `X-Buddy-Name`. API keys live in browser LocalStorage and are
never written to server disk.

**Note for the frontend work:** `/todos` now reads `X-User-Id` too (defaulting
to `local-user`). The browser client does **not** currently send that header on
legacy calls, so `/todos` and `/krishna/tools/execute` resolve to *different
users* until `getClientAuthHeaders()` is updated. That is item 1 in §11.6.

---

## 6. Database — 25 tables

`users`, `memories`, `conversations`, `messages`, `gita_sources`,
`gita_verses`, `gita_translations`, `gita_commentaries`, `gita_applications`,
`daily_verses`, `word_of_day`, `daily_teachings`, **`tasks`**, **`goals`**,
**`goal_milestones`**, **`habits`**, **`habit_logs`**, **`focus_sessions`**,
**`time_entries`**, **`daily_plans`**, **`reminders`**, `journal_entries`,
`settings`, `notifications`, `usage`.

Bold = live as of Phase 1. `journal_entries` and `notifications` are still
created-but-unused.

### 6.1 Migrations

`schema.sql` only ever runs `CREATE TABLE IF NOT EXISTS`, so a profile created
by an earlier build would keep its old columns forever. `db/migrations.py`
fixes that and runs **before** the schema script in `init_db` — necessary
because some indexes in `schema.sql` are defined over columns the migration
adds.

It is idempotent and additive: columns are added, never dropped. Renames only
fire when the old name is still present:

| table | old → new |
|---|---|
| `tasks` | `deadline` → `due_date` |
| `goals` | `name` → `title`, `reason` → `description`, `deadline` → `target_date` |
| `habits` | `cadence` → `frequency` |

It also backfills `tasks.updated_at`, uppercases legacy `status`/`priority`
values, and assigns `tasks.seq` to any row missing one.

---

## 7. Non-negotiable conventions for new code

1. **Never fabricate scripture.** No verse, chapter number, Sanskrit line,
   translation or attribution may be generated. Only verses retrieved from the
   DB may be quoted. Invalid references must be reported as invalid.
2. **Keep the four layers separate:** scripture ≠ translation ≠ commentary ≠
   modern interpretation. Anything modern must be visibly labelled.
3. **Provenance is mandatory.** Every verse/translation/commentary row carries a
   source id and a `verified` flag, and the flag must reach the UI.
4. **No false divinity claims**, ever, in prompt or copy.
5. **Don't over-religionize.** Technical, medical, legal and financial questions
   get no verse. Match the situation.
6. **Consent before memory.** Propose, then store. Sensitive content needs
   explicit confirmation and is never injected into prompts.
7. **Tools never lie.** `ok:false` when the action did not happen. An unbuilt
   feature says so.
8. **All persona text goes through `krishna/persona.py`.** Do not write character
   prompt text anywhere else.
9. **Every feature needs loading / ready / empty / error states.**
10. **Don't break the hamster and panda buddies** — they use the legacy `/chat`
    and `/todos` paths and must keep working.
11. Characters stay HTML/TSX + CSS. No canvas/SVG-illustration/WebGL character art.
12. `user_id` scoping on every read and write, in memory *and* productivity.
13. **Never fabricate analytics.** An insight is a reading of data that exists,
    or it is not offered. "I don't have enough data yet" is a correct answer.
14. **Never shame.** No guilt, no "you said you would", no manipulative streak
    language. A missed day is a missed day; point forward.

---

## 8. Verification commands

```bash
# Backend — 293 tests, ~12s (some hit no network; none call a paid API)
cd backend && python3 -m venv .venv
.venv/bin/pip install -r requirements.txt pytest httpx
.venv/bin/python -m pytest tests/ -q

# Frontend
cd frontend && ./node_modules/.bin/tsc --noEmit
./node_modules/.bin/eslint src/components/Krishna src/lib/api.ts
npm run build
```

Test coverage: `test_gita_engine.py` 52 · `test_personality.py` 58 ·
`test_api.py` 42 · `test_voice.py` 65 · `test_memory.py` 31 ·
`test_tools.py` 29 · `test_daily.py` 16.

Frontend lint has a **pre-existing** baseline of 22 errors / 14 warnings across
`src` (mostly `no-explicit-any` in `speechRecognition.ts` and
`set-state-in-effect` in the hydration reads). Both workstreams left that
number unchanged — check against it rather than expecting zero.

Personality tests assert on the **system prompt and routing decisions**, not on
LLM output — model text isn't deterministic, but the rules that shape it are.

`test_tools.py` was amended in Phase 1: `test_unbuilt_tools_fail_honestly` now
parametrises over `searchWeb` alone, and a new
`test_phase_one_tools_are_no_longer_stubs` asserts that `createGoal`,
`updateGoal`, `logHabit` and `createReminder` fail on *missing input* rather
than on "not built yet". No test was deleted or weakened.

---

## 9. Known limitations / honest gaps

1. **Only 33 of 700 verses exist, all `verified: false`.** The Sanskrit was
   transcribed offline, not from a primary edition. The flag is exposed in the
   API, badged in the UI, and the prompt tells Madhav not to present them as
   settled. The other 667 verses return an honest "not in this knowledge base
   yet". Fix by importing an authoritative edition:
   ```bash
   cd backend && .venv/bin/python -m gita.importer --file verses.json \
     --source-name "IIT Kanpur Gita Supersite" \
     --source-url "https://www.gitasupersite.iitk.ac.in/"
   ```
2. **Zero commentaries ship.** Deliberate — commentary is never synthesised.
   The importer is the only way in.
3. **`presentation` payload is unconsumed.** `/krishna/chat` returns
   animation/chakra/voiceMode/particles, but the sprite still animates off the
   legacy `/chat` path. This is the single shortest path to making Madhav feel
   alive.
4. **Native LLM function calling unverified** against live Gemini/DeepSeek
   (no API keys available at build time). Off by default.
5. **Gemini TTS free-tier quota is small.** Two calls in quick succession were
   enough to draw a 429 during development. The chain falls through to Fish
   Audio / Deepgram / Apple, a 24-entry cache keeps repeated lines from
   spending quota twice, and `/voice/converse` returns the reply without audio
   rather than failing the turn. `gemini-2.5-pro-preview-tts` 429s immediately
   on this key — flash is the working model.
6. **MemoryPanel is built but unmounted.**
7. **No frontend test runner.**
8. **Single local user.** `X-User-Id` plumbing and per-user scoping exist, but
   there is no auth.
9. **No scheduler.** `createReminder` stores; nothing fires. The tool and the
   `/productivity/reminders` response both say so out loud.
10. **The focus timer in the UI is still client-only.** Sessions started from
    `TodoPanel` are not recorded in `focus_sessions`, so almost all the
    analytics have no data until §11.6 item 3 is done.
11. **Voice is turn-based, not streaming.** The user taps to talk, taps to
    send, and waits for one response. There is no barge-in, no partial
    transcript and no Live API session. §12.5 covers what that would take.

---

## 10. What is NOT built yet

**Wellbeing:** guided meditation, breathing tool with chakra animation,
emotional check-in, private journal, morning greeting, evening reflection,
night mode as an actual experience (the tone exists; the flow doesn't).

**Notifications:** opt-in scheduling, frequency controls. `notifications` and
`reminders` tables exist; no scheduler (APScheduler was planned).

**Voice:** interruption/barge-in, LISTENING/THINKING/SPEAKING states driving the
sprite, wake word.

**Learning:** Explain / Quiz Me / Hint / Simplify / Test Me flows, study
sessions.

**Decision support:** the "Help Me Decide" A-vs-B flow (the motivation cue and
the `DECISION` situation exist; the structured flow doesn't).

**Extensions:** browser extension, webpage context, web search, offline caching,
idle CPU/GPU reduction, quick-action launcher bar.

---

## 11. Phase 1 — Productivity Intelligence Layer

### 11.1 The two task systems are now one

There used to be `todos.json` (live, used by the UI and the tools) and an
unused `tasks` table. They are unified onto the table.

The mechanism that made this non-breaking is **`tasks.seq`**: a per-user
integer id, which is exactly what the JSON store handed out. `legacy_shape()`
projects a task row back into `{id, text, completed, created_at,
completed_at}`, so the `/todos` endpoints, `TodoPanel` and the hamster/panda
paths are byte-for-byte unchanged on the wire.

`migrate_todos_json()` imports the file **once**. The guard is a settings row
under a global scope (`__global__` / `todos_json_migrated_at`), not a per-user
one — the JSON store was never user-scoped, so a per-user guard would duplicate
everyone's tasks for a second local user. `ensure_migrated(user_id)` is a cheap
call placed in front of every task read; it swallows failures so a corrupt
legacy file can never break a live request. **The JSON file is left on disk
untouched** — it is a backup now, not a source of truth.

A task supports: `id`, `user_id`, `seq`, `title`, `description`, `status`,
`priority`, `due_date`, `estimated_minutes`, `actual_minutes`, `tags`,
`parent_task_id`, `goal_id`, `created_at`, `updated_at`, `completed_at`.
Statuses `TODO | IN_PROGRESS | COMPLETED | CANCELLED`; priorities
`LOW | MEDIUM | HIGH | CRITICAL`. Both accept the aliases people actually type
(`done`, `urgent`, `doing`…) and reject anything else rather than silently
defaulting. One level of subtasks is allowed; a subtask cannot have subtasks.

### 11.2 The subsystems

**Goals** (`productivity/goals.py`) — title, description, category,
target_date, progress, status (`ACTIVE | COMPLETED | PAUSED | ARCHIVED`),
milestones. Progress is explicit *or* derived from milestones, and derived
progress is recomputed on every milestone change so the number can't drift.
Deleting a goal detaches its tasks rather than deleting them.

**Habits** (`productivity/habits.py`) — daily/weekly frequency, logging,
current streak, best streak, completion percentage, missed days. Two
deliberate correctness choices: today not being logged yet does **not** break
a streak (it hasn't been missed until the day is over), and `expected` counts
from the habit's creation date, so a habit started on Thursday is not reported
as having missed Monday. Weekly habits streak on ISO weeks. The only copy this
module produces is the neutral restart line.

**Focus** (`productivity/focus.py`) — 25/45/60/custom, modes `DEEP_WORK |
STUDY | WRITING | CODING | ADMIN | CREATIVE | OTHER`, linked task and goal,
and an `intended` field. `completed` (the timer ran its length) is kept
strictly separate from `finished_intent` (did you finish what you sat down to
do), which stays `None` until the user answers. Ending a session returns a
`reflection_prompt` rather than congratulations. Elapsed time is capped at
planned + 5 min so a laptop that went to sleep isn't recorded as heroic focus.

**Time tracking** (`productivity/timetracking.py`) — one `time_entries` table
that both focus sessions and manual start/stop/log write into, so no two
aggregates can disagree. Reports today/week totals, by category, by task, by
goal, planned-vs-actual, and — deliberately — `unallocated_minutes`. Manual
timers cap at 12 hours.

**Plan My Day** (`productivity/planning.py`) — reads open tasks, priorities,
deadlines, goals, habits and the time actually left in the day. Schedules at
most **75%** of available time (`SCHEDULE_FRACTION`), inserts a break after
every focus block, batches ≤20-minute items into one "quick tasks" block, and
returns overflow as `unscheduled` instead of cramming it in. When the user
didn't say how much time they have, it says what it assumed. Tasks without an
estimate get a priority-based default that is reported as an assumption, never
as something the user said. Ends with a `suggestion` — the "want to give it the
first 45 minutes?" ask that leads into `startFocus`.

**Weekly review** (`productivity/review.py`) — Monday–Sunday. Tasks planned /
completed / percentage, focus hours, habit consistency, goal progress, most
productive period, strongest day, unfinished important tasks. Every entry in
`observations` carries the `evidence` it was computed from. An empty week
returns a `NO_DATA` observation; a thin week returns `THIN_DATA`. There is no
code path that produces a behavioural claim without the numbers behind it.

**Insights** (`productivity/insights.py`) — `BEST_TIME_OF_DAY`,
`TASK_ESTIMATION`, `COMPLETION_PATTERN`, `FOCUS_PATTERN`, `HABIT_PATTERN`,
`GOAL_PROGRESS`, `OVERLOAD`, `CONSISTENCY`, `DISTRACTION_PATTERN`. Each
declares its evidence threshold in `THRESHOLDS`. Insights that can't be
supported are still returned, in `insufficient`, with what they're waiting for
— so the UI can say "give me a few more days" instead of showing an empty
panel.

### 11.3 Gita → Action framework

`krishna/gita_action.py` is a **static** map from a situation
(`PROCRASTINATION`, `OVERWHELM`, `COMPARISON`, `FAILURE`, `DISCIPLINE`,
`DISTRACTION`, `DECISION`, `BURNOUT`, `MOTIVATION`) to Gita *concepts*, search
themes, and practical actions.

Three properties are load-bearing:
- **Nothing in it is scripture** — no Sanskrit, no verse text, no attribution.
  Every action set is labelled `modern interpretation` and carries a
  disclaimer, and the label travels to the prompt, the API and the UI.
- **Verses are never generated from it.** The `themes` are search keys handed
  to the verified retriever; if the knowledge base has nothing, the answer
  simply carries no verse.
- **Actions map to real tools** (`tool_hint`), so guidance can end in
  `startFocus` rather than an aphorism.

`situation_for()` returns `None` for most messages, which is the point — most
messages are not one of these, and forcing a mapping is how a companion turns
into a preacher.

### 11.4 Coaching integration

`krishna/persona.py` gained three conditional blocks:

- **`COACHING_FLOW`** — understand → name the practical problem → ONE insight →
  ONE concrete next action → offer to do it through a tool. Injected for
  procrastination / task / planning / goal / habit / timer / review / failure /
  motivation intents. It explicitly says a 25-minute session beats philosophy
  about duty.
- **`PRODUCTIVITY_HONESTY`** — the numbers in the prompt are the only ones that
  exist; never invent a task, streak, focus time, deadline or trend; never
  claim a tool ran when it didn't.
- **`NO_SHAME_RULE`** — injected for habit / failure / procrastination turns.

`productivity/brief.py` builds the block those rules govern: open tasks with
priority and due date, active goals with progress, habit streaks, any running
focus session, today's focus minutes, and (only when the intent warrants it)
the saved plan and the data-derived insights. It returns `None` when the user
has nothing recorded, so there is no empty scaffolding to hallucinate into. It
always ends with the line telling the model these are the only facts it has.

### 11.5 What a user can do end to end today (over HTTP)

Create and manage tasks with priority/deadline/estimate/tags/subtasks · attach
them to goals with milestones · track habits and see streaks · start a focus
session against a task, end it, and get a reflection question · record time and
see it by category and by goal · ask for a realistic day plan with buffer ·
read a Today payload that includes the daily Gita · get a weekly review with
data-derived observations · get insights that admit when they don't know.

### 11.6 What Phase 1 still needs (the remaining work)

Backend is done and green; the following are outstanding.

1. ~~**`X-User-Id` on legacy calls.**~~ **Done** — shipped with the voice work;
   `getClientAuthHeaders()` now attaches it to every request.
2. **Productivity API client** — types and functions in `lib/api.ts` for the 37
   endpoints in §5.1, following the existing `krishnaRequest` pattern.
3. **Wire `useFocusTimer` to the backend.** Call `/productivity/focus/start` on
   start and `/productivity/focus/end` on finish, and surface the returned
   `reflection_prompt`. Until this lands, `BEST_TIME_OF_DAY`, `FOCUS_PATTERN`
   and `DISTRACTION_PATTERN` have no data to read.
4. **The Today dashboard.** Hierarchy specified as: Madhav greeting → today's
   priority → Start Focus → tasks → habits/goals → daily Gita → progress. It
   should feel peaceful and personal, not like enterprise project management —
   not a wall of cards. Reuse the existing design tokens and
   `krishna.panels.module.css`. Suggested approach: make the Krishna `🌅 Today`
   tab render the new panel and embed the existing `DailyPanel` as its
   Gita section behind an `embedded` prop (it already fetches `/daily`), rather
   than duplicating that content. Must work in both `compact` and `fullscreen`
   window modes.
5. **Backend test file for the new layer.** `tests/test_productivity.py` does
   not exist yet. It should cover: the todos.json migration (including the
   run-once guard and a corrupt file), task CRUD and subtasks, goals and
   milestone-derived progress, habits/logs/streaks, focus sessions and
   reflection, time tracking aggregates, daily planning (buffer is respected,
   overflow is reported), the weekly review, user isolation across every
   subsystem, invalid tool execution, and insufficient-data analytics.
   The existing 228 tests already pass unchanged.
6. **Frontend verification** — `tsc --noEmit`, `eslint`, `npm run build` have
   not been run against any Phase 1 change, because no frontend change has been
   made yet.

Do not add a second state-management architecture for this. Do not redesign
unrelated parts of the app. Keep hamster and panda working.

---

## 12. Voice and sessions

Complete on both sides and verified against the live Gemini API with a real
key. This is the path a spoken turn takes:

```
mic → MediaRecorder → POST /voice/converse (multipart)
   → Gemini STT (Hinglish-aware prompt)
   → krishna.orchestrator.respond()   ← the full RAG pipeline
   → Gemini TTS (accent + language directed)
   → one JSON response: transcript + reply + metadata + base64 WAV
   → browser plays it straight from base64
```

### 12.1 Why one endpoint

Voice used to be three sequential round trips — transcribe, chat, speak — and
it went through the **legacy flat-prompt `/chat`**, so the mic got none of the
orchestrator: no modes, no Gita retrieval, no memory, no productivity context.
`/voice/converse` collapses the round trips and routes voice through the same
`respond()` the Chat tab uses, so speaking to Madhav and typing to him now get
identical intelligence.

Conversation history is loaded **server-side** from `conversation_id`, because
a multipart audio upload is a bad place to carry a transcript.

### 12.2 Seven providers, fully configurable

Every provider is declared once in `voice/providers.py` with what it can do
and what it needs. Both `/voice/speak` and `/voice/converse` go through the
same two functions, so **STT and TTS are chosen independently** — "Sarvam ears,
Cartesia voice" is a real configuration — and each has its own ordered
fallback list. Adding a provider means adding a registry entry, not editing an
`if` ladder in a route.

| Provider | TTS | STT | Indian voices | Notes (measured, not assumed) |
|---|:-:|:-:|---|---|
| **Gemini** | ✓ | ✓ | *directed* | Transcribes Hinglish accurately in Roman script. Free-tier TTS 429s fast. |
| **Sarvam AI** | ✓ | ✓ | **native** | Best Hindi/Hinglish fidelity in both directions. TTS caps at 2500 chars. |
| **Cartesia** | ✓ | ✓ | **native** | Real Hindi TTS voices. Its STT *translates* Hinglish to English — see below. |
| **Deepgram** | ✓ | ✓ | none | English only. Nova dropped most Hindi words from a Hinglish clip. |
| **Fish Audio** | ✓ | — | none | Per-character cloned voices; needs `FISH_AUDIO_ID_<CHARACTER>`. |
| **Apple** (`say`) | ✓ | — | **native** | Local, keyless. This Mac has Rishi/Aman/Tara (en-IN). Last in the chain on purpose. |
| **Browser** | ✓ | ✓ | none | Client-side; the backend reports it and never handles it. |

The provider `notes` shown in Config are **measured behaviour**, from running
the same Hinglish clip through every STT provider:

```
gemini    → "Ari dost chalo aaj 25 minute focus karte hain presentation pehle"
sarvam    → "अरे दोस्त, चलो आज 25 मिनट फोकस करते हैं प्रेजेंटेशन पहले।"
cartesia  → "Alright friends, let's focus on the presentation first."   ← translated!
deepgram  → "Minute focus presentation"                                  ← dropped Hindi
```

That is why Cartesia is recommended for speaking but not for Hinglish
listening, and why Deepgram is labelled English-only. Those notes are in the
picker so the choice is informed rather than trial-and-error.

**Config keys** (`~/.hamsterdesk/config.json` → `voice`):
`tts_provider`, `stt_provider`, `tts_fallback[]`, `stt_fallback[]`, plus
per-provider settings (`gemini_voice`, `sarvam_speaker`, `cartesia_voice_id`,
`tts_voice`, `apple_voice`, and the model ids), `voice_language`,
`voice_autoplay`. The old `mode` key is promoted to `tts_provider` by a
validator and kept in sync — dropping it would have silently reset an existing
user's chosen provider — and it is still serialized so the existing frontend
keeps working.

**Config UI:** separate SPEAKING and LISTENING grids showing every provider,
whether it is usable (and if not, why), 🇮🇳 for native Indian voices vs 🇮🇳* for
accent-directed, a voice picker that writes whichever field that provider uses,
a **Test this voice** button, and the effective fallback chains rendered as
`gemini → sarvam → cartesia → …` so a changed voice has a visible explanation.

### 12.3 Hindi / Hinglish / Indian English

Two different mechanisms, and it matters which is which:

* **Sarvam, Cartesia and macOS `say` have genuinely Indian voices.** Selecting
  one is selecting an Indian voice.
* **Gemini's prebuilt voices are language-agnostic** — there is no
  `hi-IN-Neerja` to select. An Indian delivery comes from
  `SpeechConfig.language_code` plus a per-preset style instruction asking for a
  natural Indian accent. This is stated in `/voice/providers`, in
  `/voice/voices`, and in the Config panel, so "Indian voice" is never
  presented in the UI as a claim about the underlying model.

`detect_language()` picks the code per reply: Devanagari → `hi-IN`; romanised
Hindi markers (`hai`, `kya`, `chalo`, `dost`, `thoda`…) → `hi-IN`; otherwise
`en-IN`. Plain English is tagged `en-IN` deliberately — Madhav's English should
sound Indian, not American. Config can pin the language instead of detecting.

STT is Hinglish-aware too: a generic "transcribe verbatim" tends to flatten
mixed speech into one language, so the Gemini prompt asks for Hindi words in
Roman script the way Indians actually type them, switching to Devanagari only
for pure Hindi.

Verified end to end with a real combination — Sarvam ears, Cartesia voice:
a Hinglish clip transcribed to Devanagari, Madhav replied in Devanagari Hindi
(mirroring the user's script), and Cartesia's Hindi voice spoke it.

### 12.4 Three Gemini facts established against the live API

Load-bearing, and covered by tests in `tests/test_voice.py`.

1. **The TTS model returns raw PCM**, `audio/L16;codec=pcm;rate=24000` — not a
   playable container. `pcm_to_wav()` adds the RIFF header; the sample rate is
   parsed out of the mime type rather than assumed.
2. **Text alone is not a valid TTS request.** Bare Devanagari returned HTTP
   400: *"Model tried to generate text, but it should only be used for TTS."*
   Every request is wrapped in an explicit "read the transcript below aloud,
   do not answer it" instruction — which is also where the accent direction
   lives.
3. **The free tier rate-limits hard.** Two calls in a row drew a 429.
   `VoiceQuotaError` is separate from other failures so the chain falls
   through, and a 24-entry LRU cache stops a repeated line spending quota
   twice. `gemini-2.5-pro-preview-tts` 429s immediately;
   `gemini-2.5-flash-preview-tts` is the working model.

### 12.5 Failure behaviour

The rule: **a voice failure costs the voice, never the answer.**

* A provider that cannot work — no key, wrong capability, not on this OS — is
  **skipped, not attempted**, and the reason is recorded.
* Every failure lands in `attempts`, returned in `X-Voice-Meta` on `/speak` and
  in `voice_meta` on `/converse`, so a fallback can be explained rather than
  silently sounding different.
* `/voice/converse` returns the transcript and reply with `audio: null` and
  `voice_error` set. The frontend shows a calm amber notice ("Reply is above —
  couldn't speak it: …"), distinct from the red error styling, and falls back
  to browser speech synthesis.
* On STT, "heard nothing" is treated as *try the next set of ears*, and is
  reported as a 422 the user can act on rather than a 502 they cannot.
* `/voice/test` deliberately does **not** fall back — auditioning is for
  finding out whether *that* provider works.

A latent bug was fixed in passing: `_apple_tts_sync` used `subprocess`, but the
import sat inside the *async wrapper*, so the sync function — running in a
worker thread — had no binding for it and every Apple-TTS call would have
raised `NameError`. Apple TTS is now verified working.

### 12.6 Sessions / New chat

Turns are persisted against a `conversations` row. `useConversation` owns the
session id, persists it to `localStorage`, and passes it on every turn;
`/krishna/chat` loads history server-side when a `conversation_id` is given but
no history is, so a client no longer has to re-send the whole transcript.

**New chat** (`POST /krishna/sessions`) starts a clean slate — it does **not**
delete the previous conversation, which stays in `GET /krishna/sessions`. The
button appears in two places, because pet mode has no tab bar:

* the session bar above the chat transcript (compact + fullscreen)
* the floating toolbar (pet mode)

If the backend is unreachable the screen still clears and the id is dropped, so
the button never feels broken offline. Hamster and panda skip session creation
entirely — they use the stateless legacy `/chat`, so there is no server-side
session to make.

`load_history()` is scoped by `user_id` *and* conversation id, so a guessed
conversation id cannot read another user's messages. Tested.

### 12.7 Config

`~/.hamsterdesk/config.json` was switched to `tts_provider: "gemini"` /
`stt_provider: "gemini"` (backup at `config.json.bak`). Everything in §12.2 is
settable from Config → Voice; nothing about provider choice is hard-coded in a
route.

`VoiceConfig` fields: `tts_provider`, `stt_provider`, `tts_fallback[]`,
`stt_fallback[]`, `gemini_voice`, `gemini_tts_model`, `sarvam_speaker`,
`sarvam_tts_model`, `sarvam_stt_model`, `cartesia_voice_id`,
`cartesia_tts_model`, `cartesia_stt_model`, `deepgram_model`, `tts_voice`,
`apple_voice`, `fish_audio_model`, `voice_language`, `voice_autoplay` — plus
`mode`, the legacy alias kept in sync with `tts_provider`.

API keys for Cartesia and Sarvam are in Config → API Keys and travel as
`X-Cartesia-Key` / `X-Sarvam-Key`, so like the others they live in browser
LocalStorage and never touch server disk.

### 12.8 What voice does NOT do yet

* **No streaming / barge-in.** Turn-based only: tap to talk, tap to send, wait.
  Real-time interruption needs the Gemini **Live API**
  (`gemini-live-2.5-flash-preview`), which is a WebSocket session rather than
  request/response — a different transport for the whole voice path, not a
  parameter change.
* **No partial transcripts** while speaking.
* **The `presentation` payload is still unconsumed** — `/voice/converse`
  returns `animation` / `chakra` / `voiceMode` per turn, and the sprite still
  animates off the legacy mood string. Wiring it is now a small job and the
  shortest path to making Madhav feel alive while speaking.
* **Audio is base64 in JSON**, which inflates it ~33%. Fine on localhost; if
  this ever goes over a network, stream the audio separately.
