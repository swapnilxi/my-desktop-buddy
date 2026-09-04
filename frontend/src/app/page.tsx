'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import BuddyRenderer from '@/components/Buddies/BuddyRenderer';
import ChatPanel from '@/components/Chat/ChatPanel';
import TodoPanel from '@/components/TodoList/TodoPanel';
import ConfigPanel from '@/components/Config/ConfigPanel';
import SpeechTrainingPanel from '@/components/SpeechTraining/SpeechTrainingPanel';
import GitaPanel from '@/components/Krishna/GitaPanel';
import DailyPanel from '@/components/Krishna/DailyPanel';
import { checkHealth, fetchGreeting, getClientSavedConfig, saveClientSavedConfig } from '@/lib/api';
import type { HamsterMood } from '@/lib/api';
import { useVoiceRecorder } from '@/lib/useVoiceRecorder';
import { BUDDY_REGISTRY, getBuddyDefinition } from '@/components/Buddies/registry';
import type { BuddyType } from '@/components/Buddies/types';
import { useFocusTimer } from '@/lib/useFocusTimer';
import { useConversation } from '@/lib/useConversation';
import { ModeSwitcher, WindowControls, MODES } from '@/components/Shell/WindowChrome';
import type { WindowMode } from '@/components/Shell/WindowChrome';
import ConfirmDialog from '@/components/Shell/ConfirmDialog';

export type { WindowMode };
type TabId = 'chat' | 'todo' | 'daily' | 'gita' | 'config' | 'speech';

/** Remembering the mode means a relaunch no longer dumps the user into the widget. */
const MODE_STORAGE_KEY = 'desktop_buddy_window_mode';

interface Tab {
  id: TabId;
  emoji: string;
  label: string;
}

const BASE_TABS: Tab[] = [
  // 🗨️ not 💬: the mode switcher owns 💬 for Sidebar mode, and the same glyph
  // meaning two different things in one window is what made the chrome confusing.
  { id: 'chat', emoji: '🗨️', label: 'Chat' },
  { id: 'todo', emoji: '✅', label: 'To-Do' },
];

/**
 * Companion tabs specific to Krishna. A hamster has no use for a Gita
 * search, so these are appended only for the Krishna buddy.
 */
const KRISHNA_TABS: Tab[] = [
  { id: 'daily', emoji: '🌅', label: 'Today' },
  { id: 'gita', emoji: '📖', label: 'Gita' },
];

const TRAILING_TABS: Tab[] = [
  { id: 'config', emoji: '⚙️', label: 'Config' },
  { id: 'speech', emoji: '🎤', label: 'Speech' },
];

function tabsFor(buddyType: BuddyType | string): Tab[] {
  return buddyType === 'krishna'
    ? [...BASE_TABS, ...KRISHNA_TABS, ...TRAILING_TABS]
    : [...BASE_TABS, ...TRAILING_TABS];
}

const ALL_TAB_IDS: TabId[] = [...BASE_TABS, ...KRISHNA_TABS, ...TRAILING_TABS].map((t) => t.id);

