'use client';

import { useState } from 'react';
import type { BenchmarkComparison, SpeechSession, Thresholds, WeeklySummary } from '@/lib/speechTraining';

const fmt = (v: number | null | undefined, d = 0) => (v == null ? '—' : v.toFixed(d));
const rng = (r: [number, number]) => `${r[0]}–${r[1]}`;

// Sessions recorded before personal targets existed were scored against these.
const LEGACY: Pick<Thresholds, 'f0_range' | 'wpm_range' | 'filler_pct_max' | 'hedge_pct_max' | 'passive_pct_max' | 'hnr_min_db' | 'jitter_max_pct' | 'shimmer_max_db'> = {
  f0_range: [85, 180], wpm_range: [130, 160], filler_pct_max: 2, hedge_pct_max: 5, passive_pct_max: 30,
  hnr_min_db: 20, jitter_max_pct: 1, shimmer_max_db: 3,
};

interface Row { label: string; value: string; target: string; ok: boolean | null }

function benchmarkRows(s: SpeechSession): Row[] {
  const a = s.acoustic, l = s.language;
  const t = { ...LEGACY, ...(s.thresholds ?? {}) } as Thresholds;
  const in01 = (v: number | null | undefined, lo: number, hi: number) => (v == null ? null : v >= lo && v <= hi);
  const f0 = a.f0_median_hz ?? a.f0_mean_hz;
  const tonal = a.tonal;
  const avg = l.avg_sentence_words;
  const rows: Row[] = [
    { label: 'Speaking pitch (F0)', value: `${fmt(f0)} Hz`, target: `${rng(t.f0_range)} Hz`, ok: in01(f0, t.f0_range[0], t.f0_range[1]) },
    { label: 'Pitch variation', value: `${fmt(a.pitch_variation_st, 1)} st`, target: 'Moderate (2–5)', ok: in01(a.pitch_variation_st, 2, 5) },
    { label: 'HNR', value: `${fmt(a.hnr_db, 1)} dB`, target: `> ${t.hnr_min_db} dB`, ok: a.hnr_db == null ? null : a.hnr_db > t.hnr_min_db },
    { label: 'Jitter', value: `${fmt(a.jitter_pct, 2)}%`, target: `< ${t.jitter_max_pct}%`, ok: a.jitter_pct == null ? null : a.jitter_pct < t.jitter_max_pct },
    { label: 'Shimmer', value: `${fmt(a.shimmer_db, 2)} dB`, target: `< ${t.shimmer_max_db} dB`, ok: a.shimmer_db == null ? null : a.shimmer_db < t.shimmer_max_db },
    { label: 'Chest resonance', value: s.chest?.label ?? '—', target: 'High', ok: s.chest ? s.chest.label === 'high' : null },
    { label: 'Upspeak', value: String(a.upspeak.length), target: '0', ok: a.upspeak.length === 0 },
    { label: 'Pace', value: `${fmt(l.wpm)} WPM`, target: `${rng(t.wpm_range)} WPM`, ok: in01(l.wpm, t.wpm_range[0], t.wpm_range[1]) },
  ];
  if (t.pauses_per_min && tonal?.pauses) {
    const ppm = tonal.pauses.deliberate_per_min;
    rows.push({ label: 'Deliberate pauses', value: `${fmt(ppm, 1)} / min`, target: `${rng(t.pauses_per_min)} / min`, ok: ppm == null ? null : ppm >= t.pauses_per_min[0] });
  }
  if (t.avg_sentence_words_max && avg != null) {
    rows.push({ label: 'Average sentence', value: `${fmt(avg)} words`, target: `< ${t.avg_sentence_words_max} words`, ok: avg <= t.avg_sentence_words_max });
  }
  rows.push(
    { label: 'Filler words', value: `${fmt(l.fillers.pct, 1)}%`, target: `< ${t.filler_pct_max}%`, ok: l.fillers.pct == null ? null : l.fillers.pct < Math.max(t.filler_pct_max, 0.01) },
    { label: 'Hedging', value: `${fmt(l.hedge_pct, 0)}% of sentences`, target: t.hedge_pct_max === 0 ? 'Zero' : `< ${t.hedge_pct_max}%`,
      ok: l.hedge_pct == null ? null : t.hedge_pct_max === 0 ? l.hedge_pct === 0 : l.hedge_pct < t.hedge_pct_max },
    { label: 'Active voice', value: `${fmt(l.passive_pct == null ? null : 100 - l.passive_pct)}%`, target: `> ${100 - t.passive_pct_max}%`,
      ok: l.passive_pct == null ? null : l.passive_pct < t.passive_pct_max },
  );
  return rows;
}

