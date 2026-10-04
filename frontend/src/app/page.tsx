'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import BuddyRenderer from '@/components/Buddies/BuddyRenderer';
import KrishnaControls from '@/components/Buddies/Krishna/KrishnaControls';
import type { KrishnaState } from '@/components/Buddies/Krishna/KrishnaSprite';
import ResizeHandles from '@/components/Window/ResizeHandles';
import ChatPanel from '@/components/Chat/ChatPanel';
import TodoPanel from '@/components/TodoList/TodoPanel';
import ConfigPanel from '@/components/Config/ConfigPanel';
import SpeechTrainingPanel from '@/components/SpeechTraining/SpeechTrainingPanel';
import { checkHealth, fetchGreeting, sendChatMessage, getClientSavedConfig, saveClientSavedConfig } from '@/lib/api';
import type { AppConfig, HamsterMood } from '@/lib/api';
import { speak } from '@/lib/speech';
import { useVoiceRecorder } from '@/lib/useVoiceRecorder';
import { BUDDY_REGISTRY, getBuddyDefinition } from '@/components/Buddies/registry';
import type { BuddyType } from '@/components/Buddies/types';
import { useFocusTimer } from '@/lib/useFocusTimer';
import { useHasNativeWindow, useNativeWindowSync } from '@/lib/useNativeWindow';

export type WindowMode = 'pet' | 'compact' | 'fullscreen';
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

// Idle variety sub-animations that cycle randomly
const IDLE_VARIETIES: HamsterMood[] = ['idle', 'waving', 'idle', 'idle', 'idle'];

const FillScreenIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
    <path d="M1 4V1h3M8 1h3v3M11 8v3H8M4 11H1V8" fill="none" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);

const RestoreSizeIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
    <path d="M1 4h3V1M8 1v3h3M11 8H8v3M4 11V8H1" fill="none" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);

