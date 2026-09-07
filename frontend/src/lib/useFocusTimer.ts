'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { FocusMode, HamsterMood, ReflectionPrompt } from '@/lib/api';
import { endFocusSession, startFocusSession } from '@/lib/api';
import { playTimerCompletionChime } from '@/lib/audio';
import type { RequestStateFn } from '@/lib/useKrishnaCharacterState';

export interface TimerPreset {
  id: string;
  label: string;
  emoji: string;
  minutes: number;
  type: 'focus' | 'break';
}

export const PRESETS: TimerPreset[] = [
  { id: 'focus-25', label: '25m Focus', emoji: '🍅', minutes: 25, type: 'focus' },
  { id: 'break-5', label: '5m Break', emoji: '☕', minutes: 5, type: 'break' },
  { id: 'focus-50', label: '50m Deep', emoji: '🚀', minutes: 50, type: 'focus' },
  { id: 'break-10', label: '10m Break', emoji: '🌴', minutes: 10, type: 'break' },
];

export const DEFAULT_FOCUS_ACTIVITIES = [
  '💻 Deep Coding & Dev',
  '📚 Reading & Research',
  '✍️ Writing & Documentation',
  '🧠 Problem Solving & Architecture',
  '📧 Inbox & Review',
  '🎨 Creative Design & Assets',
];

export const DEFAULT_5M_BREAK_ACTIVITIES = [
  '💧 Drink a glass of water',
  '🧘 1-min deep breath & stretch',
  '👀 20-20-20 eye rest',
  '🚶 Quick walk around room',
  '🎋 Pet your buddy & relax',
  '☕ Grab coffee or tea',
];

export const DEFAULT_10M_BREAK_ACTIVITIES = [
  '🚶 Step outside for fresh air',
  '🧘 10-minute mindful meditation',
  '🥗 Healthy snack break',
  '🤸 Full body stretch routine',
  '🎧 Listen to chill music',
  '🪟 Relax eyes gazing outside',
];

export const STORAGE_CUSTOM_FOCUS_KEY = 'desktop_buddy_custom_focus_activities';
export const STORAGE_CUSTOM_BREAK_KEY = 'desktop_buddy_custom_break_activities';

/**
 * Best guess at the focus category from the activity label.
 *
 * A guess, not a claim: it only groups time in the by-category breakdown, and
 * anything unrecognised stays OTHER rather than being forced into a bucket.
 */
function guessMode(activity: string): FocusMode {
  const text = (activity || '').toLowerCase();
  if (/(cod|dev|program|debug|build|refactor)/.test(text)) return 'CODING';
  if (/(read|study|learn|revis|course|dsa|leetcode)/.test(text)) return 'STUDY';
  if (/(writ|doc|blog|essay|note)/.test(text)) return 'WRITING';
  if (/(design|creat|art|sketch|asset)/.test(text)) return 'CREATIVE';
  if (/(email|inbox|admin|invoice|chore|review)/.test(text)) return 'ADMIN';
  if (/(deep|focus|problem|architect)/.test(text)) return 'DEEP_WORK';
  return 'OTHER';
}

