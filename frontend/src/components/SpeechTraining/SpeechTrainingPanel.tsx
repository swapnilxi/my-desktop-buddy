'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { BuddyDefinition, BuddyType } from '../Buddies/types';
import { getBuddyDefinition } from '../Buddies/registry';
import type { HamsterMood } from '@/lib/api';
import {
  deleteLesson,
  fetchProgram,
  fetchSpeechState,
  importProgram,
  indexLessons,
  resetProgram,
  resetSpeechProgress,
  revertLesson,
} from '@/lib/speechTraining';
import type { Lesson, Placement, Program, SpeechSession, SpeechState, WeeklySummary } from '@/lib/speechTraining';
import LessonView from './LessonView';
import ProgramView from './ProgramView';
import ProgressView from './ProgressView';
import HistoryView from './HistoryView';
import { GenerateDialog, ModifyDialog } from './LessonDialogs';

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
  const [program, setProgram] = useState<Program | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // undefined = dialog closed; null = open with no preset placement
  const [generateFor, setGenerateFor] = useState<Placement | null | undefined>(undefined);
  const [modifying, setModifying] = useState<Lesson | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [s, p] = await Promise.all([fetchSpeechState(), fetchProgram()]);
      setState(s);
      setProgram(p);
      setLoadError(null);
    } catch {
      setLoadError('Could not reach the backend. Start it and retry.');
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchSpeechState(), fetchProgram()])
      .then(([s, p]) => {
        setState(s);
        setProgram(p);
      })
      .catch(() => setLoadError('Could not reach the backend. Start it and retry.'));
  }, []);

  const completed = useMemo(() => new Set(state?.completed_day_ids ?? []), [state]);
  const lessons = useMemo(() => (program ? indexLessons(program) : new Map<string, Lesson>()), [program]);
  const nextDay = useMemo(
    () => program?.days.find((d) => !completed.has(d.id)) ?? program?.days[program.days.length - 1] ?? null,
    [program, completed]
  );
  const active = (selectedId && lessons.get(selectedId)) || nextDay;
  const totalDays = program?.days.length ?? 0;
  const doneDays = program ? program.days.filter((d) => completed.has(d.id)).length : 0;
  const pct = totalDays ? Math.round((doneDays / totalDays) * 100) : 0;

  const flash = (text: string) => {
    setNotice(text);
    setTimeout(() => setNotice((n) => (n === text ? null : n)), 4000);
  };

  const openLesson = (id: string) => {
    setSelectedId(id);
    setView('today');
  };

  const handleSaved = (session: SpeechSession, weekly: WeeklySummary | null) => {
    // Stay on the lesson just recorded: completing a day moves "next day" forward, which
    // would otherwise swap the view and throw away the instant feedback.
    setSelectedId(session.lesson_id);
    setState((prev) => {
      if (!prev) return prev;
      const ids = session.lesson_kind === 'day'
        ? Array.from(new Set([...prev.completed_day_ids, session.lesson_id]))
        : prev.completed_day_ids;
      const weeklies = weekly ? { ...prev.weekly_summaries, [String(weekly.week)]: weekly } : prev.weekly_summaries;
      return { ...prev, sessions: [...prev.sessions, session], completed_day_ids: ids, weekly_summaries: weeklies };
    });
    fetchSpeechState().then(setState).catch(() => {}); // the streak comes from the server
  };

  const handleDelete = async (lesson: Lesson) => {
    if (!window.confirm(`Delete “${lesson.title}”? Its recorded sessions stay in History.`)) return;
    try {
      const res = await deleteLesson(lesson.id);
      setProgram(res.program);
      if (selectedId === lesson.id) setSelectedId(lesson.kind === 'sublesson' ? lesson.parentId ?? null : null);
      flash(`Deleted “${lesson.title}”.`);
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Delete failed.');
    }
  };

  const handleRevert = async (lesson: Lesson) => {
    if (!window.confirm(`Revert “${lesson.title}” to the original program version?`)) return;
    try {
      const res = await revertLesson(lesson.id);
      setProgram(res.program);
      flash('Reverted to the original.');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Revert failed.');
    }
  };

  const handleImport = async (seed: unknown) => {
    const p = await importProgram(seed);
    setProgram(p);
    setSelectedId(null);
    return `Imported “${p.title}”: ${p.days.length} days in ${p.weeks.length} weeks. Your generated lessons were kept.`;
  };

  const handleResetProgram = async () => {
    if (!window.confirm('Reset the program to the built-in version? Generated lessons and edits are removed (your recorded sessions stay).')) return;
    try {
      setProgram(await resetProgram());
      setSelectedId(null);
      flash('Program reset to the built-in version.');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Reset failed.');
    }
  };

  const handleResetProgress = async () => {
    if (!window.confirm('Reset all Speech Training progress and history? This cannot be undone.')) return;
    await resetSpeechProgress();
    setSelectedId(null);
    await load();
  };

  return (
    <div className="st-root">
      <div className="st-header">
        <div className="st-progress-strip">
          <div><b>Day {nextDay?.day ?? 1}</b><span>of {totalDays}</span></div>
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
        {notice && <div className="st-ok-inline" role="status">{notice}</div>}
        {loadError && (
          <div className="st-card st-alert">
            {loadError} <button className="st-link" onClick={load}>Retry</button>
          </div>
        )}
        {(!state || !program) && !loadError && <p className="st-muted">Loading…</p>}

        {state && program && view === 'today' && active && (
          doneDays >= totalDays && !selectedId ? (
            <div className="st-view">
              <div className="st-card">
                <h3>🎉 Program complete!</h3>
                <p>{effectiveName} is proud of you. Check Progress for your before-and-after, revisit any day from Program, or generate a new lesson.</p>
              </div>
            </div>
          ) : (
            <LessonView
              key={active.id}
              program={program}
              lesson={active}
              completedDayIds={completed}
              mode={state.mode}
              buddyName={effectiveName}
              onSaved={handleSaved}
              onMoodChange={onMoodChange}
              onOpenLesson={openLesson}
              onGenerate={(p) => setGenerateFor(p)}
              onModify={setModifying}
              onRevert={handleRevert}
              onDelete={handleDelete}
            />
          )
        )}
        {state && program && view === 'program' && (
          <ProgramView
            program={program}
            completedDayIds={completed}
            currentDayId={nextDay?.id ?? null}
            onOpenLesson={openLesson}
            onGenerate={(p) => setGenerateFor(p)}
            onImport={handleImport}
            onReset={handleResetProgram}
          />
        )}
        {state && view === 'progress' && <ProgressView sessions={state.sessions} weekly={state.weekly_summaries} />}
        {state && view === 'history' && <HistoryView sessions={state.sessions} program={program} />}

        {state && state.sessions.length > 0 && view === 'history' && (
          <button className="st-link st-danger" onClick={handleResetProgress}>Reset all progress</button>
        )}
      </div>

      {program && generateFor !== undefined && (
        <GenerateDialog
          program={program}
          initial={generateFor}
          onClose={() => setGenerateFor(undefined)}
          onSaved={(lesson, p) => {
            setProgram(p);
            setGenerateFor(undefined);
            openLesson(lesson.id);
            flash(`Saved “${lesson.title}”.`);
          }}
        />
      )}
      {modifying && (
        <ModifyDialog
          lesson={modifying}
          onClose={() => setModifying(null)}
          onApplied={(lesson, p) => {
            setProgram(p);
            setModifying(null);
            flash(`Updated “${lesson.title}”.`);
          }}
        />
      )}
    </div>
  );
}
