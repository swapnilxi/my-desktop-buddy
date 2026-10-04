'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type MicState = 'idle' | 'requesting' | 'recording' | 'denied' | 'unavailable';

interface Result {
  blob: Blob;
  durationSec: number;
  /** Browser transcript, only used as an offline-mode fallback. */
  transcript: string;
}

/**
 * Records mic audio for speech training with a live level meter and elapsed timer.
 * In Local mode it also runs the browser's SpeechRecognition (if present) so the
 * backend has a fallback transcript when Apple on-device transcription is unavailable.
 */
export function useSpeechRecorder(opts: { maxSeconds: number; captureTranscript: boolean }) {
  const [micState, setMicState] = useState<MicState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const rafRef = useRef<number | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const recogRef = useRef<{ stop: () => void } | null>(null);
  const transcriptRef = useRef('');
  const resolveRef = useRef<((r: Result | null) => void) | null>(null);
  const optsRef = useRef(opts);
  useEffect(() => { optsRef.current = opts; });

  const teardown = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    try { recogRef.current?.stop(); } catch { /* noop */ }
    recogRef.current = null;
    setLevel(0);
  }, []);

  const stop = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
  }, []);

  /** Resolves with the recording once stopped, or null if mic access failed. */
  const start = useCallback(async (): Promise<Result | null> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicState('unavailable');
      return null;
    }
    setMicState('requesting');
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      setMicState(name === 'NotFoundError' ? 'unavailable' : 'denied');
      return null;
    }
    streamRef.current = stream;
    chunksRef.current = [];
    transcriptRef.current = '';

    // Level meter
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AC();
      ctxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Uint8Array(analyser.fftSize);
      const tick = () => {
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
        setLevel(Math.min(1, Math.sqrt(sum / buf.length) * 4));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch { /* meter is cosmetic */ }

    // Optional browser transcript (Local-mode fallback)
    if (optsRef.current.captureTranscript) {
      interface Recog {
        continuous: boolean; interimResults: boolean; lang: string;
        onresult: (e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void;
        onerror: () => void; start: () => void; stop: () => void;
      }
      const SR = window as unknown as { SpeechRecognition?: new () => Recog; webkitSpeechRecognition?: new () => Recog };
      const Ctor = SR.SpeechRecognition || SR.webkitSpeechRecognition;
      if (Ctor) {
        try {
          const r = new Ctor();
          r.continuous = true;
          r.interimResults = false;
          r.lang = 'en-US';
          r.onresult = (e) => {
            for (let i = e.resultIndex; i < e.results.length; i++) {
              if (e.results[i].isFinal) transcriptRef.current += ' ' + e.results[i][0].transcript;
            }
          };
          r.onerror = () => {};
          r.start();
          recogRef.current = r;
        } catch { /* optional */ }
      }
    }

    const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    recorderRef.current = rec;
    rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };

    return new Promise<Result | null>((resolve) => {
      resolveRef.current = resolve;
      rec.onstop = () => {
        const durationSec = (Date.now() - startedAt.current) / 1000;
        const blob = new Blob(chunksRef.current, { type: mime || 'audio/webm' });
        const transcript = transcriptRef.current.trim();
        teardown();
        setMicState('idle');
        resolve({ blob, durationSec, transcript });
      };
      startedAt.current = Date.now();
      setElapsed(0);
      rec.start();
      setMicState('recording');
    });
  }, [teardown]);

  // Timer + auto-stop
  useEffect(() => {
    if (micState !== 'recording') return;
    const id = setInterval(() => {
      const s = (Date.now() - startedAt.current) / 1000;
      setElapsed(s);
      if (s >= optsRef.current.maxSeconds) stop();
    }, 200);
    return () => clearInterval(id);
  }, [micState, stop]);

  useEffect(() => () => {
    try { recorderRef.current?.stop(); } catch { /* noop */ }
    teardown();
  }, [teardown]);

  return { micState, elapsed, level, start, stop, resetMic: () => setMicState('idle') };
}
