'use client';

import { useState } from 'react';
import type { Program, SpeechSession } from '@/lib/speechTraining';
import FeedbackCard from './FeedbackCard';

function sessionLabel(s: SpeechSession, program: Program | null): string {
  const live = program?.days.find((d) => d.id === s.lesson_id);
  const title = s.lesson_title || live?.title || 'Session';
  if (s.lesson_kind === 'sublesson') return `Sub-lesson${s.day ? ` · Day ${s.day}` : ''} · ${title}`;
  if (s.lesson_kind === 'standalone') return `Standalone · ${title}`;
  return `Day ${live?.day ?? s.day ?? '?'} · ${title}`;
}

export default function HistoryView({ sessions, program }: { sessions: SpeechSession[]; program: Program | null }) {
  const [open, setOpen] = useState<string | null>(null);
  if (sessions.length === 0) {
    return <div className="st-view"><div className="st-card"><p>No sessions yet. Record Day 1 to get started.</p></div></div>;
  }
  return (
    <div className="st-view">
      {[...sessions].reverse().map((s) => {
        const top = s.flags.filter((f) => f.severity === 'warn').slice(0, 2).map((f) => f.title).join(' · ');
        return (
          <div key={s.id} className="st-history-item">
            <button className="st-history-row" onClick={() => setOpen(open === s.id ? null : s.id)}>
              <span className="st-history-main">
                <strong>{sessionLabel(s, program)}{s.challenge ? ' · 🎯' : ''}</strong>
                <span className="st-muted">
                  {new Date(s.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} · {s.mode === 'deepgram' ? 'Deepgram' : 'Local'}
                  {' '}· {Math.max(1, Math.round((s.acoustic.duration_sec || 0) / 60))} min
                </span>
                <span className="st-muted">{top || 'No major flags 🎉'}</span>
              </span>
              <span className="st-history-scores">
                <b>{s.scores.presence}</b>
                <small>C {s.scores.confidence} · Cl {s.scores.clarity} · A {s.scores.authority}</small>
              </span>
            </button>
            {open === s.id && <FeedbackCard session={s} />}
          </div>
        );
      })}
    </div>
  );
}
