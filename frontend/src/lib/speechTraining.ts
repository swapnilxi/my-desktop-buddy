import { getClientAuthHeaders } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── Program & lessons ───────────────────────────────────────────

export type FocusParam =
  | 'pace' | 'fillers' | 'hedging' | 'passive' | 'runOn' | 'pitch' | 'pitchVariation' | 'upspeak'
  | 'resonance' | 'hnr' | 'jitterShimmer' | 'vocalFry' | 'energy' | 'sentenceEndDrop' | 'sentiment'
  | 'intent' | 'landing' | 'pauses' | 'anchorDrop' | 'stamina' | 'pressure';

export interface LessonStep {
  title: string;
  instruction: string;
  durationSec?: number | null;
}

export interface SayInsteadPair {
  said: string;
  instead: string;
}

export interface VocabPair {
  plain: string;
  executive: string;
}

export interface LessonNote {
  label: string;
  text: string;
}

/** The editable body of a lesson — what the AI generates and revises. */
export interface LessonContent {
  title: string;
  objective: string;
  warmUp: string;
  prompt: string;
  exampleScript: string;
  focusLabel: string;
  focus: FocusParam[];
  durationMins: number;
  successCriteria: string;
  steps: LessonStep[];
  sayInstead: SayInsteadPair[];
  vocabulary: VocabPair[];
  tips: string[];
  notes: LessonNote[];
  challengeQuestions: string[];
  benchmark: string;
}

export type LessonField = keyof LessonContent;

export const LESSON_FIELDS: { key: LessonField; label: string }[] = [
  { key: 'title', label: 'Title' },
  { key: 'objective', label: 'Objective' },
  { key: 'warmUp', label: 'Warm-up' },
  { key: 'prompt', label: 'Exercise' },
  { key: 'exampleScript', label: 'Example script' },
  { key: 'focusLabel', label: 'Focus label' },
  { key: 'focus', label: 'Measured parameters' },
  { key: 'durationMins', label: 'Duration' },
  { key: 'successCriteria', label: 'Success criteria' },
  { key: 'steps', label: 'Steps' },
  { key: 'sayInstead', label: 'Say this instead' },
  { key: 'vocabulary', label: 'Vocabulary guide' },
  { key: 'tips', label: 'Coaching tips' },
  { key: 'notes', label: 'Coaching notes' },
  { key: 'challengeQuestions', label: 'Pressure questions' },
  { key: 'benchmark', label: 'Benchmark' },
];

