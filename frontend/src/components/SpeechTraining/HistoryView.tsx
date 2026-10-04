'use client';

import { useState } from 'react';
import type { SpeechSession } from '@/lib/speechTraining';
import { getSpeechDay } from './program';
import FeedbackCard from './FeedbackCard';

export default function HistoryView({ sessions }: { sessions: SpeechSession[] }) {
  const [open, setOpen] = useState<string | null>(null);
  if (sessions.length === 0) {
    return <div className="st-view"><div className="st-card"><p>No sessions yet. Record Day 1 to get started.</p></div></div>;
  }
  return (
    <div className="st-view">
      {[...sessions].reverse().map((s) => {
        const d = getSpeechDay(s.day);
        const top = s.flags.filter((f) => f.severity === 'warn').slice(0, 2).map((f) => f.title).join(' · ');
        return (
          <div key={s.id} className="st-history-item">
            <button className="st-history-row" onClick={() => setOpen(open === s.id ? null : s.id)}>
              <span className="st-history-main">
                <strong>Day {s.day} · {d?.title ?? 'Session'}</strong>
                <span className="st-muted">
                  {new Date(s.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} · {s.mode === 'deepgram' ? 'Deepgram' : 'Local'}
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
