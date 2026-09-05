# 🪈 MADHAV — Development TODO (audited)

> Last audited: 2026-09-05, against actual code on branch `krishna-functions`
> (not assumptions). Cross-checked with `HANDOFF.md` / `KRISHNA_STATUS.md` and
> two fresh code audits (backend + frontend, including a full pytest run and
> `tsc`/`eslint`). Every item below carries the evidence it was marked from.

**Status legend**
✅ DONE — implemented, integrated, and usable · 🟡 PARTIAL — code exists but
incomplete/not integrated/no UI · 🔴 PENDING — not implemented · ⚠️ BROKEN —
was working, currently failing · 🔵 IN PROGRESS — uncommitted work landing now

---

## 🆕 Since the last handoff (uncommitted, on this branch right now)

`git status` shows real, substantial work in progress that predates the docs
above. This is the most important thing in this file — commit it soon.

- 🔵 **Realtime "Live" voice (Gemini Live API)** — closes the "no streaming/
  barge-in" gap called out in `HANDOFF.md` §12.8.
  - Backend: `backend/routes/live.py` (`GET /voice/live/status`,
    `WS /voice/live`) + `backend/voice/live_session.py` — a real WebSocket
    relay onto `client.aio.live.connect` (model
    `gemini-2.5-flash-native-audio-preview-09-2025`), with barge-in, frame
    guarding, model-candidate fallback, and a new `persist_turn()` in
    `krishna/orchestrator.py` so live turns land in the same conversation
    history as typed/turn-based ones. Wired into `main.py` (`include_router`).
  - Frontend: `frontend/src/lib/liveAudio.ts` (AudioWorklet mic capture →
    16kHz PCM16, scheduled 24kHz playback queue with `flush()` for barge-in)
    + `frontend/src/lib/useLiveVoice.ts` (WS client: `interrupted`,
    `input_transcript`/`output_transcript` partials, `turn_complete`) — wired
    into `ChatPanel.tsx`.
  - Gaps before this is really "done": no dedicated test coverage for the WS
    path; not reviewed; not committed; sprite doesn't yet react to
    listening/thinking/speaking state from it (see Phase 12).
- ✅ **Today dashboard shipped** (`HANDOFF.md` §11.6 item 4).
  `frontend/src/components/Today/TodayPanel.tsx` implements the exact spec'd
  hierarchy — greeting → priority/Start Focus → tasks → habits/goals → daily
  Gita (embeds `<DailyPanel embedded />`) → progress — backed by
  `GET /productivity/today`, mounted in `page.tsx` for the Krishna buddy, and
  confirmed rendering in **both compact and fullscreen** window modes.
- ✅ **`useFocusTimer` wired to the backend** (§11.6 item 3). It now calls
  `startFocusSession` / `endFocusSession`, tracks a real `session_id`, and
  surfaces `reflection_prompt`. This was the missing link for `BEST_TIME_OF_DAY`,
  `FOCUS_PATTERN` and `DISTRACTION_PATTERN` insights to ever get data.