export interface Lesson extends LessonContent {
  id: string;
  kind: 'day' | 'sublesson' | 'standalone';
  source: 'seed' | 'generated' | 'edited';
  parentId?: string | null;
  week?: number | null;
  revertable?: boolean;
  /** Sub-lessons: the number of the day they belong to. */
  parentDay?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProgramDay extends Lesson {
  kind: 'day';
  day: number;
  week: number;
  weeklySummary: boolean;
  sublessons: Lesson[];
  /** Days this day's sessions are compared against (e.g. the Day 7 baseline). */
  compareTo: string[];
  compareToDays: number[];
}

export interface ProgramWeek {
  week: number;
  title: string;
  subtitle?: string;
  summary: string;
}

/** Effective scoring targets (built-in defaults < the learner's persona < a lesson's own criteria). */
export interface Thresholds {
  f0_range: [number, number];
  pitch_drop_pct: [number, number];
  wpm_range: [number, number];
  pauses_per_min: [number, number];
  avg_sentence_words_max: number;
  run_on_words: number;
  filler_pct_max: number;
  filler_words: string[];
  hedge_pct_max: number;
  passive_pct_max: number;
  landing_pct_min: number;
  hnr_min_db: number;
  jitter_max_pct: number;
  shimmer_max_db: number;
  fatigue_minutes: number;
}

export interface Program {
  title: string;
  description?: string;
  coach_context: string;
  targets?: Thresholds;
  weeks: ProgramWeek[];
  days: ProgramDay[];
  standalone: Lesson[];
}

export type Placement =
  | { type: 'sublesson'; dayId: string }
  | { type: 'day'; afterDayId: string | null }
  | { type: 'standalone' };

// ── Sessions ────────────────────────────────────────────────────

export interface Flag {
  kind: string;
  severity: 'info' | 'warn';
  title: string;
  detail: string;
  t?: number;
  said?: string;
  try?: string;
}

export interface TonalMove {
  key: string;
  move: string;
  value: string;
  target: string;
  ok: boolean | null;
}

export interface TargetRow {
  param: string;
  current: string;
  target: string;
  ok: boolean | null;
}

export interface SpeechSession {
  id: string;
  lesson_id: string;
  lesson_kind: 'day' | 'sublesson' | 'standalone';
  lesson_title?: string;
  parent_id?: string | null;
  day: number | null;
  week?: number | null;
  challenge?: string | null;
  created_at: string;
  mode: 'deepgram' | 'local';
  transcript: string;
  acoustic: {
    duration_sec: number;
    speech_start_sec?: number;
    f0_mean_hz: number | null;
    f0_median_hz?: number | null;
    f0_floor_hz?: number | null;
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
    tonal?: {
      utterances: number;
      landing_pct: number | null;
      anchor_drops: number;
      anchor_candidates: number;
      resolved_rises: number;
      pauses: { count: number; deliberate: number; deliberate_per_min: number | null; long: number };
    };
    stamina?: {
      duration_min: number;
      fatigue_detected: boolean;
      fatigue_onset_min: number | null;
      fatigue_index: number | null;
    } | null;
  };
  chest: { label: 'high' | 'medium' | 'low'; explanation: string } | null;
  language: {
    word_count: number;
    wpm: number | null;
    avg_sentence_words?: number | null;
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
  extras?: {
    pitch_change_pct: number | null;
    pressure: {
      question: string;
      latency_sec: number | null;
      pace_change_pct: number | null;
      pitch_change_pct: number | null;
    } | null;
  };
  tonal_moves?: TonalMove[];
  targets?: TargetRow[];
  thresholds?: Thresholds;
  benchmark_comparisons?: BenchmarkComparison[];
  param_scores: Record<string, number | null>;
  scores: { confidence: number; clarity: number; authority: number; presence: number };
  flags: Flag[];
  notes: string[];
}

export interface BenchmarkComparison {
  lesson_id: string;
  day: number | null;
  title: string;
  missing?: boolean;
  date?: string;
  scores?: { presence: number; confidence: number; clarity: number; authority: number };
  metrics?: { label: string; unit: string; better: 'lower' | 'higher' | 'range'; range?: [number, number]; before: number | null; after: number | null }[];
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
  completed_day_ids: string[];
  streak: number;
  weekly_summaries: Record<string, WeeklySummary>;
}

// ── HTTP ────────────────────────────────────────────────────────

async function errorMessage(resp: Response): Promise<string> {
  const body = await resp.json().catch(() => null);
  const d = body?.detail;
  if (typeof d === 'string') return d;
  if (Array.isArray(d)) return d.map((x: { msg?: string }) => x.msg || 'Invalid request').join(', ');
  return `Request failed (${resp.status})`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`, {
    ...init,
    // The AI endpoints use the same provider, key and model as chat.
    headers: { 'Content-Type': 'application/json', ...getClientAuthHeaders(), ...init?.headers },
  });
  if (!resp.ok) throw new Error(await errorMessage(resp));
  return resp.json();
}

export const fetchSpeechState = () => request<SpeechState>('/speech/state');
export const fetchProgram = () => request<Program>('/speech/program');

export const generateLesson = (prompt: string, placement: Placement, durationMins?: number) =>
  request<{ draft: LessonContent }>('/speech/lessons/generate', {
    method: 'POST',
    body: JSON.stringify({ prompt, placement, durationMins: durationMins || null }),
  });

export const saveLesson = (lesson: LessonContent, placement: Placement) =>
  request<{ lesson: Lesson; program: Program }>('/speech/lessons', {
    method: 'POST',
    body: JSON.stringify({ lesson, placement }),
  });

export const reviseLesson = (lessonId: string, prompt: string, fields: LessonField[] | null) =>
  request<{ draft: LessonContent; changed: LessonField[] }>(`/speech/lessons/${encodeURIComponent(lessonId)}/revise`, {
    method: 'POST',
    body: JSON.stringify({ prompt, fields }),
  });

export const updateLesson = (lessonId: string, lesson: Partial<LessonContent>) =>
  request<{ lesson: Lesson; program: Program }>(`/speech/lessons/${encodeURIComponent(lessonId)}`, {
    method: 'PUT',
    body: JSON.stringify({ lesson }),
  });

export const revertLesson = (lessonId: string) =>
  request<{ lesson: Lesson; program: Program }>(`/speech/lessons/${encodeURIComponent(lessonId)}/revert`, { method: 'POST' });

export const deleteLesson = (lessonId: string) =>
  request<{ program: Program }>(`/speech/lessons/${encodeURIComponent(lessonId)}`, { method: 'DELETE' });

export const importProgram = (seed: unknown) =>
  request<Program>('/speech/program/import', { method: 'POST', body: JSON.stringify(seed) });

export const resetProgram = () => request<Program>('/speech/program/reset', { method: 'POST' });

export async function resetSpeechProgress(): Promise<void> {
  await request('/speech/state', { method: 'DELETE' });
}

export async function analyzeSpeech(
  blob: Blob,
  lessonId: string,
  transcript?: string,
  challenge?: string
): Promise<{ session: SpeechSession; weekly_summary: WeeklySummary | null }> {
  const form = new FormData();
  form.append('audio', blob, 'recording.webm');
  form.append('lesson_id', lessonId);
  if (transcript) form.append('transcript', transcript);
  if (challenge) form.append('challenge', challenge);
  const resp = await fetch(`${API_BASE}/speech/analyze`, {
    method: 'POST',
    headers: { ...getClientAuthHeaders() },
    body: form,
  });
  if (!resp.ok) throw new Error(await errorMessage(resp));
  return resp.json();
}

// ── Helpers ─────────────────────────────────────────────────────

/** Every lesson in the program by id (days, their sub-lessons, standalone lessons). */
export function indexLessons(program: Program): Map<string, Lesson | ProgramDay> {
  const map = new Map<string, Lesson | ProgramDay>();
  for (const d of program.days) {
    map.set(d.id, d);
    for (const s of d.sublessons) map.set(s.id, s);
  }
  for (const s of program.standalone) map.set(s.id, s);
  return map;
}

/** Linear progression: a day opens once every earlier day is done; sub-lessons follow their day. */
export function isLessonUnlocked(program: Program, lesson: Lesson, completedDayIds: Set<string>): boolean {
  if (lesson.kind === 'standalone') return true;
  const dayId = lesson.kind === 'day' ? lesson.id : lesson.parentId;
  const index = program.days.findIndex((d) => d.id === dayId);
  if (index < 0) return true;
  return program.days.slice(0, index).every((d) => completedDayIds.has(d.id));
}

export function contentOf(lesson: LessonContent): LessonContent {
  const out = {} as Record<LessonField, unknown>;
  for (const { key } of LESSON_FIELDS) out[key] = lesson[key];
  return out as unknown as LessonContent;
}
