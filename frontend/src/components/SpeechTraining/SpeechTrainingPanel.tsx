'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { BuddyDefinition, BuddyType } from '../Buddies/types';
import { getBuddyDefinition } from '../Buddies/registry';
import type { HamsterMood } from '@/lib/api';
import { fetchSpeechState, resetSpeechProgress } from '@/lib/speechTraining';
import type { SpeechSession, SpeechState, WeeklySummary } from '@/lib/speechTraining';
import { TOTAL_DAYS, getSpeechDay } from './program';
import TodayView from './TodayView';
import ProgramView from './ProgramView';
import ProgressView from './ProgressView';
import HistoryView from './HistoryView';

type ViewId = 'today' | 'program' | 'progress' | 'history';

const VIEWS: { id: ViewId; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'program', label: 'Program' },
  { id: 'progress', label: 'Progress' },
  { id: 'history', label: 'History' },
];

interface SpeechTrainingPanelProps {
  buddyType?: BuddyType | string;
  buddyName?: string;
  buddyDef?: BuddyDefinition;
  onMoodChange?: (mood: HamsterMood) => void;
}

export default function SpeechTrainingPanel({
  buddyType = 'hamster',
  buddyName,
  buddyDef,
  onMoodChange,
}: SpeechTrainingPanelProps) {
  const effectiveDef = buddyDef || getBuddyDefinition(buddyType);
  const effectiveName = buddyName || effectiveDef.defaultName;

  const [view, setView] = useState<ViewId>('today');
  const [state, setState] = useState<SpeechState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setState(await fetchSpeechState());
      setLoadError(null);
    } catch {
      setLoadError('Could not reach the backend. Start it and retry.');
    }
  }, []);

  useEffect(() => {
    fetchSpeechState().then(setState).catch(() => setLoadError('Could not reach the backend. Start it and retry.'));
  }, []);

  const completed = useMemo(() => state?.completed_days ?? [], [state]);
  const nextDay = useMemo(() => {
    for (let d = 1; d <= TOTAL_DAYS; d++) if (!completed.includes(d)) return d;
    return TOTAL_DAYS;
  }, [completed]);
  const activeDay = getSpeechDay(selectedDay ?? nextDay)!;
  const pct = Math.round((completed.length / TOTAL_DAYS) * 100);
  const allDone = completed.length >= TOTAL_DAYS;

  const handleSaved = (session: SpeechSession, weekly: WeeklySummary | null) => {
    setState((prev) => {
      if (!prev) return prev;
      const sessions = [...prev.sessions, session];
      const days = Array.from(new Set([...prev.completed_days, session.day])).sort((a, b) => a - b);
      const weeklies = weekly ? { ...prev.weekly_summaries, [String(weekly.week)]: weekly } : prev.weekly_summaries;
      return { ...prev, sessions, completed_days: days, weekly_summaries: weeklies };
    });
    load(); // refresh streak from the server
  };

  const handleReset = async () => {
    if (!window.confirm('Reset all Speech Training progress and history? This cannot be undone.')) return;
    await resetSpeechProgress();
    setSelectedDay(null);
    await load();
  };

  return (
    <div className="st-root">
      <div className="st-header">
        <div className="st-progress-strip">
          <div><b>Day {Math.min(nextDay, TOTAL_DAYS)}</b><span>of {TOTAL_DAYS}</span></div>
          <div><b>🔥 {state?.streak ?? 0}</b><span>day streak</span></div>
          <div><b>{pct}%</b><span>complete</span></div>
        </div>
        <div className="st-bar"><div style={{ width: `${pct}%` }} /></div>
        <nav className="st-nav" role="tablist">
          {VIEWS.map((v) => (
            <button key={v.id} role="tab" aria-selected={view === v.id} className={view === v.id ? 'active' : ''} onClick={() => setView(v.id)}>
              {v.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="st-body">
        {loadError && (
          <div className="st-card st-alert">
            {loadError} <button className="st-link" onClick={load}>Retry</button>
          </div>
        )}
        {!state && !loadError && <p className="st-muted">Loading…</p>}

        {state && view === 'today' && (
          allDone && selectedDay == null ? (
            <div className="st-view">
              <div className="st-card">
                <h3>🎉 30 days complete!</h3>
                <p>{effectiveName} is proud of you. Check Progress for your before-and-after, or revisit any day from Program.</p>
              </div>
            </div>
          ) : (
            <TodayView
              key={activeDay.day}
              day={activeDay}
              alreadyDone={completed.includes(activeDay.day)}
              mode={state.mode}
              onSaved={handleSaved}
              onMoodChange={onMoodChange}
              buddyName={effectiveName}
            />
          )
        )}
        {state && view === 'program' && (
          <ProgramView
            completed={completed}
            currentDay={nextDay}
            onOpenDay={(d) => { setSelectedDay(d); setView('today'); }}
          />
        )}
        {state && view === 'progress' && <ProgressView sessions={state.sessions} weekly={state.weekly_summaries} />}
        {state && view === 'history' && <HistoryView sessions={state.sessions} />}

        {state && state.sessions.length > 0 && view === 'history' && (
          <button className="st-link st-danger" onClick={handleReset}>Reset all progress</button>
        )}
      </div>
    </div>
  );
}

