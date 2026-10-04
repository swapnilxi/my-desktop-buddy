'use client';

import { useState } from 'react';
import type { SpeechSession, WeeklySummary } from '@/lib/speechTraining';

const fmt = (v: number | null | undefined, d = 0) => (v == null ? '—' : v.toFixed(d));

interface Row { label: string; value: string; target: string; ok: boolean | null }

function benchmarkRows(s: SpeechSession): Row[] {
  const a = s.acoustic, l = s.language;
  const in01 = (v: number | null, lo: number, hi: number) => (v == null ? null : v >= lo && v <= hi);
  return [
    { label: 'Pitch (F0)', value: `${fmt(a.f0_mean_hz)} Hz`, target: '85–180 Hz', ok: in01(a.f0_mean_hz, 85, 180) },
    { label: 'Pitch variation', value: `${fmt(a.pitch_variation_st, 1)} st`, target: 'Moderate (2–5)', ok: in01(a.pitch_variation_st, 2, 5) },
    { label: 'HNR', value: `${fmt(a.hnr_db, 1)} dB`, target: '> 20 dB', ok: a.hnr_db == null ? null : a.hnr_db > 20 },
    { label: 'Jitter', value: `${fmt(a.jitter_pct, 2)}%`, target: '< 1%', ok: a.jitter_pct == null ? null : a.jitter_pct < 1 },
    { label: 'Shimmer', value: `${fmt(a.shimmer_db, 2)} dB`, target: '< 3 dB', ok: a.shimmer_db == null ? null : a.shimmer_db < 3 },
    { label: 'Chest resonance', value: s.chest?.label ?? '—', target: 'High', ok: s.chest ? s.chest.label === 'high' : null },
    { label: 'Upspeak', value: String(a.upspeak.length), target: '0', ok: a.upspeak.length === 0 },
    { label: 'Pace', value: `${fmt(l.wpm)} WPM`, target: '130–160', ok: in01(l.wpm, 130, 160) },
    { label: 'Filler words', value: `${fmt(l.fillers.pct, 1)}%`, target: '< 2%', ok: l.fillers.pct == null ? null : l.fillers.pct < 2 },
    { label: 'Hedging', value: `${fmt(l.hedge_pct, 0)}% of sentences`, target: '< 5%', ok: l.hedge_pct == null ? null : l.hedge_pct < 5 },
    { label: 'Active voice', value: `${fmt(l.passive_pct == null ? null : 100 - l.passive_pct)}%`, target: '> 70%', ok: l.passive_pct == null ? null : 100 - l.passive_pct > 70 },
  ];
}

const scoreClass = (n: number) => (n >= 80 ? 'good' : n >= 60 ? 'ok' : 'low');

function Score({ label, value, headline }: { label: string; value: number; headline?: boolean }) {
  return (
    <div className={`st-score ${headline ? 'headline' : ''} ${scoreClass(value)}`}>
      <div className="st-score-num">{value}</div>
      <div className="st-score-label">{label}</div>
    </div>
  );
}

export function WeeklySummaryCard({ summary }: { summary: WeeklySummary }) {
  return (
    <div className="st-card st-weekly">
      <h4>📅 Week {summary.week} summary</h4>
      <p className="st-muted">
        {summary.sessions} session{summary.sessions === 1 ? '' : 's'} · avg Executive Presence {summary.avg_presence} · compared with {summary.compared_to}
      </p>
      <div className="st-two-col">
        <div>
          <div className="st-label">Biggest gains</div>
          {summary.biggest_gains.length === 0 && <p className="st-muted">Keep going — gains show up as you repeat sessions.</p>}
          {summary.biggest_gains.map((g) => (
            <div key={g.label} className="st-pill good">▲ {g.label} +{g.delta}</div>
          ))}
        </div>
        <div>
          <div className="st-label">Top 3 to work on</div>
          {summary.work_on.map((g) => (
            <div key={g.label} className="st-pill low">{g.label} · {g.score}/100</div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function FeedbackCard({ session, weekly }: { session: SpeechSession; weekly?: WeeklySummary | null }) {
  const [showTranscript, setShowTranscript] = useState(false);
  const s = session;
  const rows = benchmarkRows(s);
  const suggestions = s.flags.filter((f) => f.said && f.try);
  const timed = s.flags.filter((f) => f.t != null);
  const other = s.flags.filter((f) => !f.said && f.t == null && f.kind !== 'sentiment');

  return (
    <div className="st-feedback">
      <div className="st-card">
        <div className="st-feedback-head">
          <Score label="Executive Presence" value={s.scores.presence} headline />
          <div className="st-score-row">
            <Score label="Confidence" value={s.scores.confidence} />
            <Score label="Clarity" value={s.scores.clarity} />
            <Score label="Authority" value={s.scores.authority} />
          </div>
        </div>
        <div className="st-mode-tag">{s.mode === 'deepgram' ? 'Analyzed with Deepgram' : 'Analyzed locally'}</div>
        {s.notes.map((n) => <div key={n} className="st-muted">ℹ️ {n}</div>)}
      </div>

      {weekly && <WeeklySummaryCard summary={weekly} />}

      <div className="st-card">
        <h4>Tone</h4>
        <div className="st-pill info">{s.sentiment.label}</div>
        <p className="st-muted">{s.sentiment.coaching}</p>
        {s.intent?.available ? (
          <>
            <div className="st-label">Detected intent</div>
            <div className="st-chips">
              {s.intent.categories.slice(0, 4).map((c) => (
                <span key={c.intent} className="st-chip">{c.intent}</span>
              ))}
            </div>
          </>
        ) : s.mode === 'local' ? (
          <p className="st-nudge">💡 Connect Deepgram for deeper intent analysis</p>
        ) : null}
      </div>

      {suggestions.length > 0 && (
        <div className="st-card">
          <h4>Say this instead</h4>
          {suggestions.map((f, i) => (
            <div key={i} className="st-swap">
              <div className="st-swap-said"><span>You said</span>“{f.said}”</div>
              <div className="st-swap-arrow">→</div>
              <div className="st-swap-try"><span>Try</span>“{f.try}”</div>
            </div>
          ))}
        </div>
      )}

      {(timed.length > 0 || other.length > 0) && (
        <div className="st-card">
          <h4>Flagged moments</h4>
          <ul className="st-flags">
            {[...timed, ...other].map((f, i) => (
              <li key={i} className={f.severity}>
                <strong>{f.title}</strong>
                <span>{f.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="st-card">
        <h4>Ideal executive voice</h4>
        <table className="st-table">
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <td>{r.label}</td>
                <td className={r.ok == null ? '' : r.ok ? 'ok' : 'bad'}>{r.ok == null ? '' : r.ok ? '✓ ' : '✗ '}{r.value}</td>
                <td className="st-muted">{r.target}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {s.chest && <p className="st-muted">{s.chest.explanation}</p>}
      </div>

      <button className="st-link" onClick={() => setShowTranscript((v) => !v)}>
        {showTranscript ? 'Hide transcript' : 'Show transcript'}
      </button>
      {showTranscript && <div className="st-card st-transcript">{s.transcript}</div>}
    </div>
  );
}
