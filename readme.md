# 🐹 HAMMY — AI Virtual Assistant & Desktop Pet

> **Hammy** is an irresistibly cute, fully functional AI virtual assistant that lives on your macOS desktop as a floating animated hamster pet and productivity companion. Built with Next.js, FastAPI, and Electron.

---

## 🎯 What Is Hammy?

Hammy is a chibi-style orange Syrian hamster desktop pet that combines irresistible cuteness with complete productivity superpowers:
- 💬 **AI Conversational Partner** — Natural dialog powered by Gemini 1.5 Flash (default), DeepSeek V3, or local Ollama with live context injection.
- ✅ **Task & Time Management** — Natural language task input, priorities (🔴🟡🟢), due dates, subtasks, tags, and drag-and-drop reordering.
- 🌍 **Hammy's World (Wellness Dashboard)** — Daily water tracker (8 glasses goal), Pomodoro focus timer with running animation, mood check-ins, and health stats.
- 🎙️ **Voice Assistant** — Squeaky chipmunk kid voice via Deepgram Aura-Asteria or Apple local AVSpeech, wake word *"Hey Hammy!"*, and push-to-talk.
- 🔍 **Spotlight File Search** — Natural language macOS Spotlight integration to quickly locate documents, images, and applications.
- ❌ **Pure Productivity** — Not a coding assistant; dedicated to daily planning, focus, health reminders, and personal assistance.

---

## 🪟 4 Window & Display Modes

Hammy dynamically adapts to how you work across 4 distinct viewing modes:

```
┌─────────────────┐   ┌───────────────────────────┐   ┌───────────────────────────────────────────────┐
│ 🐾 SMALL / PET  │   │     📱 COMPACT MODE       │   │      🖥️ FULLSCREEN / DASHBOARD WORKSPACE      │
│  (Floating Pet) │   │   (Right Sidebar Widget)  │   │           (Full Studio Companion)            │
│  • Transparent  │   │  • Floating compact panel │   │  • Left Co-Pilot Sidebar (Hammy + Controls)   │
│  • Speech bubble│   │  • 5-Tab quick navigation │   │  • Main workspace (Chat/Tasks/World/Settings) │
│  • Drag anywhere│   │  • Chat input + mic       │   │  • Productivity metrics & calendar views      │
└─────────────────┘   └───────────────────────────┘   └───────────────────────────────────────────────┘
                                       │
                                       ▼
                       ┌───────────────────────────────┐
                       │       🪟 MINIMIZED MODE       │
                       │  • macOS system tray icon     │
                       │  • Quick show/hide toggle     │
                       │  • Zero-clutter background    │
                       └───────────────────────────────┘
```

1. **🐾 Small / Pet Mode**:
   - Ultra-lightweight transparent window containing only Hammy, his ground shadow, thought/speech bubbles, and floating action controls.
   - Interactive petting with heart/sparkle burst particles, double-click feeding (sunflower seed appears in paws), and smooth mouse cursor-tracking parallax.
   - Free dragging to place Hammy anywhere on your screen.

2. **📱 Compact Mode**:
   - Sleek right-docked floating panel with a compact header, window controls, and tab bar.
   - Ideal for keeping Hammy visible alongside your browser or IDE while chatting or checking off quick tasks.

3. **🖥️ Fullscreen / Dashboard Workspace Mode**:
   - Complete desktop workspace featuring a **Left Co-Pilot Sidebar** with Hammy, status indicators, and talk button.
   - Expansive main area displaying full tabs: AI Chat with history, Task Matrix with drag-and-drop, Hammy's World dashboard (Water tracker, Pomodoro, Wellness), and Configuration.

4. **🪟 Minimized Mode**:
   - Tucks Hammy into the macOS system tray or dock; instant hotkey or tray click to restore.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 ELECTRON SHELL (macOS-first)                │