function BenchmarkCard({ c }: { c: BenchmarkComparison }) {
  if (c.missing || !c.scores || !c.metrics) {
    return (
      <div className="st-card">
        <h4>📊 Benchmark vs Day {c.day ?? '?'}</h4>
        <p className="st-muted">Record Day {c.day} ({c.title}) to unlock this comparison.</p>
      </div>
    );
  }
  const delta = (n: number) => <span className={`st-delta ${n > 0 ? 'good' : n < 0 ? 'low' : ''}`}>{n > 0 ? '+' : ''}{n}</span>;
  return (
    <div className="st-card">
      <h4>📊 Benchmark vs Day {c.day} — {c.title}</h4>
      <div className="st-bench-scores">
        <span>Presence {delta(c.scores.presence)}</span>
        <span>Confidence {delta(c.scores.confidence)}</span>
        <span>Clarity {delta(c.scores.clarity)}</span>
        <span>Authority {delta(c.scores.authority)}</span>
      </div>
      <table className="st-table">
        <tbody>
          {c.metrics.filter((m) => m.before != null && m.after != null).map((m) => {
            const before = m.before as number, after = m.after as number;
            const improved = m.better === 'lower' ? after < before : m.better === 'higher' ? after > before
              : m.range ? Math.abs(after - (m.range[0] + m.range[1]) / 2) < Math.abs(before - (m.range[0] + m.range[1]) / 2) : null;
            return (
              <tr key={m.label}>
                <td>{m.label}</td>
                <td className="st-muted">{before.toFixed(m.unit === '/min' ? 1 : 0)}{m.unit}</td>
                <td className={after === before || improved == null ? '' : improved ? 'ok' : 'bad'}>{after.toFixed(m.unit === '/min' ? 1 : 0)}{m.unit}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
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

      {s.benchmark_comparisons?.map((c) => <BenchmarkCard key={c.lesson_id} c={c} />)}

      {s.extras?.pressure && (
        <div className="st-card st-question">
          <div className="st-label">Pressure drill</div>
          <p>“{s.extras.pressure.question}”</p>
        </div>
      )}

      {s.tonal_moves && s.tonal_moves.length > 0 && (
        <div className="st-card">
          <h4>🎼 Tonal signature</h4>
          <p className="st-muted">The five moves of a calm, deep, certain executive voice.</p>
          <ul className="st-moves">
            {s.tonal_moves.map((m) => (
              <li key={m.key} className={m.ok == null ? 'na' : m.ok ? 'ok' : 'bad'}>
                <span className="st-move-icon" aria-hidden="true">{m.ok == null ? '–' : m.ok ? '✓' : '✗'}</span>
                <span className="st-move-body">
                  <strong>{m.move}</strong>
                  <span>{m.value}</span>
                  <span className="st-muted">Target: {m.target}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {s.targets && s.targets.length > 0 && (
        <div className="st-card">
          <h4>Pitch training targets</h4>
          <table className="st-table st-targets">
            <thead>
              <tr><th>Parameter</th><th>Now</th><th>Target</th></tr>
            </thead>
            <tbody>
              {s.targets.map((r) => (
                <tr key={r.param}>
                  <td>{r.param}</td>
                  <td className={r.ok == null ? '' : r.ok ? 'ok' : 'bad'}>{r.ok == null ? '' : r.ok ? '✓ ' : '✗ '}{r.current}</td>
                  <td className="st-muted">{r.target}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
        <h4>Your targets</h4>
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