function updateFavicon(emoji: string) {
  if (typeof document === 'undefined') return;
  try {
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${emoji}</text></svg>`;
    link.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  } catch { }
}

export default function Home() {
  const [windowMode, setWindowModeState] = useState<WindowMode>('pet');
  const [activeTab, setActiveTab] = useState<TabId>('chat');
  const [buddyType, setBuddyType] = useState<BuddyType>('hamster');
  const [hamsterMood, setHamsterMood] = useState<HamsterMood>('idle');
  const [hamsterColor, setHamsterColor] = useState('#F4A460');
  const [hamsterName, setHamsterName] = useState('Hammy');
  const [krishnaPose, setKrishnaPose] = useState<'crossed' | 'chakra'>('chakra');
  const [hamsterGreeting, setHamsterGreeting] = useState("Squeak! Let's build together! 🚀");
  const [backendOnline, setBackendOnline] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [petStreak, setPetStreak] = useState(0);
  const [isFlutePlaying, setIsFlutePlaying] = useState(false);
  // null = Auto: Krishna follows the app's mood; otherwise a state the user pinned.
  const [krishnaState, setKrishnaState] = useState<KrishnaState | null>(null);
  const [petMenuOpen, setPetMenuOpen] = useState(false);
  const [buddyCollapsed, setBuddyCollapsed] = useState(false);

  const hasNativeWindow = useHasNativeWindow();
  const { maximized, toggleMaximize } = useNativeWindowSync(windowMode, setWindowModeState);

  // Close the Buddy-mode "more" menu on any outside press (capture phase, since the
  // sprites stop propagation) or on Escape.
  useEffect(() => {
    if (!petMenuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!(e.target as HTMLElement | null)?.closest?.('.floating-more')) setPetMenuOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPetMenuOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [petMenuOpen]);

  const toggleFlute = useCallback(() => {
    const audio = document.getElementById('flute-bg-music') as HTMLAudioElement;
    if (audio) {
      if (audio.paused) {
        audio.play().catch(console.error);
        setIsFlutePlaying(true);
      } else {
        audio.pause();
        setIsFlutePlaying(false);
      }
    }
  }, []);

  // Drag tracking refs
  const dragStartPos = useRef({ x: 0, y: 0 });
  const isPointerDown = useRef(false);
  const hasMoved = useRef(false);
  const petStreakTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastClickTime = useRef(0);

  const currentBuddyDef = getBuddyDefinition(buddyType);

  // Synchronize document title, favicon, and electron tray/dock when buddy changes
  useEffect(() => {
    const title = `${currentBuddyDef.emoji} ${hamsterName} — Desktop Buddy`;
    document.title = title;
    updateFavicon(currentBuddyDef.emoji);

    if (typeof window !== 'undefined' && window.hamsterDesk?.window?.updateBuddy) {
      window.hamsterDesk.window.updateBuddy({
        type: buddyType,
        name: hamsterName,
        emoji: currentBuddyDef.emoji,
      });
    }
  }, [buddyType, hamsterName, currentBuddyDef.emoji]);

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
    } catch { }
    const greetings = currentBuddyDef.greetings;
    const randomG = greetings[Math.floor(Math.random() * greetings.length)];
    setHamsterGreeting(randomG);
  }, [currentBuddyDef.greetings]);

  useEffect(() => {
    // Load local client preferences
    const saved = getClientSavedConfig();
    if (saved?.hamster?.buddy_type && ['hamster', 'panda', 'krishna'].includes(saved.hamster.buddy_type)) {
      setBuddyType(saved.hamster.buddy_type as BuddyType);
    }
    if (saved?.hamster?.color) setHamsterColor(saved.hamster.color);
    if (saved?.hamster?.name) setHamsterName(saved.hamster.name);
    if (saved?.hamster?.pose && ['crossed', 'chakra', 'standing'].includes(saved.hamster.pose)) {
      setKrishnaPose(saved.hamster.pose === 'crossed' ? 'crossed' : 'chakra');
    } else {
      setKrishnaPose('chakra');
    }
    if (saved?.startup?.default_tab && ['chat', 'todo', 'config', 'speech'].includes(saved.startup.default_tab)) {
      setActiveTab(saved.startup.default_tab as TabId);
    }

    checkBackend();
    refreshGreeting();

    const interval = setInterval(checkBackend, 30000);
    const greetingInterval = setInterval(refreshGreeting, 45000);

    // Idle variety cycling — occasionally do a micro-animation
    const idleVarietyInterval = setInterval(() => {
      setHamsterMood((current) => {
        if (current !== 'idle') return current; // don't interrupt active moods
        const variety = IDLE_VARIETIES[Math.floor(Math.random() * IDLE_VARIETIES.length)];
        if (variety !== 'idle') {
          setTimeout(() => setHamsterMood('idle'), 3000);
        }
        return variety;
      });
    }, 120000);

    return () => {
      clearInterval(interval);
      clearInterval(greetingInterval);
      clearInterval(idleVarietyInterval);
    };
  }, [checkBackend, refreshGreeting]);

  // Window control helpers (useNativeWindowSync resizes the native window to match)
  const setWindowMode = (mode: WindowMode, targetTab?: TabId) => {
    if (targetTab) {
      setActiveTab(targetTab);
    }
    setPetMenuOpen(false);
    setWindowModeState(mode);
  };

  const changeKrishnaPose = (pose: 'crossed' | 'chakra') => {
    setKrishnaPose(pose);
    const saved: Partial<AppConfig> = getClientSavedConfig() || {};
    saveClientSavedConfig({ ...saved, hamster: { ...saved.hamster, pose } } as AppConfig);
  };

  const handleMinimize = () => {
    if (typeof window !== 'undefined' && window.hamsterDesk?.window) {
      window.hamsterDesk.window.minimize();
    }
  };

  const handleClose = () => {
    if (typeof window !== 'undefined' && window.hamsterDesk?.window) {
      window.hamsterDesk.window.close();
    } else {
      setWindowMode('pet');
    }
  };

  const handleQuit = () => {
    if (typeof window !== 'undefined' && window.hamsterDesk?.window) {
      window.hamsterDesk.window.quit();
    } else {
      setWindowMode('pet');
    }
  };

  const petHamster = () => {
    // Track petting streak
    setPetStreak((prev) => prev + 1);
    if (petStreakTimer.current) clearTimeout(petStreakTimer.current);
    petStreakTimer.current = setTimeout(() => setPetStreak(0), 10000);

    setHamsterMood('happy');
    refreshGreeting();
    setTimeout(() => {
      setHamsterMood('idle');
    }, 2800);
  };

  const feedHamster = () => {
    setHamsterMood('eating');
    setHamsterGreeting(currentBuddyDef.eatMessage);
    setTimeout(() => {
      setHamsterMood('happy');
      setHamsterGreeting(currentBuddyDef.fullMessage);
      setTimeout(() => setHamsterMood('idle'), 2200);
    }, 3000);
  };

  const BUDDY_CYCLE: BuddyType[] = ['hamster', 'panda', 'krishna'];
  const nextBuddyType = BUDDY_CYCLE[(BUDDY_CYCLE.indexOf(buddyType) + 1) % BUDDY_CYCLE.length];
  const nextBuddyDef = BUDDY_REGISTRY[nextBuddyType];

  const switchBuddy = (nextType?: BuddyType) => {
    let targetType = nextType;
    if (!targetType) {
      const currentIndex = BUDDY_CYCLE.indexOf(buddyType);
      const nextIndex = (currentIndex + 1) % BUDDY_CYCLE.length;
      targetType = BUDDY_CYCLE[nextIndex];
    }
    const targetDef = BUDDY_REGISTRY[targetType];
    setBuddyType(targetType);
    setHamsterName(targetDef.defaultName);
    setHamsterColor(targetDef.defaultColor);
    setHamsterGreeting(targetDef.greetings[0]);

    // Save to local storage
    const saved = getClientSavedConfig() || ({} as any);
    saved.hamster = {
      ...(saved.hamster || {}),
      buddy_type: targetType,
      name: targetDef.defaultName,
      color: targetDef.defaultColor,
    };
    saveClientSavedConfig(saved);
  };

  // Tap to Talk: STAYS in Pet mode — records, transcribes,
  // asks the LLM and speaks the reply aloud.
  const handleVoiceTranscribed = useCallback(async (transcript: string) => {
    setHamsterGreeting(`You said: “${transcript}”`);
    setHamsterMood('thinking');
    try {
      const response = await sendChatMessage(transcript, [], false);
      setHamsterGreeting(
        response.response.length > 120 ? response.response.slice(0, 117) + '…' : response.response
      );
      setHamsterMood('speaking');
      speak(response.response, { onEnd: () => setHamsterMood('idle') });
      setTimeout(() => setHamsterMood((m) => (m === 'speaking' ? 'idle' : m)), 20000);
    } catch (err) {
      setHamsterGreeting(err instanceof Error ? `😵 ${err.message}` : '😵 Something went wrong!');
      setHamsterMood('idle');
    }
  }, []);

  const voiceRecorder = useVoiceRecorder({
    onTranscribed: handleVoiceTranscribed,
    onRecordingStart: () => {
      setIsListening(true);
      setHamsterMood('listening');
      setHamsterGreeting('🎙️ Listening… speak now!');
    },
    onRecordingStop: () => setIsListening(false),
    onTranscribingStart: () => {
      setHamsterMood('thinking');
      setHamsterGreeting('🤔 Understanding…');
    },
  });

  // Show recorder errors in speech bubble
  useEffect(() => {
    if (voiceRecorder.error) {
      setHamsterGreeting(`🎤 ${voiceRecorder.error}`);
      setHamsterMood('idle');
    }
  }, [voiceRecorder.error]);

  const handleTapToTalk = () => {
    voiceRecorder.toggle();
  };

  const handleMoodChange = useCallback((mood: HamsterMood) => {
    setHamsterMood(mood);
  }, []);

  const timer = useFocusTimer({ onMoodChange: handleMoodChange });

  const formatTimerDigits = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ── Pointer Drag Handler for Smooth Window Movement ─────────────
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button, select, input, textarea')) return;

    isPointerDown.current = true;
    hasMoved.current = false;
    dragStartPos.current = { x: e.screenX, y: e.screenY };

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch { }
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
    } catch { }

    if (!hasMoved.current) {
      const now = Date.now();
      if (now - lastClickTime.current < 400) {
        // Double-click → feed
        feedHamster();
        lastClickTime.current = 0;
      } else {
        lastClickTime.current = now;
        setTimeout(() => {
          if (lastClickTime.current !== 0) {
            petHamster();
          }
        }, 420);
      }
    }
  };

  // Header drag in Sidebar / Dashboard: moves the window, never pets the buddy.
  const handleHeaderPointerUp = (e: React.PointerEvent) => {
    if (!isPointerDown.current) return;
    isPointerDown.current = false;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch { }
  };

  // Double-clicking an empty part of a header toggles "fill screen".
  const handleHeaderDoubleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    toggleMaximize();
  };

  const headerDragProps = {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handleHeaderPointerUp,
    onDoubleClick: handleHeaderDoubleClick,
  };

  const fillScreenButton = hasNativeWindow && (
    <button
      className="win-btn collapse"
      onClick={toggleMaximize}
      title={maximized ? 'Restore size' : windowMode === 'compact' ? 'Fill screen height' : 'Fill screen'}
      aria-label={maximized ? 'Restore size' : 'Fill screen'}
    >
      {maximized ? <RestoreSizeIcon /> : <FillScreenIcon />}
    </button>
  );

  // Small Krishna + mood/pose picker, used in Sidebar and Dashboard. The greeting is shown
  // as a caption instead of the sprite's wide speech bubble, which would be clipped here.
  const renderKrishnaStage = (layout: 'row' | 'column') => (
    <div className={`krishna-stage ${layout}`}>
      <div className="krishna-stage-sprite">
        <BuddyRenderer
          type="krishna"
          size="sm"
          krishnaState={krishnaState ?? undefined}
          mood={hamsterMood}
          pose={krishnaPose}
          name={hamsterName}
          greeting=""
          isDragging={isDragging}
          petStreak={petStreak}
          onClick={petHamster}
          onRefreshGreeting={refreshGreeting}
          onFeed={feedHamster}
        />
      </div>
      <KrishnaControls
        state={krishnaState}
        pose={krishnaPose}
        caption={hamsterGreeting}
        flutePlaying={isFlutePlaying}
        onStateChange={setKrishnaState}
        onPoseChange={changeKrishnaPose}
        // The dashboard keeps its Flute tab; the narrow sidebar gets the toggle here.
        onToggleFlute={layout === 'row' ? toggleFlute : undefined}
      />
    </div>
  );

  // ── MODE 1: PET / SMALL MODE (Floating Desktop Buddy Widget) ──────
  if (windowMode === 'pet') {
    return (
      <div
        className={`compact-widget ${isDragging ? 'dragging-active' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Top Controls: Hide & Quit */}
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
              title={`Quit ${hamsterName}`}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Floating Buddy with on-body drag badge & AI greeting speech bubble */}
        <div
          className="compact-hamster-area"
          title={`Click to pet ${hamsterName}, double-click to feed ${currentBuddyDef.snackEmoji}, drag to move!`}
        >
          <BuddyRenderer
            type={buddyType}
            mood={hamsterMood}
            pose={buddyType === 'krishna' ? krishnaPose : undefined}
            krishnaState={buddyType === 'krishna' ? krishnaState ?? undefined : undefined}
            color={hamsterColor}
            name={hamsterName}
            greeting={hamsterGreeting}
            isDragging={isDragging}
            petStreak={petStreak}
            onRefreshGreeting={refreshGreeting}
            onFeed={feedHamster}
          />
        </div>

        {/* Floating Focus Timer Chip in Pet Mode (active when timer running or in progress) */}
        {(timer.isRunning || (timer.timeLeft > 0 && timer.timeLeft < timer.totalSeconds) || timer.sessionCompleted) && (
          <div
            className={`pet-timer-chip ${timer.isRunning ? 'timer-running' : ''} ${timer.sessionType === 'break' ? 'mode-break' : ''}`}
            onClick={() => setWindowMode('compact', 'todo')}
            onPointerDown={(e) => e.stopPropagation()}
            title="Click to open To-Do & Focus Timer controls"
          >
            <span className="pet-timer-icon">
              {timer.sessionType === 'break' ? '☕' : timer.isRunning ? '🔥' : '⏱️'}
            </span>
            <span className="pet-timer-digits">{formatTimerDigits(timer.timeLeft)}</span>
            {timer.currentActivity && (
              <span className="pet-timer-task-label" title={timer.currentActivity}>
                {timer.currentActivity}
              </span>
            )}
            <span className="pet-timer-arrow">›</span>
          </div>
        )}

        {/* Floating Quick Icon Toolbar */}
        <div className="floating-controls" onPointerDown={(e) => e.stopPropagation()}>
          {/* Quick Buddy Switcher */}
          <button
            className="floating-btn"
            onClick={() => switchBuddy()}
            title={`Switch Buddy (Next: ${nextBuddyDef.emoji} ${nextBuddyDef.name})`}
          >
            {nextBuddyDef.emoji}
          </button>
          {buddyType === 'krishna' && (
            <button
              className="floating-btn"
              onClick={toggleFlute}
              title={isFlutePlaying ? "Pause Flute Music" : "Play Flute Music"}
            >
              {isFlutePlaying ? '🎶' : '🪈'}
            </button>
          )}
          {/* Tap to Talk — Stays in Pet Mode! */}
          <button
            className={`floating-btn btn-mic ${isListening ? 'listening' : ''}`}
            onClick={handleTapToTalk}
            title={isListening ? 'Listening...' : 'Tap to Talk (Stays in Pet Mode)'}
          >
            {isListening ? '🔴' : '🎙️'}
          </button>
          {/* Sidebar Mode (chat) */}
          <button
            className="floating-btn"
            onClick={() => setWindowMode('compact', 'chat')}
            title="Sidebar Mode — Chat"
          >
            💬
          </button>
          {/* Full Dashboard */}
          <button
            className="floating-btn"
            onClick={() => setWindowMode('fullscreen')}
            title="Dashboard Mode"
          >
            🖥️
          </button>
          {/* Everything else lives in a small menu so the pill fits the 340px window */}
          <div className="floating-more">
            <button
              className={`floating-btn ${petMenuOpen ? 'active' : ''}`}
              onClick={() => setPetMenuOpen((open) => !open)}
              title="More"
              aria-haspopup="menu"
              aria-expanded={petMenuOpen}
            >
              ⋯
            </button>
            {petMenuOpen && (
              <div className="floating-menu" role="menu">
                <button role="menuitem" onClick={() => setWindowMode('compact', 'todo')}>✅ Tasks &amp; focus timer</button>
                <button role="menuitem" onClick={() => setWindowMode('compact', 'speech')}>🎤 Speech training</button>
                <button role="menuitem" onClick={() => setWindowMode('compact', 'config')}>⚙️ Settings</button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── MODE 2: COMPACT / SIDEBAR MODE (Floating Sidebar Panel) ──────
  if (windowMode === 'compact') {
    return (
      <div className={`app-container compact-sidebar-container ${maximized ? 'is-maximized' : ''}`}>
        <ResizeHandles />
        {/* Window Header with Drag Area & Mode Switchers */}
        <header className="app-header" {...headerDragProps}>
          <div className="app-title-area">
            <span className="app-drag-dots">⋮⋮</span>
            <span>{currentBuddyDef.emoji}</span>
            <span>{hamsterName}</span>
            <span className={`status-dot ${backendOnline ? 'online' : 'offline'}`} />
          </div>

          <div className="window-controls" onPointerDown={(e) => e.stopPropagation()}>
            {/* Quick Buddy Switcher */}
            <button
              className="win-btn collapse"
              onClick={() => switchBuddy()}
              title={`Switch Buddy (Next: ${nextBuddyDef.emoji} ${nextBuddyDef.name})`}
            >
              {nextBuddyDef.emoji}
            </button>
            <button
              className="win-btn collapse"
              onClick={() => setBuddyCollapsed((c) => !c)}
              title={buddyCollapsed ? `Show ${hamsterName}` : `Hide ${hamsterName} (more room)`}
              aria-pressed={buddyCollapsed}
            >
              {buddyCollapsed ? '▾' : '▴'}
            </button>
            {/* Mode Switchers */}
            <button
              className="win-btn collapse"
              onClick={() => setWindowMode('fullscreen')}
              title="Dashboard Mode"
            >
              🖥️
            </button>
            <button
              className="win-btn collapse"
              onClick={() => setWindowMode('pet')}
              title="Buddy Mode"
            >
              🐾
            </button>
            {fillScreenButton}
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
          </div>
        </header>

        {/* Buddy Character */}
        {!buddyCollapsed && (
          <div className="hamster-section">
            {buddyType === 'krishna' ? (
              renderKrishnaStage('row')
            ) : (
              <BuddyRenderer
                type={buddyType}
                mood={hamsterMood}
                color={hamsterColor}
                name={hamsterName}
                greeting={hamsterGreeting}
                onClick={petHamster}
                petStreak={petStreak}
                onRefreshGreeting={refreshGreeting}
                onFeed={feedHamster}
              />
            )}
          </div>
        )}

        {/* Tab Navigation (Krishna's flute toggle lives beside him, keeping 4 tabs that fit) */}
        <nav className="tab-nav">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              title={tab.label}
            >
              <span className="tab-emoji">{tab.emoji}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Tab Content */}
        <main className="tab-content">
          <div style={{ display: activeTab === 'chat' ? 'contents' : 'none' }}>
            <ChatPanel
              onMoodChange={handleMoodChange}
              buddyType={buddyType}
              buddyName={hamsterName}
              buddyDef={currentBuddyDef}
            />
          </div>
          <div style={{ display: activeTab === 'todo' ? 'contents' : 'none' }}>
            <TodoPanel
              onMoodChange={handleMoodChange}
              buddyType={buddyType}
              buddyName={hamsterName}
              buddyDef={currentBuddyDef}
              timer={timer}
            />
          </div>
          <div style={{ display: activeTab === 'config' ? 'contents' : 'none' }}>
            <ConfigPanel
              currentBuddyType={buddyType}
              currentBuddyName={hamsterName}
              currentColor={hamsterColor}
              currentPose={krishnaPose}
              onColorChange={setHamsterColor}
              onNameChange={setHamsterName}
              onBuddyTypeChange={(type) => setBuddyType(type as BuddyType)}
              onPoseChange={(pose) => changeKrishnaPose(pose === 'crossed' ? 'crossed' : 'chakra')}
            />
          </div>
          <div style={{ display: activeTab === 'speech' ? 'contents' : 'none' }}>
            <SpeechTrainingPanel
              onMoodChange={handleMoodChange}
              buddyType={buddyType}
              buddyName={hamsterName}
              buddyDef={currentBuddyDef}
            />
          </div>
        </main>

        {/* Status Bar */}
        <div className="status-bar">
          <span>
            <span className={`status-dot ${backendOnline ? 'online' : 'offline'}`} />
            {backendOnline ? 'Backend connected' : 'Backend offline'}
          </span>
          <span style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setWindowMode('fullscreen')}
              style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '11px' }}
            >
              🖥️ Dashboard
            </button>
            <button
              onClick={() => setWindowMode('pet')}
              style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '11px' }}
            >
              🐾 Buddy Mode
            </button>
          </span>
        </div>
      </div>
    );
  }

  // ── MODE 3: FULL SCREEN / DASHBOARD MODE (Full Productivity App) ─
  return (
    <div className={`dashboard-container ${maximized ? 'is-maximized' : ''}`}>
      <ResizeHandles />
      {/* Co-Pilot Left Sidebar */}
      <aside className="dashboard-copilot-sidebar">
        <div className="copilot-header">
          <span className="copilot-logo">{currentBuddyDef.emoji}</span>
          <span className="copilot-title">Desktop Buddy</span>
        </div>

        {/* Animated Co-Pilot Character */}
        <div className="copilot-pet-box">
          {buddyType === 'krishna' ? (
            renderKrishnaStage('column')
          ) : (
            <BuddyRenderer
              type={buddyType}
              mood={hamsterMood}
              color={hamsterColor}
              name={hamsterName}
              greeting={hamsterGreeting}
              onClick={petHamster}
              petStreak={petStreak}
              onRefreshGreeting={refreshGreeting}
              onFeed={feedHamster}
            />
          )}
        </div>

        {/* Voice Talk Action */}
        <div className="copilot-actions">
          <button
            className={`copilot-talk-btn ${isListening ? 'listening' : ''}`}
            onClick={handleTapToTalk}
          >
            {isListening ? '🔴 Listening...' : '🎙️ Tap to Talk'}
          </button>
        </div>

        {/* Quick Buddy Switcher in Sidebar */}
        <div style={{ padding: '0 16px', marginTop: '6px' }}>
          <button
            onClick={() => switchBuddy()}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '10px',
              border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
              background: 'rgba(255,255,255,0.06)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            Switch to {nextBuddyDef.emoji} {nextBuddyDef.name}
          </button>
        </div>

        {/* Mode Switcher Navigation */}
        <div className="copilot-mode-nav">
          <div className="mode-nav-label">WINDOW MODE</div>
          <div className="mode-nav-row" role="group" aria-label="Window mode">
            <button
              className="mode-nav-btn"
              onClick={() => setWindowMode('pet')}
              title="Buddy Mode"
            >
              <span>🐾</span> Buddy
            </button>
            <button
              className="mode-nav-btn"
              onClick={() => setWindowMode('compact')}
              title="Sidebar Mode"
            >
              <span>💬</span> Sidebar
            </button>
            <button className="mode-nav-btn active" aria-pressed="true" title="Dashboard Mode">
              <span>🖥️</span> Dashboard
            </button>
          </div>
        </div>

        {/* Backend Health Status */}
        <div className="copilot-footer">
          <span className={`status-dot ${backendOnline ? 'online' : 'offline'}`} />
          <span>{backendOnline ? 'FastAPI Connected' : 'Offline'}</span>
        </div>
      </aside>

      {/* Main Workspace Dashboard */}
      <main className="dashboard-main-content">
        {/* Top Header Controls */}
        <header className="dashboard-header" {...headerDragProps}>
          <div className="dashboard-header-title">
            <span className="app-drag-dots">⋮⋮</span>
            <span>Desktop Buddy Productivity Workspace</span>
          </div>

          <div className="dashboard-header-controls" onPointerDown={(e) => e.stopPropagation()}>
            <button
              className="win-btn collapse"
              onClick={() => setWindowMode('compact')}
              title="Collapse to Sidebar Mode"
            >
              💬
            </button>
            <button
              className="win-btn collapse"
              onClick={() => setWindowMode('pet')}
              title="Collapse to Buddy Mode"
            >
              🐾
            </button>
            {fillScreenButton}
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
              title="Close"
            >
              ✕
            </button>
          </div>
        </header>

        {/* Workspace Tab Bar */}
        <nav className="dashboard-tab-bar">
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
          {buddyType === 'krishna' && (
            <button
              className="tab-btn"
              onClick={toggleFlute}
              title={isFlutePlaying ? "Pause Flute Music" : "Play Flute Music"}
            >
              <span className="tab-emoji">{isFlutePlaying ? '🎶' : '🪈'}</span>
              Flute
            </button>
          )}
        </nav>

        {/* Tab View */}
        <div className="dashboard-workspace-body">
          <div style={{ display: activeTab === 'chat' ? 'contents' : 'none' }}>
            <ChatPanel
              onMoodChange={handleMoodChange}
              buddyType={buddyType}
              buddyName={hamsterName}
              buddyDef={currentBuddyDef}
            />
          </div>
          <div style={{ display: activeTab === 'todo' ? 'contents' : 'none' }}>
            <TodoPanel
              onMoodChange={handleMoodChange}
              buddyType={buddyType}
              buddyName={hamsterName}
              buddyDef={currentBuddyDef}
              timer={timer}
            />
          </div>
          <div style={{ display: activeTab === 'config' ? 'contents' : 'none' }}>
            <ConfigPanel
              currentBuddyType={buddyType}
              currentBuddyName={hamsterName}
              currentColor={hamsterColor}
              currentPose={krishnaPose}
              onColorChange={setHamsterColor}
              onNameChange={setHamsterName}
              onBuddyTypeChange={(type) => setBuddyType(type as BuddyType)}
              onPoseChange={(pose) => changeKrishnaPose(pose === 'crossed' ? 'crossed' : 'chakra')}
            />
          </div>
          <div style={{ display: activeTab === 'speech' ? 'contents' : 'none' }}>
            <SpeechTrainingPanel
              onMoodChange={handleMoodChange}
              buddyType={buddyType}
              buddyName={hamsterName}
              buddyDef={currentBuddyDef}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

