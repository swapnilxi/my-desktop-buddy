'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import HamsterSprite from '@/components/Hamster/HamsterSprite';
import ChatPanel from '@/components/Chat/ChatPanel';
import TodoPanel from '@/components/TodoList/TodoPanel';
import ConfigPanel from '@/components/Config/ConfigPanel';
import SpeechTrainingPanel from '@/components/SpeechTraining/SpeechTrainingPanel';
import { checkHealth, fetchGreeting } from '@/lib/api';
import type { HamsterMood } from '@/lib/api';

type TabId = 'chat' | 'todo' | 'config' | 'speech';

interface Tab {
  id: TabId;
  emoji: string;
  label: string;
}

const TABS: Tab[] = [
  { id: 'chat', emoji: '💬', label: 'Chat' },
  { id: 'todo', emoji: '✅', label: 'To-Do' },
  { id: 'config', emoji: '⚙️', label: 'Config' },
  { id: 'speech', emoji: '🎤', label: 'Speech' },
];

const LOCAL_GREETINGS = [
  "Squeak! Let's code together! 🚀",
  "Crunching sunflower seeds! 🌻",
  "You've got this! ✨",
  "Whiskers twitching with ideas! 🐾",
  "Watching you build! 💻",
  "Need a quick stretch? 🧘",
  "Your code looks awesome! 🐹",
  "Tiny hamster, big dreams! 🌟",
  "Always in your corner! 💛",
  "Ready when you are! ⚡",
];