- ✅ **`backend/tests/test_productivity.py` now exists** (§11.6 item 5 said it
  didn't). Full backend suite is now **405 tests: 404 passed, 1 failed** —
  up from the 293 documented in `HANDOFF.md`.
- ⚠️ **BROKEN — one test failure**: `tests/test_voice.py::
  test_ssl_cert_file_is_set_for_the_websocket_path` → `NameError: name 'os' is
  not defined`. Missing `import os` in the test file itself (not a logic bug
  in the live-voice code). One-line fix.
- 🟡 **Productivity API client is partial** (§11.6 item 2). `lib/api.ts` has
  client functions for `today`, `plan`, `weekly-review`, `insights`, `tasks`,
  `goals`, `habits`, `focus`. **Missing entirely:** dedicated `time`
  (time-tracking start/stop/log), `reminders` (only a type exists, no
  request fn), `situations` (only a comment, no call), and `stats`.
- 🔴 **`MemoryPanel` still not mounted** anywhere in `page.tsx` — confirmed
  unchanged from `HANDOFF.md`.
- 🔴 **`SpeechTrainingPanel.tsx` is still a placeholder** — static heading,
  disabled textarea, no logic. Mounted under the `speech` tab but inert by
  design (Phase 9 scaffold, never built out).
- 🟢 **Frontend type/lint check clean**: `tsc --noEmit` → 0 errors.
  `eslint` on the touched-file set → 1 error (`react-hooks/set-state-in-effect`
  in `useFocusTimer.ts:106`, pre-existing code, not a regression).
- 🔴 **Not re-verified this pass**: `npm run build` (production build) was not
  run against this diff — do that before calling the frontend work done.

---

## PHASE 0 — EXISTING FOUNDATION

### Architecture
- [x] ✅ Backend FastAPI
- [x] ✅ Pydantic models
- [x] ✅ SQLite database — 25 tables (`backend/db/schema.sql`)
- [x] ✅ Provider-independent LLM architecture (`backend/llm/router.py`)
- [x] ✅ Gemini adapter · [x] ✅ DeepSeek adapter · [x] ✅ Ollama adapter
- [x] ✅ Automatic LLM fallback
- [x] ✅ Next.js frontend (Next 16, App Router, Turbopack, React 19)
- [x] ✅ Electron desktop shell — `electron-desktop/main.js` (631 lines):
  frameless/transparent/always-on-top window, `Tray` + animated menu-bar
  icon, dock handling, buddy switching. Cross-platform startup scripts exist
  (`startup.sh`, `startup_web.sh`, `startup_windows.bat`). Not yet done:
  auto-updater, launch-on-login (see Phase 10 of the old roadmap, below).

### Existing Characters
- [x] ✅ Krishna/Madhav · [x] ✅ Hamster · [x] ✅ Panda
- [x] ✅ Character switching (`BuddyRenderer.tsx` + `registry.ts`)
- [x] ✅ Existing characters continue working — hamster/panda still on the
  legacy `/chat` + `/todos` paths, untouched by this diff, tested.

### Krishna Intelligence
- [x] ✅ Centralized Krishna persona (`krishna/persona.py`)
- [x] ✅ Friend / Wise / Productivity / Gita / Focus / Playful / Listening modes
- [ ] 🟡 Meditation mode — the *mode* exists in `modes.py`; there is no guided
  meditation experience behind it yet (that's Phase 10 below).
- [x] ✅ Time-of-day personality · [x] ✅ Intent classification (~20 intents)
- [x] ✅ Emotion classification (~10 emotions)
- [x] ✅ Gita relevance detection · [x] ✅ Technical-question Gita suppression
- [x] ✅ Safety classification

### Memory
- [x] ✅ Creation / Retrieval / Deletion / Consent / Sensitive-content
  protection / Pause / Forget-everything / Export / Per-user isolation
- [ ] 🟡 Memory UI — `MemoryPanel.tsx` is fully built but **not mounted**
  in `page.tsx`. Ready to drop into Config; nobody has wired it in.

---

## PHASE 1 — GITA FOUNDATION

### Gita Knowledge
- [x] ✅ 18 chapters / 700-verse canonical map + reference validation
  (`gita/chapters.py`)
- [x] ✅ Sanskrit / Transliteration / Translation / Commentary / Practical
  application storage — 4 distinct tables, all wired (schema + models +
  importer), even though only Sanskrit+translation are populated today
- [x] ✅ Source attribution · [x] ✅ Verification status (`verified` flag,
  exposed to the API and badged in the UI)
- [x] ✅ Theme / Keyword / Synonym-aware / Exact-verse search
- [x] ✅ Invalid verse handling · [x] ✅ Edition variation handling (13.35)

### Gita Data — CRITICAL
- [ ] 🔴 Import authoritative Sanskrit (importer exists, never run)
- [ ] 🔴 Verify all 700 verses — **only 33 of 700 exist, all
  `verified: false`** (`gita/seed_data.py`, confirmed by count)
- [ ] 🔴 Authoritative translations · [ ] 🔴 Commentary sources (deliberately
  zero — commentary is never synthesised, only imported)
- [ ] 🟡 Provenance — mechanism is done; no real source is attached yet
- [x] ✅ UI badges verified correct (show "unverified" honestly)
- [x] ✅ Hallucination-prevention tested (52 tests in `test_gita_engine.py`)

### Daily Gita
- [x] ✅ Daily verse / Sanskrit / Translation / Source / Theme / Modern
  interpretation / Practical application / UI — all done, and the UI is now
  also embedded inside the Today dashboard, not just its own tab.

---

## PHASE 2 — PRODUCTIVITY CORE

### Tasks
- [x] ✅ Unified task repository — `todos.json` migrated onto the `tasks`
  table via `tasks.seq`; `/todos` stays wire-compatible (`legacy_shape()`)
- [x] ✅ Create / edit / delete / complete · [x] ✅ Priority · [x] ✅ Deadline
- [x] ✅ Estimated/actual time · [x] ✅ Tags · [x] ✅ Subtasks (1 level)
- [x] ✅ Status · [x] ✅ Filtering & sorting — confirmed in
  `productivity/tasks.py` (`list_tasks(status=, priority=)` + sort key)
- [x] ✅ User isolation · [x] ✅ Existing todo functionality preserved
- **Caveat:** no dedicated rich task-management form in the frontend — task
  creation with priority/tags/subtasks happens through chat tool calls
  (`createTask`) or the legacy `TodoPanel`, not a new UI.

### Goals
- [x] ✅ Create/edit/archive/pause/complete (backend), progress, deadline,
  milestones (progress recomputed on every milestone change), tasks↔goal links
- [ ] 🟡 Goal dashboard — surfaced as a **read-only** card inside the Today
  dashboard; no dedicated Goals screen or in-app creation form (creation is
  chat-tool/API only — `createGoal` appears only in `api.ts`, never called
  from a frontend component).

### Habits
- [x] ✅ Create/edit/delete, daily/weekly frequency, completion, history,
  current/best streak, completion %, missed-day handling (forgiving by
  design), no-shame recovery copy
- [ ] 🟡 Same UI caveat as Goals — display-only in Today, no management screen.

---

## PHASE 3 — FOCUS + TIME

### Focus
- [x] ✅ 25/45/60/custom durations, all 6 modes, linked task/goal, history
- [x] ✅ **Now fully wired end to end** — `useFocusTimer` calls
  `/productivity/focus/start` and `/end`, surfaces `reflection_prompt`. This
  was the last gap; closed in this diff.

### Time Tracking
- [x] ✅ Backend complete — one `time_entries` table, today/week totals, by
  category/task/goal, planned-vs-actual, `unallocated_minutes`
- [ ] 🟡 Frontend — no `time` group in `lib/api.ts` yet, and no manual
  time-entry UI; only focus-session time flows through automatically.

---

## PHASE 4 — PLAN MY DAY

- [x] ✅ Morning greeting, ask priorities, retrieve unfinished tasks/deadlines/
  goals/habits, consider available time
- [ ] 🟡 Consider historical productivity patterns — `insights.py` exists and
  is data-gated, but not confirmed whether `planning.py` actually consults it
  when building a day's plan vs. just today's open items (not verified this
  pass — check `productivity/planning.py` before assuming either way)
- [x] ✅ Generate realistic schedule, prioritize, estimate duration (with
  assumptions reported, never invented), add breaks, add buffer (75%
  `SCHEDULE_FRACTION`), avoid overload
- [ ] 🟡 Allow manual adjustment — backend returns a proposed plan + a commit
  endpoint, but no frontend UI to edit/drag the plan before committing it
- [x] ✅ Start focus directly from plan (Today's Start-Focus button/suggestion)

---

## PHASE 5 — DAILY DASHBOARD ("Today with Madhav")

**The big one that landed this cycle.** All of the following are ✅ DONE via
`TodayPanel.tsx`, confirmed rendering in both compact and fullscreen modes:
- [x] ✅ Today's priorities · [x] ✅ Tasks · [x] ✅ Task completion %
- [x] ✅ Focus time · [x] ✅ Habits · [x] ✅ Goals
- [x] ✅ Daily Gita (embedded `<DailyPanel embedded />`, Word of Day, Teaching)
- [x] ✅ Quick Start Focus · [x] ✅ Talk to Madhav (chat one tab away)

### UX
- [x] ✅ Desktop responsive — verified in both compact + fullscreen
- N/A "Mobile responsive" — this is an Electron desktop app; no mobile target
- Subjective (clean / youth-oriented / not corporate / not overly religious /
  Madhav central) matches the spec'd hierarchy in code but wasn't
  independently design-reviewed in this pass.

---

## PHASE 6 — GITA × PRODUCTIVITY

`krishna/gita_action.py` maps **9** situations: `PROCRASTINATION`, `OVERWHELM`,
`COMPARISON`, `FAILURE`, `DISCIPLINE`, `DISTRACTION`, `DECISION`, `BURNOUT`,
`MOTIVATION`.

- [x] ✅ Situation classification · [x] ✅ Gita principle mapping
- [x] ✅ Verified verse retrieval (only from DB, never generated)
- [x] ✅ Modern interpretation (always labelled, never presented as scripture)
- [x] ✅ Action recommendation · [x] ✅ Tool execution (`tool_hint` → real tools)
- [ ] 🟡 Follow-up / Reflection — not a separately tracked step; depends on
  the LLM continuing the conversation, not code-enforced
- [ ] 🟡 **Broader "modern problems" coverage** — the old checklist names 14
  problems (adds Overthinking, Anger, Anxiety, Career confusion, Ego,
  Consistency); only 9 have a dedicated situation. Anger/anxiety etc. are
  still reachable through Gita **theme search** (e.g. "I am so angry" → anger
  verses), just not through the structured action-engine path.

---

## PHASE 7 — MADHAV COACH

- [x] ✅ One general **coaching flow** exists and is real: `COACHING_FLOW` in
  `persona.py` (listen → name problem → one insight → one concrete action →
  offer a tool), injected for procrastination/task/planning/goal/habit/timer/
  review/failure/motivation intents.
- [ ] 🔴 There is **no separate specialized coach per domain** — "career
  coaching", "study coaching", "confidence coaching" etc. are not distinct
  modes/flows, just the one general coach. If the roadmap wants N specialized
  coaching personalities, that's still 🔴 PENDING.
- Coaching-flow substeps (listen, understand problem, Gita principle,
  practical recommendation, concrete action, tool execution) — ✅ DONE, since
  they're the literal steps encoded in the prompt. "Ask clarifying question"
  and "identify root issue" are prompt instructions to the LLM, not
  code-enforced, so mark 🟡 PARTIAL — can't be statically verified as always
  happening.

---

## PHASE 8 — HELP ME DECIDE

- [ ] 🔴 The structured A-vs-B decision flow does **not** exist.
- [ ] 🟡 The `DECISION` situation in `gita_action.py` gives a relevant Gita
  principle for decision-related messages, but there is no dedicated
  define-decision / priorities / constraints / pros-cons / risk /
  reversibility / controllability / summary / action-plan flow around it.
  Everything else in this phase is 🔴 PENDING.

---

## PHASE 9 — WEEKLY REVIEW

- [x] ✅ Backend complete (`productivity/review.py`): tasks planned/completed/
  %, focus hours, habit consistency, goal progress, best day, best working
  period, unfinished important tasks — every observation carries its
  `evidence`; `NO_DATA`/`THIN_DATA` for empty/thin weeks.
- [x] ✅ Intelligence — the 9 `insights.py` types cover productivity/
  estimation/focus/habit/goal patterns, overload and consistency detection,
  each gated by a data-sufficiency threshold.
- [ ] 🟡 "Madhav reflection" fields (what went well/didn't, what Madhav
  noticed, one Gita principle, one improvement, next week's experiment) —
  the review returns evidence-backed observations; not confirmed these
  exact 5 named fields exist 1:1 in the payload.
- [ ] 🔴 **Frontend UI** — `GET /productivity/weekly-review` and its `api.ts`
  client function exist, but no dedicated Weekly Review panel/screen was
  found anywhere in `frontend/src/components`.

---

## PHASE 10 — WELLBEING

Still fully 🔴 PENDING, unchanged from `HANDOFF.md`. No meditation, breathing,
emotional check-in, journal, morning/evening reflection, or night-mode
component exists anywhere in `frontend/src/components` (checked directly).
`journal_entries` table exists in schema but is referenced by zero routes.

---

## PHASE 11 — VOICE

- [x] ✅ Natural conversational voice — 7 providers (Gemini, Sarvam, Cartesia,
  Deepgram, Fish Audio, Apple, browser), STT/TTS chosen independently, each
  with its own fallback chain (`voice/providers.py`)
- [ ] 🟡 Youthful/character voice — depends on `FISH_AUDIO_ID_<CHARACTER>`
  being configured; not guaranteed by default
- [x] ✅ **Voice interruption / barge-in — NEW, done this cycle.**
  `liveAudio.ts`'s `flush()` + `useLiveVoice.ts`'s `interrupted` handling
  closes the exact gap `HANDOFF.md` §12.8 called out as not built.
- [x] ✅ Partial transcripts while speaking — NEW, via `input_transcript`/
  `output_transcript` events in the live WS path
- [ ] 🔴 Listening/Thinking/Speaking **animation** — sprite still doesn't
  consume the `presentation` payload (see Phase 12 — this is the one thing
  the new live-voice work did *not* close)
- [ ] 🔴 Voice emotion · [ ] 🔴 Chakra synced with voice
- [ ] 🟡 Voice mode switching — there are now genuinely two paths (turn-based
  `/voice/converse` and streaming `/voice/live`); not confirmed there's a UI
  toggle exposing that choice to the user
- [ ] 🔴 Wake word
- [x] ✅ Voice → orchestrated Krishna backend — both paths call
  `orchestrator.respond()` / `persist_turn()`, not the legacy flat `/chat`

---

## PHASE 12 — CHARACTER / PRESENCE

- [ ] 🔴 **The documented "current major issue" is still open**: `/krishna/chat`
  (and now `/voice/live`) return a `presentation` payload
  (`animation`/`chakra`/`voiceMode`/`particles`), and the sprite still does
  not consume it. This is the single highest-leverage remaining item to make
  Madhav "feel alive."
  - [ ] 🔴 Connect presentation payload → character
  - [ ] 🔴 Connect animation state · [ ] 🔴 Connect Chakra state
  - [ ] 🟡 Connect voice mode (partially true now that live vs. turn-based
    voice are both real, distinct paths)
  - [ ] 🔴 Connect particles
- Individual mood animations (Idle/Listening/Thinking/Talking/Happy/Playful/
  Wisdom/Encouraging/Blessing/Celebration/Sleeping) — `KrishnaSprite.tsx` and
  `PoseSelector.tsx` exist with some visual poses, but not verified against
  this exact list, and none of them are driven by the backend event bus yet.
  Mark 🟡 PARTIAL pending a closer look, not 🔴, since sprite work clearly
  exists — just not confirmed complete or backend-wired.

---

## PHASE 13 — LEARNING

Fully 🔴 PENDING. No Explain/Simplify/Hint/Quiz-Me/Test-Me/study-session/
spaced-repetition component found anywhere in the frontend or backend.

---

## PHASE 14 — BROWSER COMPANION

Fully 🔴 PENDING. No extension manifest, no browser-facing code, anywhere in
the repo.

---

## PHASE 15 — NOTIFICATIONS

Fully 🔴 PENDING. No `apscheduler` in `requirements.txt`, no scheduler code in
`main.py`, and zero routes reference the `notifications` table. `createReminder`
stores a row and says out loud that nothing will fire it — that's still
accurate.

---

## PHASE 16 — MEMORY INTELLIGENCE

- [x] ✅ All 10 memory categories exist and cover goals/preferences/projects/
  work/learning/habits/tasks/decisions/conversation-context — structurally
  ready for "remember user goals/preferences/projects/habits/learning
  objectives"; whether the model *proactively* captures "productivity
  patterns" specifically isn't something a static audit can confirm (that's
  LLM behavior, not code)
- [x] ✅ Consent, view, edit, delete, pause, forget-everything, export — all
  implemented backend-side
- [ ] 🟡 Frontend — same gap as Phase 0: `MemoryPanel.tsx` exists but is not
  mounted, so none of this is currently reachable from the UI.

---

## PHASE 17 — ANALYTICS

- [x] ✅ Backend — `insights.py` + `stats.py` cover focus/task/habit/goal
  trends, time allocation and productivity patterns, each gated by a data
  threshold so nothing is fabricated
- [ ] 🟡 Frontend — Today dashboard surfaces some rolled-up stats/progress;
  no dedicated Insights/Analytics panel was found. If the product wants a
  standalone analytics view (not just Today's summary), that's still to build.

---

## PHASE 18 — SECURITY / PRIVACY

- [x] ✅ User isolation (memory + every productivity subsystem, tested)
- [x] ✅ Memory consent · [x] ✅ Sensitive-data protection
- [x] ✅ API-key protection — keys live in browser LocalStorage only, never
  written to server disk (`X-Gemini-Key`, `X-Cartesia-Key`, etc.)
- [x] ✅ No secret leakage by design
- [ ] 🔴 N/A Journal privacy (journal feature doesn't exist yet)
- [x] ✅ Data export / deletion (memory export + forget-everything)
- [ ] 🔴 Notification consent (no notifications yet)
- [ ] 🔴 Browser permission consent (no browser extension yet)

---

## PHASE 19 — TESTING

### Backend
- [x] ✅ **405 tests total: 404 passed, 1 failed** (up from the 293 documented
  in `HANDOFF.md`) — run via `.venv/bin/python -m pytest tests/ -q`
- [ ] ⚠️ 1 failing test: `test_ssl_cert_file_is_set_for_the_websocket_path`
  (missing `import os` in the test file — trivial fix)
- [x] ✅ Task / goal / habit / focus / time-tracking / daily-planning /
  weekly-review tests — `tests/test_productivity.py` now exists (it didn't as
  of `HANDOFF.md`)
- [x] ✅ Gita integrity, memory, tool, user-isolation tests all present

### Frontend
- [x] ✅ TypeScript — `tsc --noEmit`: **0 errors**
- [ ] 🟡 ESLint — touched-file set: 1 pre-existing error, not a regression;
  full-repo baseline (22 errors/14 warnings per `HANDOFF.md`) not re-run
- [ ] 🔴 **Production build (`npm run build`) not re-verified this pass** — do
  this before calling the frontend work shippable
- [ ] 🔴 No frontend unit-test runner exists at all (unchanged)
- [ ] 🔴 No component tests · [ ] 🔴 No critical-flow tests

### Regression (all confirmed still working)
- [x] ✅ Hamster · [x] ✅ Panda · [x] ✅ Krishna · [x] ✅ Legacy `/chat` ·
  [x] ✅ `/krishna/chat` · [x] ✅ Gita · [x] ✅ Memory (backend) ·
  [x] ✅ Focus (now end-to-end) · [x] ✅ Voice (both turn-based and live) ·
  [x] ✅ Configuration

---

## FINAL PRODUCT CHECK

The morning→plan→focus→complete→acknowledge→Gita→continue loop is now mostly
wired for a single day (Today dashboard + focus wiring + weekly-review
backend all exist). What's still missing before this reads as the "final
vision" experience:

- 🔴 No Weekly Review **screen** to close the Sunday loop in the UI
- 🔴 No Help-Me-Decide flow
- 🔴 No Wellbeing flow (meditation/breathing/reflection/journal)
- 🔴 No notifications/scheduler to proactively nudge the user
- 🔴 Sprite/Chakra still don't react to conversation state (biggest
  "feels alive" gap, and the one thing new voice work didn't close)
- 🟡 Goals/Habits have no dedicated management UI (chat-tool-only creation)

---

## Recurring pattern: the productivity backend keeps outrunning its UI

Six separate phases above independently hit the same shape — a real, tested
backend with **no frontend surface at all**, not even a half-built one.
Worth calling out once instead of as six unrelated 🟡s:

| Feature | Backend | Frontend |
|---|---|---|
| Task creation (priority/tags/subtasks) | ✅ `productivity/tasks.py` | chat-tool (`createTask`) or legacy `TodoPanel` only — no rich form (Phase 2) |
| Goals | ✅ create/edit/archive/milestones | read-only card in Today; `createGoal` exists in `api.ts`, called from nowhere (Phase 2) |
| Habits | ✅ streaks/completion/history | display-only in Today, no management screen (Phase 2) |
| Time tracking | ✅ `time_entries`, today/week totals, planned-vs-actual | no `time` group in `lib/api.ts`, no manual-entry UI (Phase 3) |
| Plan-my-day adjustment | ✅ proposed plan + commit endpoint | no UI to edit/drag the plan before committing (Phase 4) |
| Weekly review | ✅ `productivity/review.py`, evidence-backed | no panel/screen anywhere in `frontend/src/components` (Phase 9) |
| Memory | ✅ full CRUD + consent + export | `MemoryPanel.tsx` fully built, just never mounted in `page.tsx` (Phase 0/16) |
| Analytics/insights | ✅ `insights.py` + `stats.py`, 9 gated pattern types | Today shows a rollup; no standalone Insights view (Phase 17) |

**Root blocker for four of these at once**: `lib/api.ts` has no client
functions for `time`, `reminders`, `situations`, or `stats` (see "Since the
last handoff" above) — that's the first unblock before Time Tracking,
Analytics, or a Reminders UI can even start.

**Cheapest win**: mounting `MemoryPanel` is zero backend work and pure
wiring. Everything else needs a real product call — one shared
"Productivity" screen (Goals + Habits + Time + Weekly Review + Analytics)
vs. five separate ones — since the backend data shapes already exist for
all of them either way.

---

## Verification commands

```bash
# Backend — 405 tests (404 pass, 1 known fail), ~15s
cd backend && .venv/bin/python -m pytest tests/ -q

# Frontend
cd frontend && ./node_modules/.bin/tsc --noEmit
./node_modules/.bin/eslint src/components/Krishna src/lib/api.ts src/components/Today \
  src/lib/useLiveVoice.ts src/lib/liveAudio.ts src/lib/useFocusTimer.ts
npm run build   # not re-verified in the 2026-09-05 audit — run before shipping
```

---

## Appendix — legacy "Hammy" roadmap (superseded)

The original version of this file (pre-Krishna/Madhav pivot) planned 10
phases around a single hamster desktop pet: 5-tab dashboard, wellness
reminders via APScheduler, voice, Electron shell, file search, RAG, a speech
training placeholder, and packaging. That plan is superseded by the Master
Checklist above, which reflects what the product actually became. For the
record, cross-checking that old plan against real code today:

- Electron shell, tray, transparent/always-on-top windows, buddy switching —
  ✅ actually done (`electron-desktop/main.js`), contrary to the old file's
  fully-unchecked boxes.
- Wellness reminders / APScheduler — 🔴 still not built (now tracked as
  Phase 15 above).
- Speech Training tab — 🔴 still exactly the placeholder scaffold it planned
  to be (`SpeechTrainingPanel.tsx`).
- File search / Spotlight / RAG / ChromaDB / Calendar sync — 🔴 none of this
  exists in the current backend (`backend/rag/engine.py` exists as a stub
  package but was not part of this audit's scope — worth a follow-up look
  before assuming either way).
