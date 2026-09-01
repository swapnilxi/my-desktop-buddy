'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { transcribeAudio } from '@/lib/api';
import { stopSpeaking } from '@/lib/speech';

interface UseVoiceRecorderOptions {
    /** Called with the transcript once Deepgram STT returns. */
    onTranscribed: (transcript: string) => void;
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
 * Reusable mic recorder: records via MediaRecorder, transcribes through
 * the backend (/voice/transcribe → Deepgram), then hands the transcript
 * to `onTranscribed`.
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

    const cleanupStream = useCallback(() => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setIsRecording(false);
    }, []);

    const stop = useCallback(() => {
        mediaRecorderRef.current?.stop();
    }, []);

    const start = useCallback(async () => {
        setError(null);
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
            optionsRef.current.onDone?.(error ?? 'microphone');
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
    }, [cleanupStream]);

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