// Idle variety sub-animations that cycle randomly
const IDLE_VARIETIES: HamsterMood[] = ['idle', 'waving', 'idle', 'idle', 'idle'];

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
  const [isPinned, setIsPinned] = useState(true);
  const [confirmQuit, setConfirmQuit] = useState(false);
  // The sidebar mascot used to occupy a hard-locked 44% of the window, which
  // is what starved the To-Do, Chat and Speech tabs of usable height.
  const [mascotCollapsed, setMascotCollapsed] = useState(false);

  /**
   * True while the bubble is showing something the user actually asked for (a
   * voice answer or an error). The 45s canned-greeting interval used to wipe
   * AI replies out from under the user, so it now defers while this is set.
   */
  const bubbleIsAiReply = useRef(false);

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
  const bubbleHoldTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedTimer1 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedTimer2 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFeeding = useRef(false);

  const currentBuddyDef = getBuddyDefinition(buddyType);
  const visibleTabs = tabsFor(buddyType);

  /**
   * The tab actually shown. Derived rather than corrected in an effect: the
   * Gita/Today tabs only exist for Krishna, so a selection left over
   * from a buddy switch (or restored from a saved default) would otherwise
   * render an empty workspace for one paint.
   */
  const effectiveTab: TabId = visibleTabs.some((t) => t.id === activeTab) ? activeTab : 'chat';

  // Latest-value refs, so the stable callbacks below (feed, pet, the polling
  // intervals) can read current values without being re-created and without
  // re-running the effects that depend on them.
  const currentBuddyDefRef = useRef(currentBuddyDef);

  const handleMoodChange = useCallback((mood: HamsterMood) => {
    setHamsterMood(mood);
  }, []);

  // Owned here, above the mode branches, so it survives every mode switch.
  const conversation = useConversation({
    onMoodChange: handleMoodChange,
    buddyType,
    buddyName: hamsterName,
  });

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

  const checkBackendRef = useRef(checkBackend);
  const refreshGreetingRef = useRef(refreshGreeting);
  const windowModeRef = useRef<WindowMode>(windowMode);

  useEffect(() => {
    currentBuddyDefRef.current = currentBuddyDef;
    checkBackendRef.current = checkBackend;
    refreshGreetingRef.current = refreshGreeting;
    windowModeRef.current = windowMode;
  });

  // ── Restore saved preferences. Runs exactly once. ──
  // Every setState here is a deliberate post-mount hydration step: localStorage
  // does not exist while the static export is prerendered, so reading it during
  // render would cause a hydration mismatch rather than a one-frame correction.
  useEffect(() => {
    const saved = getClientSavedConfig();
    if (saved?.hamster?.buddy_type && ['hamster', 'panda', 'krishna'].includes(saved.hamster.buddy_type)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBuddyType(saved.hamster.buddy_type as BuddyType);
    }
    if (saved?.hamster?.color) setHamsterColor(saved.hamster.color);
    if (saved?.hamster?.name) setHamsterName(saved.hamster.name);
    if (saved?.hamster?.pose && ['crossed', 'chakra', 'standing'].includes(saved.hamster.pose)) {
      setKrishnaPose(saved.hamster.pose === 'crossed' ? 'crossed' : 'chakra');
    } else {
      setKrishnaPose('chakra');
    }
    if (saved?.startup?.default_tab && (ALL_TAB_IDS as string[]).includes(saved.startup.default_tab)) {
      setActiveTab(saved.startup.default_tab as TabId);
    }

    // Reopen in the mode the user was last using instead of always forcing the
    // tiny pet widget. Read here rather than in useState so the server-rendered
    // markup and the first client render agree.
    let startMode: WindowMode = 'pet';
    try {
      const storedMode = localStorage.getItem(MODE_STORAGE_KEY);
      if (storedMode === 'pet' || storedMode === 'compact' || storedMode === 'fullscreen') {
        startMode = storedMode;
      } else if (!window.hamsterDesk?.isElectron) {
        // In a browser tab the floating widget is a transparent sliver of a
        // page; the workspace is the only sensible default there.
        startMode = 'fullscreen';
      }
    } catch { }

    setWindowModeState(startMode);
    window.hamsterDesk?.window?.setMode(startMode);
    window.hamsterDesk?.window?.getAlwaysOnTop?.().then(setIsPinned).catch(() => { });

    checkBackendRef.current();
    refreshGreetingRef.current();
  }, []);

  // ── Background polling. Also runs once; reads the latest callbacks via refs. ──
  useEffect(() => {
    const healthInterval = setInterval(() => checkBackendRef.current(), 30000);

    const greetingInterval = setInterval(() => {
      // Never overwrite an answer the user is still reading.
      if (bubbleIsAiReply.current) return;
      refreshGreetingRef.current();
    }, 45000);

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
      clearInterval(healthInterval);
      clearInterval(greetingInterval);
      clearInterval(idleVarietyInterval);
    };
  }, []);

  // ── Window control helpers ──────────────────────────────────────
  const setWindowMode = useCallback((mode: WindowMode, targetTab?: TabId) => {
    if (targetTab) {
      setActiveTab(targetTab);
    }
    setWindowModeState(mode);
    try {
      localStorage.setItem(MODE_STORAGE_KEY, mode);
    } catch { }
    if (typeof window !== 'undefined' && window.hamsterDesk?.window) {
      window.hamsterDesk.window.setMode(mode);
    }
  }, []);

  const handleMinimize = useCallback(() => {
    window.hamsterDesk?.window?.minimize();
  }, []);

  /**
   * ✕ means the same thing in every mode: put the buddy away without losing
   * anything. In the desktop app that hides the window (the menu-bar icon
   * brings it back); on the web there is nothing to hide, so it collapses to
   * the floating buddy.
   */
  const handleHide = useCallback(() => {
    if (window.hamsterDesk?.window) {
      window.hamsterDesk.window.close();
    } else {
      setWindowMode('pet');
    }
  }, [setWindowMode]);

  /** Quitting is irreversible and kills the backend, so it always asks first. */
  const requestQuit = useCallback(() => setConfirmQuit(true), []);

  const performQuit = useCallback(() => {
    setConfirmQuit(false);
    window.hamsterDesk?.window?.quit();
  }, []);

  const togglePin = useCallback(() => {
    window.hamsterDesk?.window?.toggleAlwaysOnTop();
    setIsPinned((prev) => !prev);
  }, []);

  // ── Keyboard access to the mode system ─────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Never steal keys while the user is typing.
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) {
        return;
      }
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
        const match = MODES.find((m) => m.shortcut === e.key);
        if (match) {
          e.preventDefault();
          setWindowMode(match.id);
        }
        return;
      }
      // Escape steps back toward the smallest mode rather than doing nothing.
      if (e.key === 'Escape') {
        // Read the live mode from a ref: calling setWindowMode from inside a
        // state updater made this a side effect in the reducer, which React
        // does not reliably run (and runs twice in development).
        const current = windowModeRef.current;
        if (current === 'fullscreen') setWindowMode('compact');
        else if (current === 'compact') setWindowMode('pet');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setWindowMode]);

  // ── Mode picks from the tray / dock "View mode" menu ────────────
  // While the window is hidden the tray is the only way back, so it can now
  // reopen straight into a chosen mode instead of only Show/Hide.
  useEffect(() => {
    const off = window.hamsterDesk?.window?.onModeRequest?.((mode) => {
      if (mode === 'pet' || mode === 'compact' || mode === 'fullscreen') {
        setWindowMode(mode);
      }
    });
    return () => off?.();
  }, [setWindowMode]);

  /**
   * Show something the user asked for and protect it from the ambient greeting
   * rotation for a while, so a voice answer is not wiped mid-read.
   */
  const showImportantMessage = useCallback((message: string, holdMs = 60000) => {
    setHamsterGreeting(message);
    bubbleIsAiReply.current = true;
    if (bubbleHoldTimer.current) clearTimeout(bubbleHoldTimer.current);
    bubbleHoldTimer.current = setTimeout(() => {
      bubbleIsAiReply.current = false;
    }, holdMs);
  }, []);

  const petHamster = useCallback(() => {
    // Track petting streak
    setPetStreak((prev) => prev + 1);
    if (petStreakTimer.current) clearTimeout(petStreakTimer.current);
    petStreakTimer.current = setTimeout(() => setPetStreak(0), 10000);

    setHamsterMood('happy');
    // Petting is an ambient interaction, so it must not clear an answer the
    // user is still reading.
    if (!bubbleIsAiReply.current) refreshGreetingRef.current();
    setTimeout(() => {
      setHamsterMood('idle');
    }, 2800);
  }, []);

  const feedHamster = useCallback(() => {
    // Feeding runs a 5s scripted sequence; a second trigger part-way through
    // used to cut the eating animation short.
    if (isFeeding.current) return;
    isFeeding.current = true;

    setHamsterMood('eating');
    setHamsterGreeting(currentBuddyDefRef.current.eatMessage);
    if (feedTimer1.current) clearTimeout(feedTimer1.current);
    feedTimer1.current = setTimeout(() => {
      setHamsterMood('happy');
      setHamsterGreeting(currentBuddyDefRef.current.fullMessage);
      if (feedTimer2.current) clearTimeout(feedTimer2.current);
      feedTimer2.current = setTimeout(() => {
        setHamsterMood('idle');
        isFeeding.current = false;
      }, 2200);
    }, 3000);
  }, []);

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
    const saved = getClientSavedConfig() || ({} as any);

    // Remember this buddy's own name and colour so switching away and back
    // does not overwrite a name the user chose. Previously every switch reset
    // both to the new buddy's defaults, with no undo.
    const perBuddy = saved.buddy_prefs || {};
    const previousDef = BUDDY_REGISTRY[buddyType];
    perBuddy[buddyType] = {
      name: hamsterName || previousDef.defaultName,
      color: hamsterColor || previousDef.defaultColor,
    };

    const restored = perBuddy[targetType];
    const nextName = restored?.name || targetDef.defaultName;
    const nextColor = restored?.color || targetDef.defaultColor;

    // The flute toggle only exists for Krishna, so leaving him while it plays
    // orphaned a looping track the user could no longer reach.
    if (targetType !== 'krishna') {
      const audio = document.getElementById('flute-bg-music') as HTMLAudioElement | null;
      if (audio && !audio.paused) {
        audio.pause();
        audio.currentTime = 0;
      }
      setIsFlutePlaying(false);
    }

    setBuddyType(targetType);
    setHamsterName(nextName);
    setHamsterColor(nextColor);
    setHamsterGreeting(targetDef.greetings[0]);
    bubbleIsAiReply.current = false;

    saved.buddy_prefs = perBuddy;
    saved.hamster = {
      ...(saved.hamster || {}),
      buddy_type: targetType,
      name: nextName,
      color: nextColor,
    };
    saveClientSavedConfig(saved);
  };

  // Tap to Talk: stays in whatever mode you are in — records, understands,
  // asks the LLM and speaks the reply aloud. The turn lands in the same
  // conversation the Chat tab shows, so the buddy remembers it and the user
  // can scroll back to it.
  //
  // The browser recognizer hands back text (this path); the MediaRecorder path
  // hands back audio and goes through /voice/converse below.
  const handleVoiceTranscribed = useCallback(async (transcript: string) => {
    showImportantMessage(`You said: “${transcript}”`, 30000);
    const reply = await conversation.send(transcript);
    if (reply) {
      showImportantMessage(reply);
    } else {
      showImportantMessage('😵 Could not reach the backend — check the status dot.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showImportantMessage]);

  /**
   * One round trip: the recording goes up, and the transcript, the reply and
   * the spoken audio come back together. Nothing is shown until it is real,
   * so the bubble never displays a transcript for a turn that then failed.
   */
  const handleVoiceAudio = useCallback(async (blob: Blob) => {
    const reply = await conversation.sendVoice(blob);
    if (reply) {
      showImportantMessage(reply);
    } else {
      showImportantMessage('😵 Could not reach the backend — check the status dot.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showImportantMessage]);

  const voiceRecorder = useVoiceRecorder({
    onTranscribed: handleVoiceTranscribed,
    onAudio: handleVoiceAudio,
    onRecordingStart: () => {
      setIsListening(true);
      setHamsterMood('listening');
      showImportantMessage('🎙️ Listening… speak now!', 30000);
    },
    onRecordingStop: () => setIsListening(false),
    onTranscribingStart: () => {
      setHamsterMood('thinking');
      showImportantMessage('🤔 Sun raha hoon…', 30000);
    },
  });

  // Show recorder errors in the speech bubble, protected from the greeting timer.
  useEffect(() => {
    if (voiceRecorder.error) {
      showImportantMessage(`🎤 ${voiceRecorder.error}`, 30000);
      setHamsterMood('idle');
    }
  }, [voiceRecorder.error, showImportantMessage]);

  const handleTapToTalk = () => {
    voiceRecorder.toggle();
  };

  const handleNewSession = useCallback(async () => {
    await conversation.newSession();
    showImportantMessage('✨ Fresh start. What\u2019s on your mind?', 20000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showImportantMessage]);

  const timer = useFocusTimer({ onMoodChange: handleMoodChange });

  const handleBuddyTypeChange = useCallback((type: string) => {
    setBuddyType(type as BuddyType);
  }, []);

  /**
   * Config's pose toggle speaks in poses. Anything else (for example an
   * animation-state name) is ignored rather than written into the pose slot.
   */
  const handlePoseChange = useCallback((pose: string) => {
    if (pose === 'crossed' || pose === 'chakra') setKrishnaPose(pose);
  }, []);

  const formatTimerDigits = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ── Window dragging ─────────────────────────────────────────────
  // Title bars use these and nothing else. They used to share pet mode's
  // gesture handler, so clicking the compact or dashboard title bar secretly
  // petted the buddy and double-clicking it fed him instead of behaving like a
  // window title bar.
  const beginDrag = (e: React.PointerEvent) => {
    if (e.button !== 0) return false;
    if ((e.target as HTMLElement).closest('button, a, input, select, textarea')) return false;

    isPointerDown.current = true;
    hasMoved.current = false;
    dragStartPos.current = { x: e.screenX, y: e.screenY };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch { }
    return true;
  };

  const continueDrag = (e: React.PointerEvent) => {
    if (!isPointerDown.current) return;

    const deltaX = e.screenX - dragStartPos.current.x;
    const deltaY = e.screenY - dragStartPos.current.y;

    if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
      if (!hasMoved.current) {
        hasMoved.current = true;
        setIsDragging(true);
      }
      dragStartPos.current = { x: e.screenX, y: e.screenY };
      window.hamsterDesk?.window?.moveBy?.(Math.round(deltaX), Math.round(deltaY));
    }
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!isPointerDown.current) return false;
    isPointerDown.current = false;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch { }
    return !hasMoved.current;
  };

  /** A cancelled pointer (OS gesture, focus loss) must not leave a stuck drag. */
  const cancelDrag = () => {
    isPointerDown.current = false;
    hasMoved.current = false;
    setIsDragging(false);
  };

  const handleDragPointerDown = (e: React.PointerEvent) => { beginDrag(e); };
  const handleDragPointerMove = continueDrag;
  const handleDragPointerUp = (e: React.PointerEvent) => { endDrag(e); };

  // ── Pet mode: drag to move, click to pet, double-click to feed ───
  const handlePointerDown = (e: React.PointerEvent) => { beginDrag(e); };
  const handlePointerMove = continueDrag;

  const handlePointerUp = (e: React.PointerEvent) => {
    const wasClick = endDrag(e);
    if (!wasClick) return;

    // Pet immediately. The old version deferred petting by 420ms to watch for
    // a double-click, which made every pet feel broken; a second click within
    // the window now simply adds the feed on top.
    const now = Date.now();
    if (now - lastClickTime.current < 400) {
      lastClickTime.current = 0;
      feedHamster();
    } else {
      lastClickTime.current = now;
      petHamster();
    }
  };

  // ── MODE 1: PET / SMALL MODE (Floating Desktop Buddy Widget) ──────
  if (windowMode === 'pet') {
    return (
      <div
        className={`compact-widget ${isDragging ? 'dragging-active' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={cancelDrag}
        onPointerLeave={cancelDrag}
      >
        {/* The transparent area around the buddy is a real, always-on-top
            window. Marking it click-through stops it from eating every desktop
            click that lands in the empty space. */}
        <div
          className="pet-clickthrough-backdrop"
          aria-hidden="true"
          onPointerEnter={() => window.hamsterDesk?.window?.setClickThrough?.(true)}
          // Empty space is not the buddy: a click here must not pet him, and in
          // the browser (where click-through does not exist) this is the only
          // thing stopping it.
          onPointerDown={(e) => e.stopPropagation()}
        />

        {/* Window controls — always visible, labelled, and 26px hit targets */}
        <div
          className="compact-top-bar interactive-region"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerEnter={() => window.hamsterDesk?.window?.setClickThrough?.(false)}
        >
          <span
            className={`pet-status-dot status-dot ${backendOnline ? 'online' : 'offline'}`}
            role="status"
            aria-label={backendOnline ? 'Backend connected' : 'Backend offline — chat and voice will not work'}
            title={backendOnline ? 'Backend connected' : 'Backend offline — chat and voice will not work'}
          />
          <div className="compact-top-controls">
            <WindowControls
              buddyName={hamsterName}
              onMinimize={handleMinimize}
              onHide={handleHide}
              onQuit={requestQuit}
              isPinned={isPinned}
              onTogglePin={togglePin}
              size="sm"
            />
          </div>
        </div>

        {/* Floating Buddy with on-body drag badge & AI greeting speech bubble */}
        <div
          className="compact-hamster-area interactive-region"
          onPointerEnter={() => window.hamsterDesk?.window?.setClickThrough?.(false)}
          title={`Click to pet ${hamsterName}, double-click to feed ${currentBuddyDef.snackEmoji}, drag to move`}
        >
          <BuddyRenderer
            type={buddyType}
            mood={hamsterMood}
            pose={buddyType === 'krishna' ? krishnaPose : undefined}
            color={hamsterColor}
            name={hamsterName}
            greeting={hamsterGreeting}
            isDragging={isDragging}
            petStreak={petStreak}
            onRefreshGreeting={refreshGreeting}
            onFeed={feedHamster}
          />
        </div>

        {/* Keyboard equivalents for the pointer-only pet and feed gestures */}
        <div className="sr-only-actions" aria-label={`${hamsterName} actions`} role="group">
          <button type="button" className="sr-only-btn" onClick={petHamster}>
            Pet {hamsterName}
          </button>
          <button type="button" className="sr-only-btn" onClick={feedHamster}>
            Feed {hamsterName} a {currentBuddyDef.favoriteSnack}
          </button>
        </div>

        {/* Screen readers get the speech bubble text as it changes */}
        <p className="sr-only" role="status" aria-live="polite">{hamsterGreeting}</p>

        {/* Floating Focus Timer Chip (active when running, paused mid-session, or just finished) */}
        {(timer.isRunning || (timer.timeLeft > 0 && timer.timeLeft < timer.totalSeconds) || timer.sessionCompleted) && (
          <button
            type="button"
            className={`pet-timer-chip interactive-region ${timer.isRunning ? 'timer-running' : ''} ${timer.sessionType === 'break' ? 'mode-break' : ''}`}
            onClick={() => setWindowMode('compact', 'todo')}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerEnter={() => window.hamsterDesk?.window?.setClickThrough?.(false)}
            aria-label={`${timer.sessionType === 'break' ? 'Break' : 'Focus'} timer, ${formatTimerDigits(timer.timeLeft)} remaining. Open the timer controls.`}
            title="Open the To-Do & Focus Timer controls"
          >
            <span className="pet-timer-icon" aria-hidden="true">
              {timer.sessionType === 'break' ? '☕' : timer.isRunning ? '🔥' : '⏱️'}
            </span>
            <span className="pet-timer-digits">{formatTimerDigits(timer.timeLeft)}</span>
            {timer.currentActivity && (
              <span className="pet-timer-task-label" title={timer.currentActivity}>
                {timer.currentActivity}
              </span>
            )}
            <span className="pet-timer-arrow" aria-hidden="true">›</span>
          </button>
        )}

        {/* Floating Quick Icon Toolbar */}
        <div
          className="floating-controls interactive-region"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerEnter={() => window.hamsterDesk?.window?.setClickThrough?.(false)}
        >
          {/* Quick Buddy Switcher */}
          <button
            type="button"
            className="floating-btn"
            onClick={() => switchBuddy()}
            aria-label={`Switch buddy — next is ${nextBuddyDef.name}`}
            title={`Switch Buddy (Next: ${nextBuddyDef.emoji} ${nextBuddyDef.name})`}
          >
            <span aria-hidden="true">{nextBuddyDef.emoji}</span>
          </button>

          {/* Tap to Talk */}
          <button
            type="button"
            className={`floating-btn btn-mic ${isListening ? 'listening' : ''}`}
            onClick={handleTapToTalk}
            aria-label={isListening ? 'Stop listening' : `Talk to ${hamsterName}`}
            aria-pressed={isListening}
            title={isListening ? 'Listening — tap to stop' : 'Tap to Talk'}
          >
            <span aria-hidden="true">{isListening ? '🔴' : '🎙️'}</span>
          </button>

          {/* New chat. Pet mode has no tab bar, so without this the only way
              to start fresh is to leave the widget. */}
          <button
            type="button"
            className="floating-btn"
            onClick={handleNewSession}
            aria-label="Start a new conversation"
            title="New chat — start fresh (earlier chats are kept)"
          >
            <span aria-hidden="true">✨</span>
          </button>

          {/* Krishna's flute is an action, so it lives with the other actions.
              The slot is always rendered so the toolbar's width never changes
              and the button under the cursor never shifts sideways. */}
          <button
            type="button"
            className="floating-btn"
            onClick={toggleFlute}
            aria-pressed={isFlutePlaying}
            aria-label={isFlutePlaying ? 'Pause flute music' : 'Play flute music'}
            title={isFlutePlaying ? 'Pause Flute Music' : 'Play Flute Music'}
            hidden={buddyType !== 'krishna'}
            tabIndex={buddyType === 'krishna' ? 0 : -1}
            style={buddyType === 'krishna' ? undefined : { visibility: 'hidden' }}
            aria-hidden={buddyType !== 'krishna'}
          >
            <span aria-hidden="true">{isFlutePlaying ? '🎶' : '🪈'}</span>
          </button>

          <span className="floating-divider" aria-hidden="true" />

          {/* Every mode reachable from here, including the dashboard */}
          <ModeSwitcher current="pet" onChange={setWindowMode} compactLabels />
        </div>
      </div>
    );
  }

  // ── Tab panels, rendered identically in compact and dashboard modes ──
  const tabPanels = (
    <>
      <div
        id="panel-chat"
        className="tab-pane"
        role="tabpanel"
        aria-labelledby="tab-chat"
        hidden={effectiveTab !== 'chat'}
      >
        <ChatPanel
          onMoodChange={handleMoodChange}
          buddyType={buddyType}
          buddyName={hamsterName}
          buddyDef={currentBuddyDef}
          conversation={conversation}
        />
      </div>
      <div
        id="panel-todo"
        className="tab-pane"
        role="tabpanel"
        aria-labelledby="tab-todo"
        hidden={effectiveTab !== 'todo'}
      >
        <TodoPanel
          onMoodChange={handleMoodChange}
          buddyType={buddyType}
          buddyName={hamsterName}
          buddyDef={currentBuddyDef}
          timer={timer}
        />
      </div>
      {buddyType === 'krishna' && (
        <>
          <div
            id="panel-daily"
            className="tab-pane"
            role="tabpanel"
            aria-labelledby="tab-daily"
            hidden={effectiveTab !== 'daily'}
          >
            <DailyPanel />
          </div>
          <div
            id="panel-gita"
            className="tab-pane"
            role="tabpanel"
            aria-labelledby="tab-gita"
            hidden={effectiveTab !== 'gita'}
          >
            <GitaPanel />
          </div>
        </>
      )}
      <div
        id="panel-config"
        className="tab-pane"
        role="tabpanel"
        aria-labelledby="tab-config"
        hidden={effectiveTab !== 'config'}
      >
        <ConfigPanel
          currentBuddyType={buddyType}
          currentBuddyName={hamsterName}
          currentColor={hamsterColor}
          currentPose={krishnaPose}
          onColorChange={setHamsterColor}
          onNameChange={setHamsterName}
          onBuddyTypeChange={handleBuddyTypeChange}
          onPoseChange={handlePoseChange}
        />
      </div>
      <div
        id="panel-speech"
        className="tab-pane"
        role="tabpanel"
        aria-labelledby="tab-speech"
        hidden={effectiveTab !== 'speech'}
      >
        <SpeechTrainingPanel
          buddyType={buddyType}
          buddyName={hamsterName}
          buddyDef={currentBuddyDef}
        />
      </div>
    </>
  );

  /** Proper tablist semantics with arrow-key navigation. */
  const renderTabs = (className: string) => (
    // data-tab-count drives whether labels fit: four labels are comfortable in
    // a 380px sidebar, but Krishna's extra tabs make seven, and then only the
    // glyphs fit. The accessible name always carries the full label.
    <nav
      className={className}
      role="tablist"
      aria-label="Workspace sections"
      data-tab-count={visibleTabs.length}
    >
      {visibleTabs.map((tab, index) => (
        <button
          key={tab.id}
          type="button"
          id={`tab-${tab.id}`}
          role="tab"
          aria-selected={effectiveTab === tab.id}
          aria-controls={`panel-${tab.id}`}
          tabIndex={effectiveTab === tab.id ? 0 : -1}
          className={`tab-btn ${effectiveTab === tab.id ? 'active' : ''}`}
          onClick={() => setActiveTab(tab.id)}
          onKeyDown={(e) => {
            if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
            e.preventDefault();
            const delta = e.key === 'ArrowRight' ? 1 : -1;
            const next = visibleTabs[(index + delta + visibleTabs.length) % visibleTabs.length];
            setActiveTab(next.id);
            document.getElementById(`tab-${next.id}`)?.focus();
          }}
        >
          <span className="tab-emoji" aria-hidden="true">{tab.emoji}</span>
          <span className="tab-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );

  // ── MODE 2: COMPACT / SIDEBAR MODE (Floating Sidebar Panel) ──────
  if (windowMode === 'compact') {
    return (
      <div className="app-container compact-sidebar-container">
        {/* Window Header — drag area, mode switcher, window controls */}
        <header
          className="app-header"
          onPointerDown={handleDragPointerDown}
          onPointerMove={handleDragPointerMove}
          onPointerUp={handleDragPointerUp}
          onPointerCancel={cancelDrag}
        >
          <div className="app-title-area">
            <span className="app-drag-dots" aria-hidden="true">⋮⋮</span>
            <span aria-hidden="true">{currentBuddyDef.emoji}</span>
            <span className="app-title-name">{hamsterName}</span>
            <span
              className={`status-dot ${backendOnline ? 'online' : 'offline'}`}
              role="status"
              aria-label={backendOnline ? 'Backend connected' : 'Backend offline'}
              title={backendOnline ? 'Backend connected' : 'Backend offline'}
            />
          </div>

          <div className="window-controls" onPointerDown={(e) => e.stopPropagation()}>
            <WindowControls
              buddyName={hamsterName}
              onMinimize={handleMinimize}
              onHide={handleHide}
              onQuit={requestQuit}
              isPinned={isPinned}
              onTogglePin={togglePin}
              size="sm"
            />
          </div>
        </header>

        {/* Mode switcher: a real segmented control, present in every mode */}
        <div className="mode-switcher-bar">
          <ModeSwitcher current="compact" onChange={setWindowMode} />
        </div>

        {/* Buddy — collapsible, so the tabs below get usable height */}
        <div className={`hamster-section ${mascotCollapsed ? 'is-collapsed' : ''}`}>
          {!mascotCollapsed && (
            <BuddyRenderer
              type={buddyType}
              mood={hamsterMood}
              pose={buddyType === 'krishna' ? krishnaPose : undefined}
              size="sm"
              color={hamsterColor}
              name={hamsterName}
              greeting={hamsterGreeting}
              onClick={petHamster}
              petStreak={petStreak}
              onRefreshGreeting={refreshGreeting}
              onFeed={feedHamster}
            />
          )}

          <div className="hamster-section-actions">
            <button
              type="button"
              className="mascot-toggle-btn"
              onClick={() => setMascotCollapsed((v) => !v)}
              aria-expanded={!mascotCollapsed}
              aria-label={mascotCollapsed ? `Show ${hamsterName}` : `Hide ${hamsterName} to make more room`}
              title={mascotCollapsed ? `Show ${hamsterName}` : 'Hide the buddy to make more room'}
            >
              <span aria-hidden="true">{mascotCollapsed ? '▾' : '▴'}</span>
              {mascotCollapsed ? `Show ${hamsterName}` : 'More room'}
            </button>

            <button
              type="button"
              className="mascot-toggle-btn"
              onClick={() => switchBuddy()}
              aria-label={`Switch buddy — next is ${nextBuddyDef.name}`}
              title={`Switch Buddy (Next: ${nextBuddyDef.emoji} ${nextBuddyDef.name})`}
            >
              <span aria-hidden="true">{nextBuddyDef.emoji}</span>
              Switch
            </button>

            <button
              type="button"
              className={`mascot-toggle-btn ${isListening ? 'is-listening' : ''}`}
              onClick={handleTapToTalk}
              aria-pressed={isListening}
              aria-label={isListening ? 'Stop listening' : `Talk to ${hamsterName}`}
              title={isListening ? 'Listening — tap to stop' : 'Tap to Talk'}
            >
              <span aria-hidden="true">{isListening ? '🔴' : '🎙️'}</span>
              {isListening ? 'Stop' : 'Talk'}
            </button>

            {buddyType === 'krishna' && (
              <button
                type="button"
                className="mascot-toggle-btn"
                onClick={toggleFlute}
                aria-pressed={isFlutePlaying}
                aria-label={isFlutePlaying ? 'Pause flute music' : 'Play flute music'}
                title={isFlutePlaying ? 'Pause Flute Music' : 'Play Flute Music'}
              >
                <span aria-hidden="true">{isFlutePlaying ? '🎶' : '🪈'}</span>
                Flute
              </button>
            )}
          </div>
        </div>

        {renderTabs('tab-nav')}

        <main className="tab-content">{tabPanels}</main>

        {/* Status Bar */}
        <div className="status-bar">
          <span>
            <span className={`status-dot ${backendOnline ? 'online' : 'offline'}`} aria-hidden="true" />
            {backendOnline ? 'Backend connected' : 'Backend offline'}
          </span>
          {(timer.isRunning || timer.sessionCompleted) && (
            <button
              type="button"
              className="status-bar-btn"
              onClick={() => setActiveTab('todo')}
              aria-label={`${timer.sessionType === 'break' ? 'Break' : 'Focus'} timer, ${formatTimerDigits(timer.timeLeft)} remaining. Open the timer.`}
            >
              <span aria-hidden="true">{timer.sessionType === 'break' ? '☕' : '🔥'}</span>
              {formatTimerDigits(timer.timeLeft)}
            </button>
          )}
        </div>

        <ConfirmDialog
          open={confirmQuit}
          title={`Quit ${hamsterName}?`}
          body="This closes the app and stops the local backend. Hiding the window instead keeps everything running — reopen it from the menu-bar icon."
          confirmLabel="Quit"
          destructive
          onConfirm={performQuit}
          onCancel={() => setConfirmQuit(false)}
        />
      </div>
    );
  }

  // ── MODE 3: FULL SCREEN / DASHBOARD MODE (Full Productivity App) ─
  return (
    <div className="dashboard-container">
      {/* Co-Pilot Left Sidebar */}
      <aside className="dashboard-copilot-sidebar">
        <div className="copilot-header">
          <span className="copilot-logo" aria-hidden="true">{currentBuddyDef.emoji}</span>
          <span className="copilot-title">{hamsterName}</span>
        </div>

        {/* Animated Co-Pilot Character — 'sm' so it fits the 260px sidebar */}
        <div className="copilot-pet-box">
          <BuddyRenderer
            type={buddyType}
            mood={hamsterMood}
            pose={buddyType === 'krishna' ? krishnaPose : undefined}
            size="sm"
            color={hamsterColor}
            name={hamsterName}
            greeting={hamsterGreeting}
            onClick={petHamster}
            petStreak={petStreak}
            onRefreshGreeting={refreshGreeting}
            onFeed={feedHamster}
          />
        </div>

        {/* Voice Talk Action */}
        <div className="copilot-actions">
          <button
            type="button"
            className={`copilot-talk-btn ${isListening ? 'listening' : ''}`}
            onClick={handleTapToTalk}
            aria-pressed={isListening}
            aria-label={isListening ? 'Stop listening' : `Talk to ${hamsterName}`}
          >
            <span aria-hidden="true">{isListening ? '🔴' : '🎙️'}</span>
            {isListening ? ' Listening…' : ' Tap to Talk'}
          </button>
        </div>

        <div className="copilot-secondary-actions">
          <button
            type="button"
            className="copilot-secondary-btn"
            onClick={() => switchBuddy()}
            aria-label={`Switch buddy — next is ${nextBuddyDef.name}`}
          >
            <span aria-hidden="true">{nextBuddyDef.emoji}</span>
            Switch to {nextBuddyDef.name}
          </button>

          {buddyType === 'krishna' && (
            <button
              type="button"
              className="copilot-secondary-btn"
              onClick={toggleFlute}
              aria-pressed={isFlutePlaying}
              aria-label={isFlutePlaying ? 'Pause flute music' : 'Play flute music'}
            >
              <span aria-hidden="true">{isFlutePlaying ? '🎶' : '🪈'}</span>
              {isFlutePlaying ? 'Pause flute' : 'Play flute'}
            </button>
          )}
        </div>

        {/* Mode Switcher Navigation */}
        <div className="copilot-mode-nav">
          <div className="mode-nav-label" id="mode-nav-label">WINDOW MODE</div>
          <ModeSwitcher current="fullscreen" onChange={setWindowMode} variant="list" />
        </div>

        {/* Backend Health Status */}
        <div className="copilot-footer">
          <span className={`status-dot ${backendOnline ? 'online' : 'offline'}`} aria-hidden="true" />
          <span role="status">{backendOnline ? 'Backend connected' : 'Backend offline'}</span>
        </div>
      </aside>

      {/* Main Workspace Dashboard */}
      <main className="dashboard-main-content">
        {/* Top Header Controls */}
        <header
          className="dashboard-header"
          onPointerDown={handleDragPointerDown}
          onPointerMove={handleDragPointerMove}
          onPointerUp={handleDragPointerUp}
          onPointerCancel={cancelDrag}
        >
          <div className="dashboard-header-title">
            <span className="app-drag-dots" aria-hidden="true">⋮⋮</span>
            <span>Productivity Workspace</span>
          </div>

          <div className="dashboard-header-controls" onPointerDown={(e) => e.stopPropagation()}>
            {/* A running timer is visible from every mode, not just the To-Do tab */}
            {(timer.isRunning || timer.sessionCompleted) && (
              <button
                type="button"
                className={`dashboard-timer-chip ${timer.sessionType === 'break' ? 'mode-break' : ''}`}
                onClick={() => setActiveTab('todo')}
                aria-label={`${timer.sessionType === 'break' ? 'Break' : 'Focus'} timer, ${formatTimerDigits(timer.timeLeft)} remaining. Open the timer.`}
              >
                <span aria-hidden="true">{timer.sessionType === 'break' ? '☕' : '🔥'}</span>
                <span className="pet-timer-digits">{formatTimerDigits(timer.timeLeft)}</span>
                {timer.currentActivity && (
                  <span className="pet-timer-task-label">{timer.currentActivity}</span>
                )}
              </button>
            )}

            <WindowControls
              buddyName={hamsterName}
              onMinimize={handleMinimize}
              onHide={handleHide}
              onQuit={requestQuit}
              showMaximize
            />
          </div>
        </header>

        {renderTabs('dashboard-tab-bar')}

        {/* Tab View */}
        <div className={`dashboard-workspace-body tab-${activeTab}`}>{tabPanels}</div>
      </main>

      <ConfirmDialog
        open={confirmQuit}
        title={`Quit ${hamsterName}?`}
        body="This closes the app and stops the local backend. Hiding the window instead keeps everything running — reopen it from the menu-bar icon."
        confirmLabel="Quit"
        destructive
        onConfirm={performQuit}
        onCancel={() => setConfirmQuit(false)}
      />
    </div>
  );
}