│    Frameless · Transparent · Always-on-top · Multi-mode     │
├──────────────────────────────┬──────────────────────────────┤
│        NEXT.JS 14 UI         │       FASTAPI BACKEND        │
│    (TypeScript · App Router) │  (Python · Async · Sidecar)  │
├──────────────────────────────┴──────────────────────────────┤
│                        CORE SERVICES                        │
│  • LLM: Gemini 1.5 Flash (Primary) / DeepSeek / Ollama      │
│  • Voice: Deepgram S2S / Apple AVSpeech (Local Offline)     │
│  • RAG: LlamaIndex + ChromaDB vector database               │
│  • Tasks: JSON / DB store with live prompt context          │
│  • Wellness: APScheduler (Water, Stretch, Eye Rest, Sleep)  │
│  • System: macOS Spotlight API (mdfind)                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
my-desktop-pet/
├── electron-desktop/          # Electron shell
│   ├── main.js                # Window modes, tray, sidecar manager
│   └── preload.js             # Secure IPC bridge
│
├── frontend/                  # Next.js 14 Web & Desktop UI
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx       # Multi-mode state, tab router, interaction loop
│   │   │   ├── globals.css    # Warm honey-espresso glassmorphism design system
│   │   │   └── layout.tsx     # Google Fonts (Outfit, Inter, JetBrains Mono)
│   │   ├── components/
│   │   │   ├── Hamster/       # Vector SVG character, 10 mood animations, parallax
│   │   │   ├── Chat/          # AI chat, quick prompts, RAG toggle
│   │   │   ├── TodoList/      # Tasks with priority, tags, subtasks, progress
│   │   │   ├── Dashboard/     # Hammy's World (Water tracker, Pomodoro, Mood)
│   │   │   ├── Config/        # Multi-provider LLM & Voice settings
│   │   │   └── SpeechTraining/# Speech training scaffold
│   │   ├── lib/
│   │   │   └── api.ts         # Typed API client
│   │   └── types/
│   │       └── electron.d.ts  # Multi-window mode IPC declarations
│   └── package.json
│
├── backend/                   # FastAPI Python Backend
│   ├── main.py                # App entrypoint, lifespan, CORS
│   ├── context.py             # Hammy persona + dynamic live task context injection
│   ├── config_manager.py      # Pydantic configuration models & persistence
│   ├── routes/
│   │   ├── chat.py            # /chat endpoint
│   │   ├── todos.py           # /todos CRUD endpoints
│   │   ├── config.py          # /config GET/POST
│   │   └── voice.py           # /voice endpoints
│   ├── llm/
│   │   ├── gemini_adapter.py  # Gemini adapter
│   │   ├── deepseek_adapter.py# DeepSeek adapter
│   │   ├── ollama_adapter.py  # Ollama adapter
│   │   └── router.py          # LLM router
│   ├── rag/                   # Document processor & vector search
│   ├── reminders/             # APScheduler wellness timers
│   └── voice/                 # Deepgram & Apple voice engines
│
├── startup.sh                 # Concurrent dev launcher
├── todo.md                    # Detailed roadmap & task tracking
└── readme.md                  # Project documentation
```

---

## 🎨 Visual Design & Hamster Anatomy

Hammy is crafted to faithfully replicate the watercolor kawaii reference illustration:
- **Body**: Smooth continuous chubby gourd/bean silhouette with thick dark chocolate outline (`#3D1B0B`).
- **Fur**: Multi-layered golden amber watercolor gradient (`#FAC87E` → `#EDA24D` → `#DF8830`).
- **Forehead Blaze**: Soft feathered white/cream starburst radiating upward between the eyes.
- **Eyes**: Large glossy dark espresso buttons with crisp white circular catchlights and micro-parallax cursor tracking.
- **Snout & Mouth**: Soft pink nose with 3 whisker root freckles per cheek, inverted "Y" mouth, and sweet pink tongue dot.
- **Paws & Snacks**: Tiny pink paws holding in front of the chest; animates with a real sunflower seed when eating.

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v18 or higher
- **Python**: v3.10 or higher

### 2. Run All Services
```bash
# Clone and enter directory
cd my-desktop-pet

# Run unified launcher (starts FastAPI on port 8000 + Next.js on port 3000)
./startup.sh
```

- **Frontend App**: `http://localhost:3000`
- **Backend API**: `http://localhost:8000`
- **Interactive API Docs**: `http://localhost:8000/docs`

---

---

## 🔒 Public Sharing & Privacy-First Architecture

HamsterDesk is customized for safe public sharing, self-hosting, and multi-user environments:

### 1. Client-Side Credentials (LocalStorage — BYOK)
- **Zero Server Leaks**: API keys (Google Gemini, DeepSeek, Deepgram) entered by public users are stored exclusively inside their browser's **`LocalStorage`**.
- **Request Header Injection**: The frontend automatically attaches credentials per-request via secure custom headers (`X-Gemini-Key`, `X-DeepSeek-Key`, `X-Deepgram-Key`).
- **No Shared Disk Exposure**: Public users' API keys are never written to the server's files or exposed to other visitors.
- **One-Click Clear**: Users can easily purge all stored keys and local settings using the **"🗑️ Clear Keys"** button in the Config panel.

### 2. Server `.env` Configuration (Host Fallback)
Server hosts can optionally configure fallback environment variables by copying `.env.example` to `.env`:

```bash
# Copy template
cp .env.example .env
```

```env
# Server fallback keys (Optional)
GEMINI_API_KEY=your_gemini_api_key_here
DEEPSEEK_API_KEY=your_deepseek_api_key_here
DEEPGRAM_API_KEY=your_deepgram_api_key_here

# Provider & Model defaults
DEFAULT_LLM_PROVIDER=gemini
GEMINI_MODEL=gemini-2.5-flash
DEEPSEEK_MODEL=deepseek-chat

# CORS allowed origins
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

If a server `.env` key is provided, the backend uses it as a graceful fallback when a visitor hasn't entered their own key, while still letting any visitor override with their own client key.

---

## ⚙️ Configuration & Personality

Settings can be customized either in the UI (Config tab) or persisted in `~/.hamsterdesk/config.json`:

```json
{
  "llm": {
    "provider": "gemini",
    "gemini_model": "gemini-2.5-flash",
    "deepseek_model": "deepseek-chat",
    "ollama_model": "llama3"
  },
  "voice": {
    "mode": "apple",
    "deepgram_model": "nova-2",
    "tts_voice": "aura-asteria-en",
    "apple_voice": "Samantha"
  },
  "hamster": {
    "name": "Hammy",
    "color": "#F4A460"
  }
}
```

### Hammy Persona (`context.py`)
- Warm, bubbly, cheerful, playful tone with natural conversation.
- Injects pending tasks and status directly into the LLM system prompt.
- Direct conversational replies without internal thinking or tag noise.

---

## 📄 License

MIT

