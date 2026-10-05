'use client';

import { useEffect, useRef, useState } from 'react';
import FeedbackCard from './FeedbackCard';
import { LessonBody } from './LessonDialogs';
import { analyzeSpeech, isLessonUnlocked } from '@/lib/speechTraining';
import type { Lesson, Placement, Program, ProgramDay, SpeechSession, WeeklySummary } from '@/lib/speechTraining';
import { useSpeechRecorder } from '@/lib/useSpeechRecorder';
import { speak, stopSpeaking } from '@/lib/speech';
import type { HamsterMood } from '@/lib/api';

interface Props {
  program: Program;
  lesson: Lesson | ProgramDay;
  completedDayIds: Set<string>;
  mode: string;
  buddyName: string;
  onSaved: (session: SpeechSession, weekly: WeeklySummary | null) => void;
  onMoodChange?: (mood: HamsterMood) => void;
  onOpenLesson: (id: string) => void;
  onGenerate: (placement: Placement) => void;
  onModify: (lesson: Lesson) => void;
  onRevert: (lesson: Lesson) => void;
  onDelete: (lesson: Lesson) => void;
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function sourceBadge(lesson: Lesson) {
  if (lesson.source === 'generated') return <span className="st-badge ai">✨ AI-generated</span>;
  if (lesson.source === 'edited') return <span className="st-badge edited">Edited</span>;
  return null;
}

export default function LessonView({
  program, lesson, completedDayIds, mode, buddyName,
  onSaved, onMoodChange, onOpenLesson, onGenerate, onModify, onRevert, onDelete,
}: Props) {
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ session: SpeechSession; weekly: WeeklySummary | null } | null>(null);
  const [question, setQuestion] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const lastQuestion = useRef<string | null>(null);

  const isLocal = mode !== 'deepgram';
  // Long stamina lessons need long recordings: lesson length + 2 min headroom, 6-60 min.
  const maxMinutes = Math.min(60, Math.max(6, lesson.durationMins + 2));
  const rec = useSpeechRecorder({ maxSeconds: maxMinutes * 60, captureTranscript: isLocal });

  const day: ProgramDay | undefined =
    lesson.kind === 'day' ? (lesson as ProgramDay) : program.days.find((d) => d.id === lesson.parentId);
  const week = day ? program.weeks.find((w) => w.week === day.week) : undefined;
  const unlocked = isLessonUnlocked(program, lesson, completedDayIds);
  const firstOpen = program.days.find((d) => !completedDayIds.has(d.id));
  const done = lesson.kind === 'day' && completedDayIds.has(lesson.id);
  // Seed days stay (modify or revert them instead); everything else can be removed.
  const deletable = lesson.kind !== 'day' || lesson.source === 'generated';

  // Don't keep asking a question out loud after leaving the lesson.
  useEffect(() => () => stopSpeaking(), []);

