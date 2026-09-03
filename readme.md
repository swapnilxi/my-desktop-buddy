# 🐾 Desktop Buddy (`my-desktop-buddy`)

<div align="center">

<h3>✨ Your Adorable AI Desktop Companions & Productivity Pets ✨</h3>

<p>
  <strong>Hammy the Hamster</strong> 🐹 &bull; <strong>Bambu the Panda</strong> 🐼
</p>

[![Next.js 15](https://img.shields.io/badge/Next.js-15.x-black?style=flat&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Electron](https://img.shields.io/badge/Electron-33-47848F?style=flat&logo=electron)](https://www.electronjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

---

## 🌟 What is Desktop Buddy?

**Desktop Buddy** is a delightful, open-source AI desktop companion that floats on your screen as a responsive animated character. Whether you need a focus partner, an encouraging voice, an AI assistant to answer questions, or simply an adorable buddy munching snacks by your side while you work, Desktop Buddy is here for you!

```
       🐹 Hammy the Hamster                  🐼 Bambu the Panda
   "Squeak! Let's build together!"        "Peaceful focus mode on! 🎋"
        [🌻 Sunflower Seeds]                   [🎋 Fresh Bamboo]
```

---

## 🐾 Meet the Buddies

| Buddy | Character | Snack | Personality & Vibe |
| :--- | :--- | :--- | :--- |
| 🐹 **Hammy** | Golden Hamster | 🌻 Sunflower Seeds | Energetic, cheerful, celebratory, and always ready to cheer you on! |
| 🐼 **Bambu** | Kawaii Panda | 🎋 Fresh Bamboo | Calm, peaceful, zen, mindful, and loves cozy focus sessions. |

> 💡 **Extensible Buddy System**: Each character lives in its own folder with its own `.tsx` sprite and `.css` animation engine. You can customize colors, names, and themes anytime!

---

## ✨ Features

- 💬 **Intelligent AI Companion**: Chat naturally using Google Gemini (Free Tier supported), DeepSeek, or local Ollama.
- 🎙️ **Voice Interaction (Tap to Talk)**: Talk directly to your buddy with real-time speech recognition and voice replies.
- 🍎 **Interactive Care & Play**:
  - **Single Click**: Pet your buddy to trigger happiness hearts and cheerful animations.
  - **Double Click**: Feed your buddy their favorite snack (Sunflower seeds for Hammy, fresh crunchy bamboo for Bambu).
  - **Click & Drag**: Pick up and move your buddy anywhere across your desktop.
- 🪟 **3 Window Modes**:
  1. **🐾 Pet / Small Mode**: Floating transparent widget with speech bubble and quick toolbar.
  2. **💬 Compact Sidebar Mode**: Sleek side panel with chat, tasks, and settings.
  3. **🖥️ Dashboard Workspace Mode**: Full productivity workspace with co-pilot sidebar and task management.
- 🔒 **Privacy-First (LocalStorage BYOK)**:
  - Your API keys are saved exclusively in your browser's `LocalStorage`.
  - Keys are sent directly with your requests and **never permanently stored on the server**.
  - One-click **"🗑️ Clear Keys"** button to instantly wipe credentials on shared devices.

---

## 🚀 Quick Start Guide (For Everyone!)

### Step 1: Install Prerequisites
Make sure you have:
- [Node.js](https://nodejs.org/) (version 18 or newer)
- [Python](https://www.python.org/) (version 3.10 or newer)

### Step 2: Clone and Start
Open your Terminal (macOS/Linux) or Command Prompt (Windows) and run:

```bash
# 1. Clone the repository
git clone https://github.com/swapnilxi/my-desktop-buddy.git
cd my-desktop-buddy

# 2. Run the 1-click startup script
./startup.sh
```

- 🌐 **Web Interface**: Open [http://localhost:3000](http://localhost:3000)
- 🔌 **Backend API**: Running on [http://localhost:8000](http://localhost:8000)

---

## 🔑 How to Get a Free AI API Key (30 Seconds)

You can use Desktop Buddy with **Google Gemini 2.5 Flash for free**:

1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Click **"Get API Key"** and create a free key.
3. In Desktop Buddy, click the **⚙️ Config** tab.
4. Paste your key into **Gemini API Key** and click **💾 Save Configuration**.
5. *Done! Your key is saved locally in your browser and your buddy will start talking!*

---

## 🎮 How to Switch Buddies & Customize

1. **Quick Switch**: Click the **🐼 / 🐹 button** in the floating toolbar to toggle between Hammy and Bambu instantly.
2. **In Config Panel**:
   - Go to **⚙️ Config**.
   - Click the buddy card you want (🐹 Hamster or 🐼 Panda).
   - Choose a custom name (e.g. *Nibbles*, *Pan-Pan*, *Bambu*).
   - Pick from 8 signature color themes!

---

## 📁 Modular Project Structure

```
my-desktop-buddy/
├── frontend/                     # Next.js 15 Web & Desktop Interface
│   └── src/
│       ├── app/                  # Main page, multi-mode controller, layout
│       ├── components/
│       │   ├── Buddies/          # 🐾 Multi-Buddy Engine
│       │   │   ├── types.ts      # Shared Buddy interfaces & mood definitions
│       │   │   ├── registry.ts   # Character definitions & color palettes
│       │   │   ├── BuddyRenderer.tsx # Unified character switcher component
│       │   │   ├── Hamster/      # 🐹 Hamster Character Module
│       │   │   │   ├── HamsterSprite.tsx
│       │   │   │   └── hamster.css
│       │   │   └── Panda/        # 🐼 Panda Character Module
│       │   │       ├── PandaSprite.tsx
│       │   │       └── panda.css
│       │   ├── Chat/             # AI chat conversation panel
│       │   ├── TodoList/         # Productivity tasks & checklists
│       │   └── Config/           # Multi-buddy & API keys configuration
│       └── lib/
│           ├── api.ts            # LocalStorage key manager & typed API client
│           └── speech.ts         # TTS voice synthesis engine
│
├── backend/                      # FastAPI Python Backend
│   ├── main.py                   # App lifecycle, CORS, routing
│   ├── context.py                # Buddy persona injection (Hamster vs Panda)
│   ├── config_manager.py         # Config schema & .env fallbacks
│   ├── routes/
│   │   ├── chat.py               # AI Chat & greeting generator
│   │   ├── todos.py              # Todo CRUD routes
│   │   ├── config.py             # Safe configuration endpoints
│   │   └── voice.py              # STT transcription & TTS audio
│   └── llm/
│       ├── router.py             # Multi-provider router with fallback
│       ├── gemini_adapter.py     # Google Gemini SDK adapter
│       └── deepseek_adapter.py   # DeepSeek OpenAI-compatible adapter
│
├── electron-desktop/             # Optional native desktop wrapper
├── startup.sh                    # 1-click launcher for frontend + backend
└── .env.example                  # Server-level environment template
```

---

## 🛠️ Adding a New Buddy (For Developers)

Creating a new character is clean and modular:

1. Create a folder in `frontend/src/components/Buddies/<YourBuddyName>/`.
2. Add your sprite component (`<YourBuddyName>Sprite.tsx`) implementing `BuddySpriteProps`.
3. Add your styles and animations (`<yourbuddy>.css`).
4. Register your character in `frontend/src/components/Buddies/registry.ts`.
5. Add the persona in `backend/context.py`.

---

## 🖐️ Little Krishna — Hand & Finger Orientation Architecture

The Little Krishna character implements a strict **Canonical Master Hand Architecture**:

- **Canonical Hand Identity**: Krishna's anatomical `rightHand` is always rendered on the **viewer's left side** when front-facing; `leftHand` is rendered on the **viewer's right side**.
- **Chakra Hand**: The Sudarshan Chakra is held/spun by Krishna's **anatomical RIGHT hand** (`rightHand`) on the viewer-left side, aligned on the **RIGHT INDEX FINGER**.
- **Invariant Semantic Finger IDs**: Every hand maintains permanent semantic IDs (`thumb`, `index`, `middle`, `ring`, `little`) that never change or reverse.
- **Anatomical Local Coordinate System**:
  - `MasterHand` (Canonical Right Hand) defines digits from `-X` to `+X`: `LITTLE (-X) → RING → MIDDLE → INDEX → THUMB (+X)`.
  - Thenar mass is on the Thumb (`+X`) side, Hypothenar mass is on the Little finger (`-X`) side.
  - `leftHand` is created by horizontally mirroring the complete hand coordinate system (`transform="scale(-1, 1)"`).
  - Front-facing visual screen order & reference alignment:
    - **Krishna Right Hand (Viewer Left)**: When raised holding the Sudarshan Chakra, the **THUMB** is positioned on the inner/medial side (facing Krishna's hair/head), the **INDEX** finger points straight up under the Chakra hub, and the **MIDDLE**, **RING**, and **LITTLE** fingers curl down on the outer side.
    - **Krishna Left Hand (Viewer Right)**: **THUMB** is on the inner/medial side (towards waist/body center), with remaining fingers extending toward the outer hip.
- **Invariant Base Measurements**: Both hands share identical master measurements (Middle: 34, Index: 31, Ring: 30, Thumb: 27, Little: 25). Poses change joint rotations only, never component identities or hand scaling.

---

## 🔒 Security & Privacy

- **No Remote Credential Storage**: User API keys are stored in client `LocalStorage` and passed per-request.
- **Server `.env` Fallback**: Hosts can optionally configure default server keys in `.env` without exposing them to public clients.

---

## 📄 License

Distributed under the **MIT License**. Free for personal and educational use.

<div align="center">
  <sub>Built with 💖 for developers, creators, and cute desktop pet lovers everywhere.</sub>
</div>
