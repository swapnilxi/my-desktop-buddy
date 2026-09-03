# Madhav — Krishna AI Companion: Build Status

Development plan and honest status against the 74-part specification.
Phase order follows Part 72; verification follows Part 73.

## Verification (run after any change)

```bash
# Backend — 228 tests
cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt pytest httpx
.venv/bin/python -m pytest tests/ -q

# Frontend
cd frontend && ./node_modules/.bin/tsc --noEmit && npx next build
./node_modules/.bin/eslint src/components/Krishna src/lib/api.ts
```

---

## PHASE 1 — Complete

### Foundation
| Part | Item | Where |
|---|---|---|
| 55 | SQLite schema, 18 tables | `backend/db/schema.sql` |
| 65 | Modular packages: `db` `gita` `memory` `krishna` `tools` `observability` | `backend/` |
| 64 | Event bus, 15 events, per-event presentation | `backend/krishna/events.py` |
| 66 | Tool registry + executor, 16 tools | `backend/tools/registry.py` |
| 50 | Response-intelligence classifier | `backend/krishna/intent.py` |
| 67 | Structured JSON logging + `usage` table | `backend/observability/logging.py` |
| 61 | loading / ready / empty / error / offline states | panels + `/health` subsystems |

### Personality
| Part | Item | Where |
|---|---|---|
| 1–4 | Core personality, friend mode default, joy, guidance flow | `backend/krishna/persona.py` |
| 30–34 | 8 modes: friend, wise, productivity, gita, meditation, focus, playful, listening | `backend/krishna/modes.py` |
| 12–14 | Morning / evening / night tone by hour | `modes.py` `TIME_CONTEXTS` |
| 35 | Motivation engine — 10 contextual cues, generic lines blocklisted | `backend/krishna/motivation.py` |
| 36–37 | Celebration scaling, failure recovery without shame | `motivation.py` |
| 51 | Technical and high-stakes questions get **no** scripture | `intent.py` + tests |
| 52 | "Radhe Radhe" only for real greetings | `persona.py` `VOICE_GUIDE` |
| 53 | No divinity, no supernatural, no destiny claims | `persona.py` `CORE_IDENTITY` |
| 54 | Distress overrides everything; medical/legal/financial caution | `persona.py` `SAFETY_GUIDE` |

### Gita engine
| Part | Item | Where |
|---|---|---|
| 5 | Verse schema; scripture / translation / commentary / application in 4 tables | `gita/models.py`, `schema.sql` |
| 6 | Source hierarchy; multi-interpretation disclosure | `gita/store.py`, `persona.py` |
| 7 | `searchGita` — all 15 required topics + natural phrasing | `gita/store.py` |
| 8 | Answer format, used only when a verse earns it | `persona.py` `GITA_ANSWER_FORMAT` |
| 9–11 | Daily Gita, Word of the Day (25 words), Teaching (24) | `gita/daily.py`, `words.py`, `teachings.py` |
| 34 | Never hallucinate scripture | prompt + engine + 52 tests |
| 56 | Provenance mandatory; importer is the only path to `verified` | `gita/importer.py` |
| 57 | Invalid references rejected — 20.10, 2.500, 13.35 edition variant | `gita/chapters.py` |

### Memory
| Part | Item | Where |
|---|---|---|
| 27 | 10 categories, consent proposals, sensitivity detection | `memory/store.py` |
| 28 | View / edit / delete / forget everything / pause / export | `routes/memory.py`, `MemoryPanel.tsx` |
| 29 | Natural personalization; sensitive items never injected into prompts | `recall_for_prompt` |
| 59 | Per-user isolation, enforced in the store | 31 tests |

### Frontend
- `components/Krishna/DailyPanel.tsx` — Daily Gita, Word of the Day, Teaching
- `components/Krishna/GitaPanel.tsx` — search, themes, full verse, invalid-reference state
- `components/Krishna/MemoryPanel.tsx` — full memory controls
- `components/Krishna/VerseCard.tsx` — provenance badges, source attribution
- `lib/api.ts` — Krishna API client (additive)
- `app/page.tsx` — Today / Gita / Memory tabs, shown only for the Krishna buddy

### Tests — 228
`test_gita_engine.py` 52 · `test_personality.py` 58 · `test_api.py` 42 · `test_memory.py` 31 · `test_tools.py` 29 · `test_daily.py` 16

---

## Known limitations

1. **The 33 seeded verses are `verified: false`.** Sanskrit was transcribed
   offline, not from a primary edition. The API exposes the flag, the UI shows
   an "unverified" badge, and the prompt tells Krishna not to present them as
   settled. **To fix:** import an authoritative edition —
   ```bash
   cd backend && .venv/bin/python -m gita.importer --file verses.json \
     --source-name "IIT Kanpur Gita Supersite" \
     --source-url "https://www.gitasupersite.iitk.ac.in/"
   ```
   This overwrites Sanskrit/translations, attaches attributed commentary, and
   flips `verified` to true. 667 of 700 verses are absent and currently return
   an honest "not in this knowledge base yet".

2. **No commentaries ship.** Deliberate — commentary is never synthesised.
   The importer is the only way in.

3. **Native LLM function calling is off by default** (`KRISHNA_NATIVE_TOOLS=0`).
   It is implemented for Gemini and DeepSeek but unverified against live
   provider APIs. Retrieval is deterministic regardless; actions are reachable
   via `POST /krishna/tools/execute`.

4. **Voice, animation and the floating widget still use the legacy `/chat`
   path.** The orchestrated `/krishna/chat` returns a `presentation` payload
   (animation / chakra / voiceMode / particles) that nothing consumes yet —
   that is Phase 4 work.

---

## Remaining phases

**Phase 2 — Productivity** (Parts 15–22, 60): richer task schema, goals,
habits, time tracker, daily planning, weekly review. Tables exist; `createGoal`,
`updateGoal`, `logHabit` are declared-but-disabled and fail honestly.

**Phase 3 — Wellbeing** (Parts 23–26, 38): meditation, breathing, emotional
check-in, journal, opt-in notifications. `journal_entries` and `notifications`
tables exist.

**Phase 4 — Voice & animation** (Parts 43–46, 63): wire `presentation` into the
sprite, voice interruption, floating widget states.

**Phase 5 — Extensions** (Parts 47–48, 69–70): browser extension, web search
(`searchWeb` declared/disabled), offline caching, idle-CPU reduction.