export function useFocusTimer({
  onMoodChange,
  onPresentation,
}: {
  onMoodChange: (mood: HamsterMood) => void;
  /** The richer character-state channel (useKrishnaCharacterState's
   *  `requestState`), wired in by app/page.tsx. Optional and additive — the
   *  existing `onMoodChange` calls below are untouched. */
  onPresentation?: RequestStateFn;
}) {
  const [activePreset, setActivePreset] = useState<string>('focus-25');
  const [sessionType, setSessionType] = useState<'focus' | 'break'>('focus');
  const [totalSeconds, setTotalSeconds] = useState<number>(25 * 60);
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [sessionCompleted, setSessionCompleted] = useState<boolean>(false);
  const [completedSessionType, setCompletedSessionType] = useState<'focus' | 'break'>('focus');
  const [completedDurationMin, setCompletedDurationMin] = useState<number>(25);

  const [customFocusList, setCustomFocusList] = useState<string[]>([]);
  const [customBreakList, setCustomBreakList] = useState<string[]>([]);
  const [currentActivity, setCurrentActivity] = useState<string>(DEFAULT_FOCUS_ACTIVITIES[0]);

  /**
   * The backend focus session this timer is recording into.
   *
   * Until this existed the timer was purely client-side, so nothing reached
   * `focus_sessions` and BEST_TIME_OF_DAY / FOCUS_PATTERN / DISTRACTION_PATTERN
   * had no data to read. Every failure here is swallowed: losing a timer
   * because the backend is down would be a bad trade.
   */
  const sessionIdRef = useRef<string | null>(null);
  const elapsedRef = useRef(0);
  const [reflectionPrompt, setReflectionPrompt] = useState<ReflectionPrompt | null>(null);
  const [lastSessionId, setLastSessionId] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load custom saved activities from LocalStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const savedFocus = localStorage.getItem(STORAGE_CUSTOM_FOCUS_KEY);
      if (savedFocus) setCustomFocusList(JSON.parse(savedFocus));
      const savedBreak = localStorage.getItem(STORAGE_CUSTOM_BREAK_KEY);
      if (savedBreak) setCustomBreakList(JSON.parse(savedBreak));
    } catch {}
  }, []);

  /** Open a backend session if one is not already recording. */
  const openSession = useCallback(async (
    minutes: number, type: 'focus' | 'break', activity: string, taskId: number | null,
  ) => {
    if (sessionIdRef.current) return;
    elapsedRef.current = 0;
    try {
      const session = await startFocusSession({
        minutes,
        activity,
        session_type: type,
        mode: guessMode(activity),
        // The legacy todo id is an integer; the backend resolves it to the
        // task's uuid via `seq`, so the time lands on the right task.
        task_id: taskId != null ? String(taskId) : undefined,
        intended: activity,
      });
      sessionIdRef.current = session.id;
    } catch {
      sessionIdRef.current = null;
    }
  }, []);

  /**
   * Close the backend session.
   *
   * `actual_seconds` is the time the timer actually ran, not wall clock —
   * otherwise a session left paused for an hour would be recorded as an hour
   * of focus and poison every average.
   */
  const closeSession = useCallback(async (completed: boolean) => {
    const id = sessionIdRef.current;
    if (!id) return;
    sessionIdRef.current = null;
    const seconds = elapsedRef.current;
    elapsedRef.current = 0;
    try {
      const result = await endFocusSession({
        session_id: id, completed, actual_seconds: seconds,
      });
      setLastSessionId(id);
      if (completed && result.session.session_type === 'focus') {
        setReflectionPrompt(result.reflection_prompt);
      }
    } catch {
      /* the local timer still worked; the recording did not */
    }
  }, []);

  // Timer countdown loop
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        elapsedRef.current += 1;
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsRunning(false);
            setSessionCompleted(true);
            setCompletedSessionType(sessionType);
            setCompletedDurationMin(Math.round(totalSeconds / 60));
            playTimerCompletionChime();
            onMoodChange('happy');
            onPresentation?.(
              { animation: 'CELEBRATING', chakra: 'CELEBRATE', voiceMode: 'HAPPY', particles: true },
              undefined,
              'focusTimer',
              'celebration',
            );
            setTimeout(() => onMoodChange('idle'), 4000);
            void closeSession(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, timeLeft, sessionType, totalSeconds, onMoodChange, onPresentation, closeSession]);

  const handleSelectPreset = useCallback((preset: TimerPreset) => {
    setActivePreset(preset.id);
    setSessionType(preset.type);
    const secs = preset.minutes * 60;
    setTotalSeconds(secs);
    setTimeLeft(secs);
    setIsRunning(false);
    setSessionCompleted(false);

    if (preset.type === 'break') {
      const defaultBreak = preset.minutes >= 10 ? DEFAULT_10M_BREAK_ACTIVITIES[0] : DEFAULT_5M_BREAK_ACTIVITIES[0];
      setCurrentActivity(defaultBreak);
    } else if (!activeTaskId) {
      setCurrentActivity(DEFAULT_FOCUS_ACTIVITIES[0]);
    }
  }, [activeTaskId]);

  const handleStartBreak = useCallback((minutes: number) => {
    const breakPreset = PRESETS.find((p) => p.type === 'break' && p.minutes === minutes) || PRESETS[1];
    handleSelectPreset(breakPreset);
    setIsRunning(true);
  }, [handleSelectPreset]);

  /** FOCUSED presentation for the character-state channel — a slow chakra,
   *  silent voice mode, no particles. Shared by every "a focus run just
   *  started" entry point below. */
  const announceFocusStart = useCallback(() => {
    onPresentation?.(
      { animation: 'FOCUSED', chakra: 'SLOW', voiceMode: 'SILENT', particles: false },
      undefined,
      'focusTimer',
      'focus',
    );
  }, [onPresentation]);

  const handleStartNextFocus = useCallback((minutes: number = 25) => {
    const focusPreset = PRESETS.find((p) => p.type === 'focus' && p.minutes === minutes) || PRESETS[0];
    handleSelectPreset(focusPreset);
    setIsRunning(true);
    announceFocusStart();
  }, [handleSelectPreset, announceFocusStart]);

  const handleToggleTimer = useCallback(() => {
    if (timeLeft === 0) {
      setTimeLeft(totalSeconds);
      setSessionCompleted(false);
      setReflectionPrompt(null);
      setIsRunning(true);
      announceFocusStart();
      void openSession(Math.round(totalSeconds / 60), sessionType, currentActivity, activeTaskId);
      return;
    }
    setSessionCompleted(false);
    setIsRunning((prev) => {
      const next = !prev;
      // Pausing deliberately leaves the session open — they may resume, and a
      // pause is not the end of the work.
      if (next) {
        announceFocusStart();
        void openSession(Math.round(totalSeconds / 60), sessionType, currentActivity, activeTaskId);
      }
      return next;
    });
  }, [timeLeft, totalSeconds, sessionType, currentActivity, activeTaskId, openSession, announceFocusStart]);

  const handleResetTimer = useCallback(() => {
    setIsRunning(false);
    setTimeLeft(totalSeconds);
    setSessionCompleted(false);
    setReflectionPrompt(null);
    // Reset abandons the session: record it as not completed, which is what
    // DISTRACTION_PATTERN reads.
    void closeSession(false);
  }, [totalSeconds, closeSession]);

  const handleFocusTask = useCallback((taskId: number, taskText: string) => {
    if (activeTaskId === taskId && isRunning) {
      setIsRunning(false);
      return;
    }
    setActiveTaskId(taskId);
    setCurrentActivity(taskText);
    setIsExpanded(true);
    setSessionCompleted(false);
    if (sessionType === 'break') {
      const focusPreset = PRESETS[0];
      handleSelectPreset(focusPreset);
    }
    if (!isRunning) {
      setIsRunning(true);
      announceFocusStart();
    }
  }, [activeTaskId, isRunning, sessionType, handleSelectPreset, announceFocusStart]);

  const dismissReflection = useCallback(() => setReflectionPrompt(null), []);

  const handleUnlinkTask = useCallback(() => {
    setActiveTaskId(null);
    setCurrentActivity(DEFAULT_FOCUS_ACTIVITIES[0]);
  }, []);

  const saveCustomActivity = useCallback((text: string, type: 'focus' | 'break') => {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (type === 'focus') {
      if (!customFocusList.includes(trimmed) && !DEFAULT_FOCUS_ACTIVITIES.includes(trimmed)) {
        const updated = [trimmed, ...customFocusList];
        setCustomFocusList(updated);
        try {
          localStorage.setItem(STORAGE_CUSTOM_FOCUS_KEY, JSON.stringify(updated));
        } catch {}
      }
    } else {
      if (!customBreakList.includes(trimmed) && !DEFAULT_5M_BREAK_ACTIVITIES.includes(trimmed) && !DEFAULT_10M_BREAK_ACTIVITIES.includes(trimmed)) {
        const updated = [trimmed, ...customBreakList];
        setCustomBreakList(updated);
        try {
          localStorage.setItem(STORAGE_CUSTOM_BREAK_KEY, JSON.stringify(updated));
        } catch {}
      }
    }
    setCurrentActivity(trimmed);
  }, [customFocusList, customBreakList]);

  return {
    activePreset,
    sessionType,
    totalSeconds,
    timeLeft,
    isRunning,
    isExpanded,
    setIsExpanded,
    activeTaskId,
    setActiveTaskId,
    sessionCompleted,
    setSessionCompleted,
    completedSessionType,
    completedDurationMin,
    customFocusList,
    customBreakList,
    currentActivity,
    setCurrentActivity,
    handleSelectPreset,
    handleStartBreak,
    handleStartNextFocus,
    handleToggleTimer,
    handleResetTimer,
    handleFocusTask,
    handleUnlinkTask,
    saveCustomActivity,
    /** Set when a focus session ran to the end. Asks whether the work
     *  actually landed — the timer finishing is not the same claim. */
    reflectionPrompt,
    dismissReflection,
    lastSessionId,
  };
}

export type FocusTimerHandle = ReturnType<typeof useFocusTimer>;
