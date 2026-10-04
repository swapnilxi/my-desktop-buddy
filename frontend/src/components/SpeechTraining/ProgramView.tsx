'use client';

import { SPEECH_PROGRAM, WEEK_THEMES, isDayUnlocked } from './program';

interface Props {
  completed: number[];
  currentDay: number;
  onOpenDay: (day: number) => void;
}

export default function ProgramView({ completed, currentDay, onOpenDay }: Props) {
  const done = new Set(completed);
  return (
    <div className="st-view">
      {([1, 2, 3, 4] as const).map((w) => (
        <div key={w} className="st-week">
          <h4>Week {w} · {WEEK_THEMES[w].title}</h4>
          <p className="st-muted">{WEEK_THEMES[w].summary}</p>
          {SPEECH_PROGRAM.filter((d) => d.week === w).map((d) => {
            const unlocked = isDayUnlocked(d.day, done);
            const isDone = done.has(d.day);
            return (
              <button
                key={d.day}
                className={`st-day ${isDone ? 'done' : ''} ${d.day === currentDay ? 'current' : ''}`}
                disabled={!unlocked}
                onClick={() => onOpenDay(d.day)}
              >
                <span className="st-day-num">{isDone ? '✓' : unlocked ? d.day : '🔒'}</span>
                <span className="st-day-body">
                  <strong>Day {d.day} · {d.title}</strong>
                  <span>{d.focusLabel.replace(/^Today: /, '')} · ~{d.durationMins} min{d.weeklySummary ? ' · 📅 weekly summary' : ''}</span>
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
