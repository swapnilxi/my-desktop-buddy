'use client';

import { useRef, useState } from 'react';
import { isLessonUnlocked } from '@/lib/speechTraining';
import type { Lesson, Placement, Program } from '@/lib/speechTraining';

interface Props {
  program: Program;
  completedDayIds: Set<string>;
  currentDayId: string | null;
  onOpenLesson: (id: string) => void;
  onGenerate: (placement: Placement | null) => void;
  onImport: (seed: unknown) => Promise<string>;
  onReset: () => void;
}

function Badge({ lesson }: { lesson: Lesson }) {
  if (lesson.source === 'generated') return <span className="st-badge ai" title="AI-generated">✨</span>;
  if (lesson.source === 'edited') return <span className="st-badge edited" title="Edited">✎</span>;
  return null;
}

export default function ProgramView({ program, completedDayIds, currentDayId, onOpenLesson, onGenerate, onImport, onReset }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const pickFile = async (file: File | undefined) => {
    if (!file) return;
    setImportMsg(null);
    try {
      const seed = JSON.parse(await file.text());
      setImportMsg({ ok: true, text: await onImport(seed) });
    } catch (e) {
      setImportMsg({ ok: false, text: e instanceof SyntaxError ? 'That file is not valid JSON.' : e instanceof Error ? e.message : 'Import failed.' });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="st-view">
      <div className="st-card st-program-head">
        <div>
          <h3>{program.title}</h3>
          {program.description && <p className="st-objective">{program.description}</p>}
          <p className="st-muted">{program.days.length} days · {program.weeks.length} weeks · {program.standalone.length} standalone lesson{program.standalone.length === 1 ? '' : 's'}</p>
        </div>
        <div className="st-lesson-actions">
          <button type="button" className="st-btn primary" onClick={() => onGenerate(null)}>✨ Generate lesson</button>
          <button type="button" className="st-btn" onClick={() => fileRef.current?.click()}>⇪ Import program JSON</button>
          <button type="button" className="st-btn ghost" onClick={onReset}>↺ Reset program</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => pickFile(e.target.files?.[0])} aria-label="Program JSON file" />
        </div>
        {importMsg && <div className={importMsg.ok ? 'st-ok-inline' : 'st-alert-inline'}>{importMsg.text}</div>}
      </div>

      {program.weeks.map((w) => {
        const days = program.days.filter((d) => d.week === w.week);
        if (!days.length) return null;
        return (
          <div key={w.week} className="st-week">
            <h4>Week {w.week} · {w.title}</h4>
            {w.subtitle && <p className="st-week-subtitle">{w.subtitle}</p>}
            {w.summary && <p className="st-muted">{w.summary}</p>}
            {days.map((d) => {
              const unlocked = isLessonUnlocked(program, d, completedDayIds);
              const isDone = completedDayIds.has(d.id);
              return (
                <div key={d.id} className="st-day-group">
                  <button
                    type="button"
                    className={`st-day ${isDone ? 'done' : ''} ${d.id === currentDayId ? 'current' : ''} ${unlocked ? '' : 'locked'}`}
                    onClick={() => onOpenLesson(d.id)}
                    // Locked days stay openable so a lesson can be previewed or modified ahead of time.
                    title={unlocked ? undefined : 'Locked until the earlier days are done — you can still preview or modify it'}
                  >
                    <span className="st-day-num">{isDone ? '✓' : unlocked ? d.day : '🔒'}</span>
                    <span className="st-day-body">
                      <strong>Day {d.day} · {d.title} <Badge lesson={d} />{!unlocked && <span className="sr-only"> (locked)</span>}</strong>
                      <span>
                        {d.focusLabel.replace(/^Today: /, '')} · ~{d.durationMins} min
                        {d.weeklySummary ? ' · 📅 weekly summary' : ''}
                        {d.benchmark ? ' · 📌 benchmark' : ''}
                        {d.challengeQuestions.length ? ' · 🎯 pressure' : ''}
                      </span>
                    </span>
                  </button>
                  {d.sublessons.map((s) => (
                    <button key={s.id} type="button" className="st-subrow" onClick={() => onOpenLesson(s.id)}>
                      <span aria-hidden="true">↳</span>
                      <span className="st-subrow-title">{s.title} <Badge lesson={s} /></span>
                      <span className="st-muted">~{s.durationMins} min</span>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        );
      })}

      <div className="st-week">
        <div className="st-section-head">
          <h4>Standalone lessons</h4>
          <button type="button" className="st-btn small" onClick={() => onGenerate({ type: 'standalone' })}>＋ Generate standalone</button>
        </div>
        {program.standalone.length === 0 ? (
          <p className="st-muted">Lessons outside the day-by-day sequence — practice them any time.</p>
        ) : (
          program.standalone.map((s) => (
            <button key={s.id} type="button" className="st-day" onClick={() => onOpenLesson(s.id)}>
              <span className="st-day-num">★</span>
              <span className="st-day-body">
                <strong>{s.title} <Badge lesson={s} /></strong>
                <span>{s.focusLabel.replace(/^Today: /, '')} · ~{s.durationMins} min{s.challengeQuestions.length ? ' · 🎯 pressure' : ''}</span>
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
