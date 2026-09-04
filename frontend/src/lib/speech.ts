import { getClientAuthHeaders } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

let muted = false;
let currentAudio: HTMLAudioElement | null = null;

export function setSpeechMuted(value: boolean) {
  muted = value;
  stopSpeaking();
}

export function isSpeechMuted() {
  return muted;
}

/** Strip emoji / markdown so Hammy doesn't read symbols aloud. */
function cleanForSpeech(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/^(Thought|Action|Thinking):\s*/gim, '')
    .replace(/[*_`#>~]/g, '')
    .replace(
      /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}\u{2B00}-\u{2BFF}]/gu,
      ''
    )
    .trim();
}

export interface SpeakOptions {
  rate?: number;
  pitch?: number;
  buddyType?: string;
  /** Gemini voice preset id — falls back to the saved config, then the default. */
  preset?: string;
  onStart?: () => void;
  onEnd?: () => void;
}

/** Which provider actually spoke last, for the Config panel to display. */
let lastVoiceProvider: string | null = null;

export function getLastVoiceProvider(): string | null {
  return lastVoiceProvider;
}

/** Fetch TTS audio from the backend. Returns null on failure. */
async function fetchBackendTts(
  text: string,
  buddyType?: string,
  preset?: string,
): Promise<Blob | null> {
  try {
    const clientHeaders = getClientAuthHeaders();
    if (buddyType) {
      clientHeaders['X-Buddy-Type'] = buddyType;
    }
    if (preset) {
      clientHeaders['X-Voice-Preset'] = preset;
    }
    const resp = await fetch(`${API_BASE}/voice/speak`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...clientHeaders,
      },
      body: JSON.stringify({
        text,
        character: buddyType,
        preset,
      }),
    });
    if (!resp.ok) return null;
    lastVoiceProvider = resp.headers.get('X-Voice-Provider');
    const blob = await resp.blob();
    return blob.size > 0 ? blob : null;
  } catch {
    return null;
  }
}

/**
 * Play audio the backend already synthesized (the `/voice/converse` path).
 *
 * Going straight from base64 to playback is what makes spoken replies feel
 * immediate — there is no second network round trip to /voice/speak, because
 * the audio came back with the reply.
 */
export function playAudioBase64(
  base64: string,
  mime: string = 'audio/wav',
  options: { onStart?: () => void; onEnd?: () => void } = {},
): boolean {
  if (muted || !base64) {
    options.onEnd?.();
    return false;
  }
  try {
    stopSpeaking();
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([bytes], { type: mime }));

    const audio = new Audio(url);
    currentAudio = audio;
    options.onStart?.();
    audio.onended = () => {
      URL.revokeObjectURL(url);
      if (currentAudio === audio) currentAudio = null;
      options.onEnd?.();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      options.onEnd?.();
    };
    void audio.play().catch(() => options.onEnd?.());
    return true;
  } catch {
    options.onEnd?.();
    return false;
  }
}


// ── Web Speech API fallback ──────────────────────────────────────

let cachedVoice: SpeechSynthesisVoice | null = null;

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  if (cachedVoice) return cachedVoice;

  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  const preferredNames = ['Samantha', 'Google US English', 'Microsoft Aria'];
  for (const name of preferredNames) {
    const match = voices.find((v) => v.name.includes(name));
    if (match) {
      cachedVoice = match;
      return match;
    }
  }
  cachedVoice = voices.find((v) => v.lang.startsWith('en')) ?? voices[0];
  return cachedVoice;
}

function speakWithBrowser(text: string, options: SpeakOptions): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    // No TTS at all — approximate duration so animations still play.
    options.onStart?.();
    const estimated = Math.min(10000, Math.max(1500, text.length * 60));
    setTimeout(() => options.onEnd?.(), estimated);
    return false;
  }

  const synth = window.speechSynthesis;
  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  const voice = pickVoice();
  if (voice) utterance.voice = voice;
  utterance.rate = options.rate ?? 1.05;
  utterance.pitch = options.pitch ?? 1.3; // slightly squeaky — hamster-like 🐹
  utterance.onstart = () => options.onStart?.();
  utterance.onend = () => options.onEnd?.();
  utterance.onerror = () => options.onEnd?.();

  synth.speak(utterance);
  return true;
}

/**
 * Speak text aloud. Tries backend TTS first (Gemini → Fish Audio → Deepgram →
 * Apple `say`), then falls back to the browser's built-in speech synthesis.
 */
export async function speak(text: string, options: SpeakOptions = {}): Promise<void> {
  const cleaned = cleanForSpeech(text);
  if (!cleaned || muted) {
    options.onEnd?.();
    return;
  }

  stopSpeaking();
  options.onStart?.();

  const blob = await fetchBackendTts(cleaned, options.buddyType, options.preset);
  if (blob && !muted) {
    try {
      const audio = new Audio(URL.createObjectURL(blob));
      currentAudio = audio;
      audio.onended = () => {
        URL.revokeObjectURL(audio.src);
        if (currentAudio === audio) currentAudio = null;
        options.onEnd?.();
      };
      audio.onerror = () => options.onEnd?.();
      await audio.play();
      return;
    } catch {
      /* fall through to browser TTS */
    }
  }

  speakWithBrowser(cleaned, { ...options, onStart: undefined });
}

/** Immediately stop any ongoing speech. */
export function stopSpeaking() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}
