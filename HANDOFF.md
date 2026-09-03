# Madhav — Krishna AI Companion: Technical Handoff

Self-contained state-of-the-project summary. Written to be pasted into another
model as context for proposing the next set of features.

---

## 1. What the product is

A desktop AI companion app. The user picks a "buddy" character; the flagship one
is **Madhav**, a Krishna-inspired companion (visually a 7–8 year old with a
peacock feather, golden dhoti and bansuri; mature in judgement). Two other
buddies exist and still work: a hamster (Hammy) and a panda (Bambu).

The goal is a companion that combines friendship, Bhagavad Gita wisdom,
productivity help, and daily presence — explicitly *not* "ChatGPT with a Krishna
skin".

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
| Voice | Browser SpeechRecognition, Deepgram STT/TTS, Fish Audio TTS, macOS `say` |
| Tests | pytest (backend, 228 tests). No frontend test runner yet. |

Storage lives in `~/.hamsterdesk/`: `config.json`, `todos.json`, and
`krishna.db` (SQLite).

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
    __init__.py            Connection factory, schema bootstrap, helpers
    schema.sql             18 tables
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
    orchestrator.py        The chat pipeline
    events.py              Event bus, 15 events
  memory/store.py          Memory CRUD, consent, sensitivity, per-user isolation
  tools/registry.py        16 declared tools + executor
  observability/logging.py Structured JSON logging + usage rows
  llm/                     Adapter base + gemini / deepseek / ollama + router
  routes/                  chat, todos, config, voice, gita, daily, memory, krishna
  tests/                   228 tests

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
  lib/useConversation.ts   Chat state owned by the page
  lib/useFocusTimer.ts     Pomodoro/focus timer hook
  lib/speech.ts, audio.ts, speechRecognition.ts, useVoiceRecorder.ts
```

---

## 4. What is BUILT and working

### 4.1 Personality engine
- `krishna/persona.py` is the single place any Krishna system prompt is built,
  so the character cannot drift between features.
- Blocks are injected **conditionally** based on the classifier. A technical
  question gets no scripture instructions at all; a Gita question gets the
  scripture-integrity rules plus the answer format.
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
{"intent":"motivation","emotion":"frustrated","mode":"friend","urgency":"normal",
 "needsGita":true,"needsMemory":false,"needsTool":false,"needsWeb":false,
 "is_technical":false,"is_high_stakes":false,"safety_flags":[]}
```
~17 intents, ~10 emotions. Its most important job is *suppressing* Gita
retrieval for technical and medical/legal/financial questions.

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
work. Every read and write is scoped by `user_id` — no function can read across
users.

### 4.7 Tool layer — 16 tools
**Enabled:** `searchGita`, `getGitaVerse`, `saveMemory`, `getMemory`,
`deleteMemory`, `createTask`, `listTasks`, `completeTask`, `startFocus`,
`endFocus`, `getDailySummary`.
**Declared but disabled** (fail with a clear "not built yet"):
`createGoal`, `updateGoal`, `logHabit`, `createReminder`, `searchWeb`.

Every tool returns `{ok, data?, message?, error?}`. A failure is never dressed
up as success. Task tools delegate to the **existing** `todos.json` store
rather than creating a second task system.

### 4.8 Event bus — 15 events
`KRISHNA_MESSAGE_START/END`, `USER_STARTED/STOPPED_SPEAKING`,
`TASK_COMPLETED/FAILED`, `FOCUS_STARTED/COMPLETED`, `GITA_RETRIEVED`,
`MEMORY_SAVED/DELETED`, `DAILY_GREETING`, `DAILY_VERSE`,
`MEDITATION_STARTED/COMPLETED`. Each has a default presentation
(`animation`, `chakra`, `voiceMode`).

### 4.9 Chat pipeline (`krishna/orchestrator.py`)
```
classify → retrieve (Gita + memory) → assemble prompt → generate → coordinate → log → persist
```
Retrieval is **deterministic by default** — the backend fetches, rather than
hoping the model calls a tool. Native provider function calling for *action*
tools is implemented for Gemini and DeepSeek but gated behind
`KRISHNA_NATIVE_TOOLS=1` (off; unverified against live APIs).

Response shape:
```json
{"response":"...","model":"...","mode":"friend","intent":"celebration",
 "emotion":"celebrating",
 "presentation":{"animation":"HAPPY","chakra":"ACCELERATE","voiceMode":"HAPPY","particles":true},
 "hamster_mood":"happy",
 "gita_used":[{"reference":"Bhagavad Gita 2.47","verified":false,"source_name":"..."}],
 "gita_invalid_message":null,"tools_used":[],"memory_proposal":null,
 "memories_used":2,"classification":{...},"events":[...],"safety_flags":[],
 "request_id":"..."}
```

### 4.10 Frontend
- `components/Krishna/DailyPanel.tsx` — Daily verse + Word of the Day + Teaching
- `components/Krishna/GitaPanel.tsx` — search, theme chips, full verse, distinct
  invalid-reference state
