'use client';

import { useState } from 'react';
import { SPEECH_PROGRAM, WEEK_THEMES } from './program';
import type { SpeechDay } from './program';
import FeedbackCard from './FeedbackCard';
import { analyzeSpeech } from '@/lib/speechTraining';
import type { SpeechSession, WeeklySummary } from '@/lib/speechTraining';
import { useSpeechRecorder } from '@/lib/useSpeechRecorder';
import type { HamsterMood } from '@/lib/api';

interface Props {
  day: SpeechDay;
  alreadyDone: boolean;
  mode: string;
  onSaved: (session: SpeechSession, weekly: WeeklySummary | null) => void;
  onMoodChange?: (mood: HamsterMood) => void;
  buddyName: string;
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export default function TodayView({ day, alreadyDone, mode, onSaved, onMoodChange, buddyName }: Props) {
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ session: SpeechSession; weekly: WeeklySummary | null } | null>(null);

  const isLocal = mode !== 'deepgram';
  const rec = useSpeechRecorder({ maxSeconds: 6 * 60, captureTranscript: isLocal });

  const run = async () => {
    setError(null);
    setResult(null);
    onMoodChange?.('listening');
    const out = await rec.start();
    if (!out) { onMoodChange?.('idle'); return; }
    if (out.durationSec < 5) {
      setError('That was very short — speak for at least 30 seconds so we can analyze you.');
      onMoodChange?.('idle');
      return;
    }
    setAnalyzing(true);
    onMoodChange?.('thinking');
    try {
      const res = await analyzeSpeech(out.blob, day.day, out.transcript || undefined);
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
    }
  };

  const recording = rec.micState === 'recording';
  const targetSec = day.durationMins * 60;
  const total = SPEECH_PROGRAM.length;

  return (
    <div className="st-view">
      <div className="st-card st-exercise">
        <div className="st-eyebrow">
          Day {day.day} of {total} · Week {day.week}: {WEEK_THEMES[day.week].title} · ~{day.durationMins} min
        </div>
        <h3>{day.title}</h3>
        <p className="st-objective">{day.objective}</p>
        <div className="st-focus">🎯 {day.focusLabel}</div>
        <p className="st-prompt">{day.prompt}</p>
        <p className="st-muted">✅ {day.successCriteria}</p>
        {alreadyDone && <p className="st-muted">You completed this day — recording again is practice.</p>}
      </div>

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
      {rec.micState === 'unavailable' && (
        <div className="st-card st-alert">No microphone was found on this device.</div>
      )}
      {error && <div className="st-card st-alert">{error}</div>}

      <div className="st-recorder">
        <button
          className={`st-record ${recording ? 'recording' : ''}`}
          disabled={analyzing || rec.micState === 'requesting'}
          onClick={recording ? rec.stop : run}
        >
          {analyzing ? '⏳ Analyzing…' : recording ? '⏹ Stop' : result ? '🎙️ Record again' : '🎙️ Start recording'}
        </button>
        {recording && (
          <div className="st-live">
            <div className="st-meter"><div style={{ width: `${Math.round(rec.level * 100)}%` }} /></div>
            <span>{clock(rec.elapsed)} / ~{clock(targetSec)}</span>
          </div>
        )}
        {!recording && !analyzing && !result && (
          <p className="st-muted">{isLocal ? 'Analyzed locally (Apple / Local mode).' : 'Analyzed with Deepgram.'}</p>
        )}
      </div>

      {result && <FeedbackCard session={result.session} weekly={result.weekly} />}
    </div>
  );
}
