# 🐹 HAMMY — Development TODO

> Last updated: 2026-08-25

---

## 🖥️ Window & Display Modes Overview

Hammy supports **4 distinct window & display modes** across macOS Desktop & Web:
1. 🪟 **Minimized Mode** — Lives silently in macOS system tray / dock; quick toggle to show/hide.
2. 🐾 **Small / Pet Mode** — Transparent floating desktop pet widget; interactive petting, feeding, speech bubbles, drag-and-drop anywhere on screen.
3. 📱 **Compact Mode** — Right-docked floating compact sidebar widget with tab navigation, quick prompts, and chat input.
4. 🖥️ **Fullscreen / Dashboard Workspace Mode** — Full studio productivity companion with Left Co-Pilot sidebar + full workspace views (Chat, Tasks, Hammy's World, Config, Speech).

---

## ✅ Phase 0 — Foundation & Current Implementation (DONE)

### Core Architecture & Backend
- [x] FastAPI backend setup (`/health`, `/greeting`, `/chat`, `/todos`, `/config`, `/voice`)
- [x] LLM Router: Gemini 1.5 Flash (default), DeepSeek V3, Ollama local
- [x] Context Manager (`context.py`): persona injection + live todo list injection into every LLM prompt
- [x] Persistent Configuration (`config_manager.py` with `~/.hamsterdesk/config.json`)
- [x] Next.js 14 App Router with TypeScript & Tailwind/Vanilla CSS design system
- [x] Multi-mode Electron IPC type declarations (`electron.d.ts`)

### Visual Identity & Hamster Sprite
- [x] Exact Kawaii reference match: continuous chubby gourd body, dark chocolate outline (`#3D1B0B`)
- [x] Feathered cream forehead blaze + watercolor fur texture filter (`#FAC87E` → `#DF8830` gradient)
- [x] Glossy espresso eyes with interactive cursor-tracking micro-parallax
- [x] In-paw animated sunflower seed snack (`mood: 'eating'`)
- [x] Floating heart/sparkle burst particles on pet click (`💖`, `✨`, `🌟`, `🌸`)
- [x] 10 animated mood states (Idle, Listening, Thinking, Speaking, Happy, Sleeping, Eating, Waving, Excited, Dragged)
- [x] Petting streak counter (`💖 ×N`) with auto-decay timer

### Window Modes & Navigation
- [x] **Small / Pet Mode**: Floating transparent character with drag handle, food bowl, and speech bubble
- [x] **Compact Mode**: Floating compact window with top bar, control buttons, and docked panels
- [x] **Fullscreen Mode**: Complete dashboard layout with Left Co-Pilot sidebar and main view
- [x] **Minimized Mode**: Electron minimize/hide controls and IPC triggers
- [x] Warm cozy honey-espresso glassmorphism theme (`#140D09` dark background, `#F5A84B` golden accents)
- [x] Unified startup script (`./startup.sh`) for concurrent backend + frontend management

---

## 🔨 Phase 1 — 5-Tab Structure & Hammy's World Dashboard

- [ ] Add 5th tab: **🌍 Hammy's World** (Dashboard)
- [ ] Reorder tab bar: `💬 Chat` → `✅ Tasks` → `🌍 Hammy's World` → `⚙️ Config` → `🎤 Speech`
- [ ] **Hammy's World Dashboard Widgets**:
  - [ ] **Water Intake Tracker**: 8 glasses daily goal with visual water droplet progress & quick log `+` button
  - [ ] **Daily Mood Check-in**: Interactive mood selector (*"How are you feeling today?"*)
  - [ ] **Pomodoro Focus Timer**: Customizable work/break timer with Hammy running speed-up animation
  - [ ] **Productivity Stats Card**: Tasks completed count, current streak, water intake percentage
  - [ ] **Wellness Reminders Card**: Active intervals for water, stretch, eye rest (20-20-20 rule), and bedtime
- [ ] **Chat Quick Prompts**:
  - [ ] Idle suggestions: *"Plan my day 🌅"*, *"What's on my to-do? 📋"*, *"Find a file 🔍"*, *"Check my schedule 📅"*

---

## 🔨 Phase 2 — Enhanced Tasks & Time Management

- [ ] **Task Priority System**: Visual tags for 🔴 High / 🟡 Medium / 🟢 Low
- [ ] **Due Date & Time Parsing**: Natural language date parser (e.g., *"Call mom tomorrow at 5pm"*)
- [ ] **Tags & Project Grouping**: Custom colored category tags (Work, Personal, Study, Wellness)
- [ ] **Subtasks Checklist**: Expandable nested subtask items
- [ ] **Drag & Drop Reorder**: Interactive task reordering with state persistence
- [ ] **Daily Progress Bar**: Real-time task completion percentage
- [ ] **Celebration Animation**: Hammy happy dance + confetti burst on task completion
- [ ] **Backend Task Enhancements**: Update `/todos` CRUD schema with priority, due_date, tags, subtasks, and reorder endpoint

---

## 🔨 Phase 3 — Chat Improvements & Persona Refinement

- [ ] **Hammy Persona Update (`context.py`)**:
  - [ ] Hardcoded IST timezone (`Asia/Kolkata`)
  - [ ] Childlike, bubbly, enthusiastic tone with *squeak!* and *wheee!* expressions
  - [ ] Explicit non-coding assistant guardrails (kindly redirects coding questions)
  - [ ] Dynamic runtime injection of pending tasks, water intake, and today's mood
- [ ] **Message History & Search**: Persistent chat history with search bar
- [ ] **Voice Push-to-Talk Button**: Hold-to-talk microphone trigger in chat input bar

---

## 🔨 Phase 4 — Wellness & Reminders Backend (APScheduler)

- [ ] APScheduler integration inside FastAPI lifecycle
- [ ] **Water Reminders**: Configurable interval (15–120 min, default 45 min)
- [ ] **Stretch & Stand-up Reminders**: Periodic movement notifications
- [ ] **Eye Rest Reminder**: 20-20-20 rule toast notifications
- [ ] **Sleep Reminder**: User-defined bedtime alert
- [ ] **Hammy Reminder Mood**: Animated Hammy holding tiny 💧 sign during wellness alerts
- [ ] **Reminders API**: Endpoints for logging water, recording moods, and updating schedule frequencies

---

## 🔨 Phase 5 — Voice Integration & Audio Engine

- [ ] **Voice Options**:
  - [ ] Deepgram cloud STT + TTS (`Aura-Asteria` cute voice)
  - [ ] Apple Local offline voice (`AVSpeechSynthesizer` at max pitch with `Samantha`)
- [ ] **Wake Word Detection**: "Hey Hammy!" toggleable wake word engine
- [ ] **Voice Pitch Control**: Slider in Config tab for squeaky chipmunk cute tone
- [ ] **Push-to-Talk Hook (`useVoice.ts`)**: Browser Web Audio API mic capture & audio streaming
- [ ] ❌ **No Morning Startup Voice**: Voice only activates on user interaction or wake word

---

## 🔨 Phase 6 — Electron Desktop Shell & System Integration

- [ ] **Window Mode Handling**:
  - [ ] Frameless, transparent, always-on-top window
  - [ ] Right-screen edge docking and snapping
  - [ ] Seamless transitions between Small (Pet), Compact, and Fullscreen modes
- [ ] **FastAPI Sidecar Process**: Automatic background lifecycle management from Electron
- [ ] **macOS System Tray**: Tray icon with Show/Hide, Mode Switcher, and Quit menu
- [ ] **Launch on Login**: Toggleable startup item support

---

## 🔨 Phase 7 — File Search & macOS Spotlight Tools

- [ ] Natural language file search endpoint (`/files/search` via macOS `mdfind` Spotlight API)
- [ ] Quick-access recent documents panel
- [ ] App launcher trigger (e.g., *"Open Figma"*, *"Launch Spotify"*)
- [ ] Clipboard history manager & quick unit/timezone converter

---

## 🔨 Phase 8 — RAG Knowledge Base & Calendar Sync

- [ ] **RAG Integration**: LlamaIndex + ChromaDB vector retrieval for user files & PDFs
- [ ] **Calendar Integration**: Google Calendar & Apple Calendar (CalDAV/EventKit) sync
- [ ] Real-time schedule injection into Hammy's LLM context

---

## 🔨 Phase 9 — Speech Training Tab (Placeholder Scaffold)

- [ ] Hammy holding a tiny microphone graphic
- [ ] Inactive custom prompt training interface
- [ ] Record, playback, and label placeholder UI with dashed border "Coming Soon" card

---

## 🔨 Phase 10 — Polish, Packaging & Release

- [ ] Lottie animation integration / high-res vector polish
- [ ] Hammy skin switcher (Classic Orange, Snow White, Caramel, Midnight)
- [ ] CPU & RAM optimization for background idle execution
- [ ] Electron auto-updater integration
- [ ] Standalone Next.js web build & embeddable widget mode