- `components/Krishna/VerseCard.tsx` — verified/unverified badges, per-source
  attribution, "different commentators interpret this differently" disclosure
- `components/Krishna/MemoryPanel.tsx` — **built and working but currently not
  mounted** (its tab was removed by request). Ready to drop into ConfigPanel.
- Tabs `🌅 Today` and `📖 Gita` appear only for the Krishna buddy.

---

## 5. API surface

```
GET    /health                      status + subsystem readiness
GET    /context                     legacy prompt preview

POST   /chat                        LEGACY flat-prompt chat (hamster/panda)
GET    /greeting                    short buddy greeting
GET    /todos  POST /todos  PATCH /todos/{id}  DELETE /todos/{id}
GET    /config  POST /config  GET /config/reveal-keys
POST   /voice/transcribe            STT
                                    (voice router also has TTS endpoints)

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

POST   /gita/search    GET /gita/search
GET    /gita/verse/{chapter}/{verse}
GET    /gita/chapters  GET /gita/chapter/{n}
GET    /gita/themes    GET /gita/sources

GET    /daily          GET /daily/verse  GET /daily/word  GET /daily/teaching

GET    /memory         POST /memory      POST /memory/propose
PATCH  /memory/{id}    DELETE /memory/{id}
POST   /memory/pause   POST /memory/forget-everything   GET /memory/export
```

Auth/context is passed via headers: `X-User-Id`, `X-Gemini-Key`,
`X-DeepSeek-Key`, `X-LLM-Provider`, `X-Gemini-Model`, `X-DeepSeek-Model`,
`X-Buddy-Type`, `X-Buddy-Name`. API keys live in browser LocalStorage and are
never written to server disk.

---

## 6. Database — 18 tables

`users`, `memories`, `conversations`, `messages`, `gita_sources`,
`gita_verses`, `gita_translations`, `gita_commentaries`, `gita_applications`,
`daily_verses`, `word_of_day`, `daily_teachings`, `tasks`, `goals`, `habits`,
`habit_logs`, `focus_sessions`, `journal_entries`, `settings`,
`notifications`, `usage`.

`tasks`, `goals`, `habits`, `habit_logs`, `journal_entries` and `notifications`
are **created but not yet used** — they exist so later phases don't need a
migration. Note tasks currently live in `todos.json`, not the `tasks` table;
unifying those is a Phase 2 decision.

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
    path and must keep working.
11. Characters stay HTML/TSX + CSS. No canvas/SVG-illustration/WebGL character art.
12. `user_id` scoping on every memory read and write.

---

## 8. Verification commands

```bash
# Backend — 228 tests, ~2s
cd backend && python3 -m venv .venv
.venv/bin/pip install -r requirements.txt pytest httpx
.venv/bin/python -m pytest tests/ -q

# Frontend
cd frontend && ./node_modules/.bin/tsc --noEmit
./node_modules/.bin/eslint src/components/Krishna src/lib/api.ts
npm run build
```

Test coverage: `test_gita_engine.py` 52 · `test_personality.py` 58 ·
`test_api.py` 42 · `test_memory.py` 31 · `test_tools.py` 29 · `test_daily.py` 16.

Personality tests assert on the **system prompt and routing decisions**, not on
LLM output — model text isn't deterministic, but the rules that shape it are.

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
5. **Voice and the floating pet widget still use legacy `/chat`**, so they get
   the flat persona rather than the orchestrated one — no modes, no Gita
   retrieval, no memory.
6. **MemoryPanel is built but unmounted.** Its tab was removed. Memory controls
   (view/edit/delete/pause/forget) therefore have no UI right now, though the
   whole backend and API work.
7. **No frontend test runner.**
8. **Single local user.** `X-User-Id` plumbing and per-user scoping exist, but
   there is no auth.
9. **Two task systems in tension:** `todos.json` (live, used by the UI and
   tools) vs the richer `tasks` table (created, unused).

---

## 10. What is NOT built yet

**Productivity:** task priority/deadline/tags/subtasks, goals with milestones,
habit tracking with streaks, time tracker by activity, "Plan My Day", weekly
review, progress charts.

**Wellbeing:** guided meditation, breathing tool with chakra animation,
emotional check-in, private journal, morning greeting, evening reflection,
night mode as an actual experience (the tone exists; the flow doesn't).

**Notifications:** opt-in scheduling, frequency controls. `notifications` table
exists; no scheduler (APScheduler was planned).

**Voice:** interruption/barge-in, LISTENING/THINKING/SPEAKING states driving the
sprite, wake word.

**Learning:** Explain / Quiz Me / Hint / Simplify / Test Me flows, study
sessions.

**Decision support:** the "Help Me Decide" A-vs-B flow (the motivation cue for
stuck decisions exists; the structured flow doesn't).

**Extensions:** browser extension, webpage context, web search, offline caching,
idle CPU/GPU reduction, quick-action launcher bar.
