'use client';

import type { SpeechSession, WeeklySummary } from '@/lib/speechTraining';
import { WeeklySummaryCard } from './FeedbackCard';

interface Metric {
  label: string;
  unit: string;
  get: (s: SpeechSession) => number | null;
  target?: [number, number];
  lowerIsBetter?: boolean;
}

const METRICS: Metric[] = [
  { label: 'Executive Presence', unit: '', get: (s) => s.scores.presence, target: [80, 100] },
  { label: 'F0 baseline', unit: ' Hz', get: (s) => s.acoustic.f0_mean_hz, target: [85, 180], lowerIsBetter: true },
  { label: 'HNR', unit: ' dB', get: (s) => s.acoustic.hnr_db, target: [20, 40] },
  { label: 'Pace', unit: ' WPM', get: (s) => s.language.wpm, target: [130, 160] },
  { label: 'Filler words', unit: '', get: (s) => s.language.fillers.count, lowerIsBetter: true },
  // Tonal signature (sessions recorded before these existed simply have no point)
  { label: 'Pitch vs Day 1', unit: '%', get: (s) => s.extras?.pitch_change_pct ?? null, target: [-15, -10], lowerIsBetter: true },
  { label: 'Firm landings', unit: '%', get: (s) => s.acoustic.tonal?.landing_pct ?? null, target: [85, 100] },
  { label: 'Deliberate pauses', unit: '/min', get: (s) => s.acoustic.tonal?.pauses?.deliberate_per_min ?? null, target: [1.5, 6] },
];

function TrendChart({ metric, sessions }: { metric: Metric; sessions: SpeechSession[] }) {
  const pts = sessions.map((s, i) => ({ i, v: metric.get(s) })).filter((p): p is { i: number; v: number } => p.v != null);
  if (pts.length === 0) return null;
  const W = 300, H = 110, PAD = 14;
  const vals = pts.map((p) => p.v);
  const lo0 = Math.min(...vals, metric.target ? metric.target[0] : Infinity);
  const hi0 = Math.max(...vals, metric.target ? metric.target[1] : -Infinity);
  const span = hi0 - lo0 || 1;
  const lo = lo0 - span * 0.1, hi = hi0 + span * 0.1;
  const x = (i: number) => PAD + (sessions.length <= 1 ? (W - 2 * PAD) / 2 : (i / (sessions.length - 1)) * (W - 2 * PAD));
  const y = (v: number) => H - PAD - ((v - lo) / (hi - lo)) * (H - 2 * PAD);
  const first = pts[0].v, last = pts[pts.length - 1].v;
  const delta = last - first;
  const improved = metric.lowerIsBetter ? delta < 0 : delta > 0;
  const path = pts.map((p, k) => `${k ? 'L' : 'M'}${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');

  return (
    <div className="st-card st-chart">
      <div className="st-chart-head">
        <strong>{metric.label}</strong>
        <span className={`st-delta ${delta === 0 ? '' : improved ? 'good' : 'low'}`}>
          {first.toFixed(0)} → {last.toFixed(0)}{metric.unit}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${metric.label} trend across sessions`}>
        {metric.target && (
          <rect x={PAD} width={W - 2 * PAD} y={y(Math.min(metric.target[1], hi))} height={Math.max(2, y(Math.max(metric.target[0], lo)) - y(Math.min(metric.target[1], hi)))} className="st-target" />
        )}
        {/* first session baseline overlay — before vs. after */}
        <line x1={PAD} x2={W - PAD} y1={y(first)} y2={y(first)} className="st-baseline" />
        <path d={path} className="st-line" fill="none" />
        {pts.map((p) => <circle key={p.i} cx={x(p.i)} cy={y(p.v)} r={p.i === pts[0].i ? 4 : 3} className={p.i === pts[0].i ? 'st-dot-first' : 'st-dot'} />)}
      </svg>
      <div className="st-muted st-legend">— current &nbsp; ┄ first session{metric.target ? ' · shaded = target' : ''}</div>
    </div>
  );
}

export default function ProgressView({ sessions, weekly }: { sessions: SpeechSession[]; weekly: Record<string, WeeklySummary> }) {
  if (sessions.length === 0) {
    return <div className="st-view"><div className="st-card"><p>Complete your first session to see trends here.</p></div></div>;
  }
  const first = sessions[0], last = sessions[sessions.length - 1];
  const summaries = Object.values(weekly).sort((a, b) => a.week - b.week);
  return (
    <div className="st-view">
      {sessions.length > 1 && (
        <div className="st-card">
          <h4>First session vs. latest</h4>
          <table className="st-table">
            <tbody>
              {METRICS.map((m) => {
                const a = m.get(first), b = m.get(last);
                if (a == null || b == null) return null;
                const better = m.lowerIsBetter ? b < a : b > a;
                return (
                  <tr key={m.label}>
                    <td>{m.label}</td>
                    <td className="st-muted">{a.toFixed(0)}{m.unit}</td>
                    <td className={b === a ? '' : better ? 'ok' : 'bad'}>{b.toFixed(0)}{m.unit}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {METRICS.map((m) => <TrendChart key={m.label} metric={m} sessions={sessions} />)}
      {summaries.map((s) => <WeeklySummaryCard key={s.week} summary={s} />)}
    </div>
  );
}
