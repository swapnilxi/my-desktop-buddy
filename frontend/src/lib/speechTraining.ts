import { getClientAuthHeaders } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Flag {
  kind: string;
  severity: 'info' | 'warn';
  title: string;
  detail: string;
  t?: number;
  said?: string;
  try?: string;
}

export interface SpeechSession {
  id: string;
  day: number;
  created_at: string;
  mode: 'deepgram' | 'local';
  transcript: string;
  acoustic: {
    duration_sec: number;
    f0_mean_hz: number | null;
    pitch_variation_st: number | null;
    f1_hz: number | null;
    f2_hz: number | null;
    f3_hz: number | null;
    hnr_db: number | null;
    jitter_pct: number | null;
    shimmer_db: number | null;
    vocal_fry: { t: number; dur: number }[];
    upspeak: { t: number; rise_st: number }[];
    sentence_end_drops: { t: number; drop_db: number }[];
    rms_db: number | null;
    emphasis_spikes: number;
  };
  chest: { label: 'high' | 'medium' | 'low'; explanation: string } | null;
  language: {
    word_count: number;
    wpm: number | null;
    fillers: { count: number; pct: number | null; by_word: Record<string, number> };
    hedges: { hedge: string; said: string; try: string }[];
    hedge_pct: number | null;
    passive_pct: number | null;
    run_ons: { words: number; sentence: string }[];
  };
  sentiment: { label: string; coaching: string; source: 'deepgram' | 'local' };
  intent: {
    available: boolean;
    categories: { intent: string; score: number }[];
    top: { intent: string; confidence: number }[];
  } | null;
  param_scores: Record<string, number | null>;
  scores: { confidence: number; clarity: number; authority: number; presence: number };
  flags: Flag[];
  notes: string[];
}

export interface WeeklySummary {
  week: number;
  sessions: number;
  avg_presence: number;
  compared_to: string;
  biggest_gains: { label: string; delta: number }[];
  work_on: { label: string; score: number }[];
}

export interface SpeechState {
  mode: string;
  sessions: SpeechSession[];
  completed_days: number[];
  streak: number;
  weekly_summaries: Record<string, WeeklySummary>;
}

async function errorMessage(resp: Response): Promise<string> {
  const body = await resp.json().catch(() => null);
  const d = body?.detail;
  if (typeof d === 'string') return d;
  if (Array.isArray(d)) return d.map((x: { msg?: string }) => x.msg || 'Invalid request').join(', ');
  return `Request failed (${resp.status})`;
}

export async function fetchSpeechState(): Promise<SpeechState> {
  const resp = await fetch(`${API_BASE}/speech/state`);
  if (!resp.ok) throw new Error(await errorMessage(resp));
  return resp.json();
}

export async function analyzeSpeech(
  blob: Blob,
  day: number,
  transcript?: string
): Promise<{ session: SpeechSession; weekly_summary: WeeklySummary | null }> {
  const form = new FormData();
  form.append('audio', blob, 'recording.webm');
  form.append('day', String(day));
  if (transcript) form.append('transcript', transcript);
  const resp = await fetch(`${API_BASE}/speech/analyze`, {
    method: 'POST',
    headers: { ...getClientAuthHeaders() },
    body: form,
  });
  if (!resp.ok) throw new Error(await errorMessage(resp));
  return resp.json();
}

export async function resetSpeechProgress(): Promise<void> {
  const resp = await fetch(`${API_BASE}/speech/state`, { method: 'DELETE' });
  if (!resp.ok) throw new Error(await errorMessage(resp));
}