export default function Home() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('chat');
  const [hamsterMood, setHamsterMood] = useState<HamsterMood>('idle');
  const [hamsterColor, setHamsterColor] = useState('#F4A460');
  const [hamsterName, setHamsterName] = useState('Hammy');
  const [hamsterGreeting, setHamsterGreeting] = useState("Squeak! Let's build together! 🚀");
  const [backendOnline, setBackendOnline] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Drag tracking refs
  const dragStartPos = useRef({ x: 0, y: 0 });
  const isPointerDown = useRef(false);
  const hasMoved = useRef(false);

  const checkBackend = useCallback(async () => {
    try {
      await checkHealth();
      setBackendOnline(true);
    } catch {
      setBackendOnline(false);
    }
  }, []);

  const refreshGreeting = useCallback(async () => {
    try {
      const res = await fetchGreeting();
      if (res?.greeting) {
        setHamsterGreeting(res.greeting);
        return;
      }
    } catch {}
    // Fallback to random local greeting
    const randomG = LOCAL_GREETINGS[Math.floor(Math.random() * LOCAL_GREETINGS.length)];
    setHamsterGreeting(randomG);
  }, []);

  useEffect(() => {
    checkBackend();
    refreshGreeting();
    const interval = setInterval(checkBackend, 30000);
    const greetingInterval = setInterval(refreshGreeting, 45000);
    return () => {
      clearInterval(interval);
      clearInterval(greetingInterval);
    };
  }, [checkBackend, refreshGreeting]);

  // Window control helpers
  const handleClose = () => {
    if (typeof window !== 'undefined' && window.hamsterDesk?.window) {
      window.hamsterDesk.window.close();
    } else {
      setIsExpanded(false);
    }
  };

  const handleQuit = () => {
    if (typeof window !== 'undefined' && window.hamsterDesk?.window) {
      window.hamsterDesk.window.quit();
    } else {
      setIsExpanded(false);
    }
  };

  const handleMinimize = () => {
    if (typeof window !== 'undefined' && window.hamsterDesk?.window) {
      window.hamsterDesk.window.minimize();
    } else {
      setIsExpanded(false);
    }
  };

  const setWindowMode = (expanded: boolean, targetTab?: TabId) => {
    if (targetTab) {
      setActiveTab(targetTab);
    }
    setIsExpanded(expanded);
    if (typeof window !== 'undefined' && window.hamsterDesk?.window) {
      window.hamsterDesk.window.setMode(expanded ? 'expanded' : 'compact');
    }
  };

  const petHamster = () => {
    setHamsterMood('happy');
    refreshGreeting();
    setTimeout(() => {
      setHamsterMood('idle');
    }, 2800);
  };

  const handleTapToTalk = () => {
    if (!isListening) {
      setIsListening(true);
      setHamsterMood('listening');
      // Auto open chat after listening
      setTimeout(() => {
        setIsListening(false);
        setWindowMode(true, 'chat');
        setHamsterMood('thinking');
        setTimeout(() => setHamsterMood('idle'), 2500);
      }, 2000);
    } else {
      setIsListening(false);
      setHamsterMood('idle');
    }
  };

  const handleMoodChange = (mood: HamsterMood) => {
    setHamsterMood(mood);
  };

  // ── Pointer Drag Handler for Smooth Window Movement ─────────────
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button')) return;

    isPointerDown.current = true;
    hasMoved.current = false;
    dragStartPos.current = { x: e.screenX, y: e.screenY };

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPointerDown.current) return;

    const deltaX = e.screenX - dragStartPos.current.x;
    const deltaY = e.screenY - dragStartPos.current.y;

    if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
      if (!hasMoved.current) {
        hasMoved.current = true;
        setIsDragging(true);
      }
      dragStartPos.current = { x: e.screenX, y: e.screenY };

      if (typeof window !== 'undefined' && window.hamsterDesk?.window?.moveBy) {
        window.hamsterDesk.window.moveBy(Math.round(deltaX), Math.round(deltaY));
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isPointerDown.current) return;
    isPointerDown.current = false;
    setIsDragging(false);

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    if (!hasMoved.current) {
      // Tap without dragging -> Pet Hammy!
      petHamster();
    }
  };

  // ── Mode 1: Compact Floating Pet Widget ─────────────────────────
  if (!isExpanded) {
    return (
      <div
        className={`compact-widget ${isDragging ? 'dragging-active' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Subtle Top Control Buttons: Hide & Quit */}
        <div className="compact-top-bar" onPointerDown={(e) => e.stopPropagation()}>
          <div className="compact-top-controls">
            <button
              className="compact-control-btn compact-hide-btn"
              onClick={handleMinimize}
              title="Minimize to Dock"
            >
              −
            </button>
            <button
              className="compact-control-btn compact-close-btn"
              onClick={handleQuit}
              title="Quit Hammy"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Floating Hammy with on-body drag badge & AI greeting speech bubble */}
        <div
          className="compact-hamster-area"
          title="Click to pet Hammy, drag to move!"
        >
          <HamsterSprite
            mood={hamsterMood}
            color={hamsterColor}
            name={hamsterName}
            greeting={hamsterGreeting}
            isDragging={isDragging}
            onRefreshGreeting={refreshGreeting}
          />
        </div>

        {/* Floating Quick Icon Toolbar */}
        <div className="floating-controls" onPointerDown={(e) => e.stopPropagation()}>
          {/* Tap to Talk */}
          <button
            className={`floating-btn btn-mic ${isListening ? 'listening' : ''}`}
            onClick={handleTapToTalk}
            title={isListening ? 'Listening...' : 'Tap to Talk'}
          >
            {isListening ? '🔴' : '🎙️'}
          </button>
          {/* Open Chat Window */}
          <button
            className="floating-btn"
            onClick={() => setWindowMode(true, 'chat')}
            title="Open Chat with Hammy"
          >
            💬
          </button>
          {/* Open Tasks */}
          <button
            className="floating-btn"
            onClick={() => setWindowMode(true, 'todo')}
            title="Tasks & Goals"
          >
            ✅
          </button>
          {/* Settings */}
          <button
            className="floating-btn"
            onClick={() => setWindowMode(true, 'config')}
            title="Appearance & Settings"
          >
            ⚙️
          </button>
        </div>
      </div>
    );
  }

  // ── Mode 2: Full Expanded Window ─────────────────────────────────
  return (
    <div className="app-container">
      {/* Window Header with Drag Area & Controls */}
      <header
        className="app-header"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="app-title-area">
          <span className="app-drag-dots">⋮⋮</span>
          <span>🐹</span>
          <span>{hamsterName}</span>
          <span className={`status-dot ${backendOnline ? 'online' : 'offline'}`} />
        </div>

        <div className="window-controls" onPointerDown={(e) => e.stopPropagation()}>
          <button
            className="win-btn collapse"
            onClick={() => setWindowMode(false)}
            title="Collapse to pet widget"
          >
            ▾
          </button>
          <button
            className="win-btn"
            onClick={handleMinimize}
            title="Minimize"
          >
            −
          </button>
          <button
            className="win-btn close"
            onClick={handleClose}
            title="Close / Hide"
          >
            ✕
          </button>
          <button
            className="win-btn"
            onClick={handleQuit}
            title="Quit Hammy completely"
            style={{ fontSize: '10px' }}
          >
            ⏻
          </button>
        </div>
      </header>

      {/* Hamster Character (Click to pet) */}
      <div className="hamster-section">
        <HamsterSprite
          mood={hamsterMood}
          color={hamsterColor}
          name={hamsterName}
          greeting={hamsterGreeting}
          onClick={petHamster}
          onRefreshGreeting={refreshGreeting}
        />
      </div>

      {/* Tab Navigation */}
      <nav className="tab-nav">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-emoji">{tab.emoji}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab Content */}
      <main className="tab-content">
        {activeTab === 'chat' && (
          <ChatPanel onMoodChange={handleMoodChange} />
        )}
        {activeTab === 'todo' && (
          <TodoPanel onMoodChange={handleMoodChange} />
        )}
        {activeTab === 'config' && (
          <ConfigPanel
            onColorChange={setHamsterColor}
            onNameChange={setHamsterName}
          />
        )}
        {activeTab === 'speech' && (
          <SpeechTrainingPanel />
        )}
      </main>

      {/* Status Bar */}
      <div className="status-bar">
        <span>
          <span className={`status-dot ${backendOnline ? 'online' : 'offline'}`} />
          {backendOnline ? 'Backend connected' : 'Backend offline'}
        </span>
        <button
          onClick={() => setWindowMode(false)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--accent-primary)',
            cursor: 'pointer',
            fontSize: '11px',
          }}
        >
          ▾ Collapse to Widget
        </button>
      </div>
    </div>
  );
}