  const run = async (challenge?: string) => {
    setError(null);
    setResult(null);
    onMoodChange?.('listening');
    const out = await rec.start();
    if (!out) {
      onMoodChange?.('idle');
      return;
    }
    if (out.durationSec < 5) {
      setError('That was very short — speak for at least 30 seconds so we can analyze you.');
      onMoodChange?.('idle');
      return;
    }
    setAnalyzing(true);
    onMoodChange?.('thinking');
    try {
      const res = await analyzeSpeech(out.blob, lesson.id, out.transcript || undefined, challenge);
      setResult({ session: res.session, weekly: res.weekly_summary });
      onSaved(res.session, res.weekly_summary);
      const p = res.session.scores.presence;
      onMoodChange?.(p >= 80 ? 'excited' : p >= 60 ? 'happy' : 'idle');
      setTimeout(() => onMoodChange?.('idle'), 6000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed.');
      onMoodChange?.('idle');
    } finally {
      setAnalyzing(false);
      setQuestion(null);
    }
  };

  /** Pressure drill: the buddy asks a hard question out loud, then recording starts. */
  const askAndRecord = () => {
    const pool = lesson.challengeQuestions.filter((q) => q !== lastQuestion.current);
    const q = (pool.length ? pool : lesson.challengeQuestions)[Math.floor(Math.random() * (pool.length || lesson.challengeQuestions.length))];
    lastQuestion.current = q;
    setQuestion(q);
    setAsking(true);
    setResult(null);
    setError(null);
    onMoodChange?.('speaking');
    let started = false;
    const begin = () => {
      if (started) return;
      started = true;
      setAsking(false);
      run(q);
    };
    speak(q, { onEnd: begin });
    // Fallback only for when speech never reports its end; generous so the
    // microphone can't start while the question is still playing.
    setTimeout(begin, Math.min(30000, 6000 + q.length * 150));
  };

  const recording = rec.micState === 'recording';
  const busy = analyzing || asking || rec.micState === 'requesting';

  return (
    <div className="st-view">
      {lesson.kind === 'sublesson' && day && (
        <button type="button" className="st-link" onClick={() => onOpenLesson(day.id)}>← Back to Day {day.day}: {day.title}</button>
      )}

      <div className="st-card st-exercise">
        <div className="st-eyebrow">
          {lesson.kind === 'day' && day && <>Day {day.day} of {program.days.length} · Week {day.week}{week ? `: ${week.title}` : ''}</>}
          {lesson.kind === 'sublesson' && day && <>Sub-lesson · Day {day.day}: {day.title}</>}
          {lesson.kind === 'standalone' && <>Standalone lesson</>}
          {' '}· ~{lesson.durationMins} min
        </div>
        <div className="st-title-row">
          <h3>{lesson.title}</h3>
          {sourceBadge(lesson)}
        </div>
        <LessonBody lesson={lesson} />
        {lesson.kind === 'day' && (lesson as ProgramDay).compareToDays?.length > 0 && (
          <p className="st-muted">📊 Your feedback will compare this recording with Day {(lesson as ProgramDay).compareToDays.join(' and Day ')}.</p>
        )}
        {done && <p className="st-muted">You completed this day — recording again is practice.</p>}
        <div className="st-lesson-actions">
          <button type="button" className="st-btn" onClick={() => onModify(lesson)} disabled={busy || recording}>✨ Modify with AI</button>
          {lesson.revertable && (
            <button type="button" className="st-btn ghost" onClick={() => onRevert(lesson)} disabled={busy || recording}>↺ Revert to original</button>
          )}
          {deletable && (
            <button type="button" className="st-btn ghost danger" onClick={() => onDelete(lesson)} disabled={busy || recording}>🗑 Delete</button>
          )}
        </div>
      </div>

      {!unlocked ? (
        <div className="st-card st-alert">
          🔒 This {lesson.kind === 'day' ? 'day' : 'sub-lesson'} unlocks after you complete
          {firstOpen ? <> <button type="button" className="st-link inline" onClick={() => onOpenLesson(firstOpen.id)}>Day {firstOpen.day}: {firstOpen.title}</button></> : ' the earlier days'}.
        </div>
      ) : (
        <>
          {rec.micState === 'denied' && (
            <div className="st-card st-alert">
              <strong>Microphone access is blocked.</strong>
              <p>
                {buddyName} needs the microphone to coach you. Allow it in your browser/system settings (macOS: System Settings →
                Privacy &amp; Security → Microphone), then try again.
              </p>
              <button className="st-btn" onClick={() => { rec.resetMic(); run(); }}>Try again</button>
            </div>
          )}
          {rec.micState === 'unavailable' && <div className="st-card st-alert">No microphone was found on this device.</div>}
          {error && <div className="st-card st-alert">{error}</div>}

          {question && (
            <div className="st-card st-question" aria-live="polite">
              <div className="st-label">{asking ? `${buddyName} asks…` : 'Answer this — pause first, then slow and low'}</div>
              <p>“{question}”</p>
            </div>
          )}

          <div className="st-recorder">
            <div className="st-record-row">
              <button
                className={`st-record ${recording ? 'recording' : ''}`}
                disabled={busy}
                onClick={recording ? rec.stop : () => run()}
              >
                {analyzing ? '⏳ Analyzing…' : recording ? '⏹ Stop' : asking ? '🔊 Asking…' : result ? '🎙️ Record again' : '🎙️ Start recording'}
              </button>
              {lesson.challengeQuestions.length > 0 && !recording && (
                <button className="st-record secondary" disabled={busy} onClick={askAndRecord}>
                  🎯 Ask me a hard question
                </button>
              )}
            </div>
            {recording && (
              <div className="st-live">
                <div className="st-meter"><div style={{ width: `${Math.round(rec.level * 100)}%` }} /></div>
                <span>{clock(rec.elapsed)} / ~{clock(lesson.durationMins * 60)}</span>
              </div>
            )}
            {!recording && !analyzing && !result && (
              <p className="st-muted">{isLocal ? 'Analyzed locally (Apple / Local mode).' : 'Analyzed with Deepgram.'}</p>
            )}
          </div>

          {result && <FeedbackCard session={result.session} weekly={result.weekly} />}
          {result && lesson.kind === 'day' && (() => {
            const next = program.days[program.days.findIndex((d) => d.id === lesson.id) + 1];
            return next ? (
              <button type="button" className="st-btn primary st-next" onClick={() => onOpenLesson(next.id)}>
                Next: Day {next.day} — {next.title} →
              </button>
            ) : null;
          })()}
        </>
      )}

      {lesson.kind === 'day' && (
        <div className="st-card">
          <div className="st-section-head">
            <h4>Sub-lessons</h4>
            <button type="button" className="st-btn small" onClick={() => onGenerate({ type: 'sublesson', dayId: lesson.id })}>＋ Generate sub-lesson</button>
          </div>
          {(lesson as ProgramDay).sublessons.length === 0 ? (
            <p className="st-muted">Extra drills for this day. Generate one for anything you want to work on.</p>
          ) : (
            <div className="st-sublist">
              {(lesson as ProgramDay).sublessons.map((s) => (
                <div key={s.id} className="st-subitem">
                  <button type="button" className="st-subitem-main" onClick={() => onOpenLesson(s.id)}>
                    <strong>{s.title}</strong>
                    <span className="st-muted">{s.objective || s.focusLabel} · ~{s.durationMins} min{s.challengeQuestions.length ? ' · 🎯 pressure' : ''}</span>
                  </button>
                  <button type="button" className="st-icon-btn" onClick={() => onModify(s)} aria-label={`Modify ${s.title}`} title="Modify with AI">✨</button>
                  <button type="button" className="st-icon-btn" onClick={() => onDelete(s)} aria-label={`Delete ${s.title}`} title="Delete">🗑</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
