'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { transcribeAudio, getClientSavedConfig } from '@/lib/api';
import { stopSpeaking } from '@/lib/speech';
import { createBrowserSpeechRecognition, isSpeechRecognitionSupported } from '@/lib/speechRecognition';

interface UseVoiceRecorderOptions {
    /** Called with the transcript once STT returns. */
    onTranscribed: (transcript: string) => void;
    /**
     * When set, the raw recording is handed over instead of being transcribed
     * here — the caller sends it to `/voice/converse`, which transcribes, runs
     * the orchestrator and synthesizes the reply in a single round trip.
     *
     * The browser-speech-recognition path never reaches this: it produces text
     * directly and still goes through `onTranscribed`.
     */
    onAudio?: (blob: Blob) => Promise<void> | void;
    /** Called when recording actually starts (mic granted). */
    onRecordingStart?: () => void;
    /** Called when recording stops (before transcription). */
    onRecordingStop?: () => void;
    /** Called when transcription begins. */
    onTranscribingStart?: () => void;
    /** Called when the full cycle ends or errors; receives error message if any. */
    onDone?: (error?: string) => void;
}

export interface VoiceRecorderState {
    isRecording: boolean;
    isTranscribing: boolean;
    error: string | null;
    toggle: () => void;
}

/**
 * Reusable mic recorder.
 *
 * Two paths out, depending on what the caller wants:
 *   * `onAudio` — the recording goes straight to `/voice/converse` (one round
 *     trip for transcript + reply + speech). This is the smooth path.
 *   * `onTranscribed` — the recorder transcribes via `/voice/transcribe` and
 *     hands back text. Also the path the browser recognizer always takes.
 */
export function useVoiceRecorder(options: UseVoiceRecorderOptions): VoiceRecorderState {
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    // Keep latest callbacks without re-creating handlers
    const optionsRef = useRef(options);
    optionsRef.current = options;

    const recognitionRef = useRef<any>(null);
    // Set when the user deliberately stops, so the recognizer's trailing
    // 'aborted' error does not get mistaken for a failure worth falling back on.
    const userStoppedRef = useRef(false);

    const cleanupStream = useCallback(() => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setIsRecording(false);
    }, []);

    const stop = useCallback(() => {
        userStoppedRef.current = true;
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch { }
            recognitionRef.current = null;
        }
        mediaRecorderRef.current?.stop();
    }, []);

    const start = useCallback(async () => {
        setError(null);
        userStoppedRef.current = false;
        const saved = getClientSavedConfig();
        const sttPref = saved?.voice?.stt_provider || 'apple';

        // 1. Try Apple / Browser Speech Recognition first if preferred.
        //    Skipped inside Electron: its Chromium ships no Google speech key,
        //    so recognition reliably fails with 'network' and every mic tap
        //    would pay that failed round trip before falling back.
        const inElectron = typeof window !== 'undefined' && !!window.hamsterDesk?.isElectron;
        if (sttPref === 'apple' && !inElectron && isSpeechRecognitionSupported()) {
            let receivedResult = false;
            const rec = createBrowserSpeechRecognition({
                onStart: () => {
                    setIsRecording(true);
                    optionsRef.current.onRecordingStart?.();
                },
                onResult: (transcript) => {
                    receivedResult = true;
                    setIsRecording(false);
                    setIsTranscribing(false);
                    optionsRef.current.onTranscribed(transcript);
                    optionsRef.current.onDone?.();
                },
                onError: (err) => {
                    // 'aborted' / 'no-speech' are normal ends, not failures — and a
                    // user-initiated stop must never re-open the mic.
                    const benign = err === 'aborted' || err === 'no-speech';
                    if (receivedResult || userStoppedRef.current || benign) {
                        setIsRecording(false);
                        if (benign && !receivedResult && !userStoppedRef.current) {
                            setError("Didn't catch that — try speaking a bit longer!");
                        }
                        optionsRef.current.onDone?.(benign ? 'no-speech' : err);
                        return;
                    }
                    // Genuine failure (commonly 'network' inside Electron):
                    // fall back to MediaRecorder + backend transcription.
                    console.warn('[Speech Recognition unavailable, using MediaRecorder]', err);
                    startMediaRecorder();
                },
                onEnd: () => {
                    setIsRecording(false);
                    recognitionRef.current = null;
                },
            });

            if (rec) {
                if (recognitionRef.current) {
                    try { recognitionRef.current.stop(); } catch { }
                }
                recognitionRef.current = rec;
                return;
            }
        }

        // 2. Otherwise use MediaRecorder + backend transcription (Gemini / Deepgram)
        await startMediaRecorder();
    }, [cleanupStream]);

    const startMediaRecorder = async () => {
        let stream: MediaStream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err) {
            const name = err instanceof DOMException ? err.name : '';
            if (name === 'NotAllowedError' || name === 'SecurityError') {
                setError(
                    'Microphone blocked. Click the 🔒/🎤 icon in the address bar → allow Microphone, then retry.'
                );
            } else if (name === 'NotFoundError') {
                setError('No microphone found on this device.');
            } else {
                setError('Could not access the microphone.');
            }
            optionsRef.current.onDone?.('microphone');
            return;
        }

        streamRef.current = stream;
        chunksRef.current = [];

        const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = async () => {
            cleanupStream();
            optionsRef.current.onRecordingStop?.();

            const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
            if (blob.size < 1000) {
                setError("Didn't catch that — try speaking a bit longer!");
                optionsRef.current.onDone?.('too-short');
                return;
            }

            setIsTranscribing(true);
            optionsRef.current.onTranscribingStart?.();
            try {
                const handleAudio = optionsRef.current.onAudio;
                if (handleAudio) {
                    await handleAudio(blob);
                    setIsTranscribing(false);
                    optionsRef.current.onDone?.();
                    return;
                }
                const { transcript } = await transcribeAudio(blob);
                setIsTranscribing(false);
                optionsRef.current.onTranscribed(transcript);
                optionsRef.current.onDone?.();
            } catch (err) {
                setIsTranscribing(false);
                const msg = err instanceof Error ? err.message : 'Voice transcription failed';
                setError(msg);
                optionsRef.current.onDone?.(msg);
            }
        };

        recorder.start();
        setIsRecording(true);
        optionsRef.current.onRecordingStart?.();
    };

    const toggle = useCallback(() => {
        if (isRecording) {
            stop();
        } else if (!isTranscribing) {
            start();
        }
    }, [isRecording, isTranscribing, start, stop]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            mediaRecorderRef.current?.stop();
            streamRef.current?.getTracks().forEach((t) => t.stop());
            stopSpeaking();
        };
    }, []);

    return { isRecording, isTranscribing, error, toggle };
}
