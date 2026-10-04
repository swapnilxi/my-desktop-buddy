'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { HamsterMood } from '@/lib/api';
import { playTimerCompletionChime } from '@/lib/audio';

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

export function useFocusTimer({ onMoodChange }: { onMoodChange: (mood: HamsterMood) => void }) {
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

  // Timer countdown loop
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsRunning(false);
            setSessionCompleted(true);
            setCompletedSessionType(sessionType);
            setCompletedDurationMin(Math.round(totalSeconds / 60));
            playTimerCompletionChime();
            onMoodChange('happy');
            setTimeout(() => onMoodChange('idle'), 4000);
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
  }, [isRunning, timeLeft, sessionType, totalSeconds, onMoodChange]);

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

  const handleStartNextFocus = useCallback((minutes: number = 25) => {
    const focusPreset = PRESETS.find((p) => p.type === 'focus' && p.minutes === minutes) || PRESETS[0];
    handleSelectPreset(focusPreset);
    setIsRunning(true);
  }, [handleSelectPreset]);

  const handleToggleTimer = useCallback(() => {
    if (timeLeft === 0) {
      setTimeLeft(totalSeconds);
      setSessionCompleted(false);
      setIsRunning(true);
      return;
    }
    setSessionCompleted(false);
    setIsRunning((prev) => !prev);
  }, [timeLeft, totalSeconds]);

  const handleResetTimer = useCallback(() => {
    setIsRunning(false);
    setTimeLeft(totalSeconds);
    setSessionCompleted(false);
  }, [totalSeconds]);

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
    }
  }, [activeTaskId, isRunning, sessionType, handleSelectPreset]);

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
  };
}

export type FocusTimerHandle = ReturnType<typeof useFocusTimer>;
