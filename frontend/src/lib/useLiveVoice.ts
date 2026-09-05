'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getClientApiKeys, getClientSavedConfig, getUserId } from '@/lib/api';
import { stopSpeaking } from '@/lib/speech';
import { createAudioPlayer, startMicCapture } from '@/lib/liveAudio';
import type { AudioPlayer, MicStream } from '@/lib/liveAudio';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export type LiveStatus = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'error';

export interface LiveTurn {
  role: 'user' | 'assistant';
  content: string;
  interrupted?: boolean;
}

export interface UseLiveVoiceOptions {
  conversationId?: string | null;
  buddyName?: string;
  mode?: string;
  /** Called when a full exchange lands, so it can join the main transcript. */
  onTurn?: (turn: { heard: string; said: string; interrupted: boolean }) => void;
  onConversationId?: (id: string) => void;
  onStatusChange?: (status: LiveStatus) => void;
}

function websocketUrl(path: string): string {
  const base = API_BASE.replace(/^http/, 'ws');
  return `${base}${path}`;
}

/**
 * Streaming voice: open mic, interruptible replies.
 *
 * This is a different mode from `useConversation.sendVoice`, not a
 * replacement. Tap-to-talk is cheaper, works with every provider and is right
 * for a quick question; this keeps a socket open so Madhav can be cut off
 * mid-sentence.
 *
 * The barge-in path is the reason this hook exists and is worth reading
 * first: audio is scheduled ahead of the clock, so when `interrupted` arrives
 * there is speech already queued. It flushes the player synchronously before
 * doing anything else — anything slower and Madhav talks over the user.
 */
export function useLiveVoice(options: UseLiveVoiceOptions = {}) {
  const [status, setStatus] = useState<LiveStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [partialHeard, setPartialHeard] = useState('');
  const [partialSaid, setPartialSaid] = useState('');
  const [micLevel, setMicLevel] = useState(0);
  const [muted, setMuted] = useState(false);
  const [interruptions, setInterruptions] = useState(0);

  const socketRef = useRef<WebSocket | null>(null);
  const micRef = useRef<MicStream | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const optionsRef = useRef(options);
  const activeRef = useRef(false);

  useEffect(() => {
    optionsRef.current = options;
  });

  const applyStatus = useCallback((next: LiveStatus) => {
    setStatus(next);
    optionsRef.current.onStatusChange?.(next);
  }, []);

  const teardown = useCallback(() => {
    activeRef.current = false;
    micRef.current?.stop();
    micRef.current = null;
    playerRef.current?.close();
    playerRef.current = null;
    const socket = socketRef.current;
    socketRef.current = null;
    if (socket && socket.readyState <= WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify({ type: 'stop' }));
      } catch { /* already closing */ }
      socket.close();
    }
    setPartialHeard('');
    setPartialSaid('');
    setMicLevel(0);
  }, []);

  const stop = useCallback(() => {
    teardown();
    applyStatus('idle');
  }, [teardown, applyStatus]);

  const start = useCallback(async () => {
    if (activeRef.current) return;
    setError(null);
    applyStatus('connecting');
    activeRef.current = true;

    // A live session and a played-back reply must not overlap.
    stopSpeaking();

    let mic: MicStream | null = null;
    try {
      const saved = getClientSavedConfig();
      const params = new URLSearchParams({
        user_id: getUserId(),
        mode: optionsRef.current.mode || 'friend',
      });
      if (optionsRef.current.conversationId) {
        params.set('conversation_id', optionsRef.current.conversationId);
      }
      if (optionsRef.current.buddyName) {
        params.set('buddy_name', optionsRef.current.buddyName);
      }
      if (saved?.voice?.voice_language) {
        params.set('language', saved.voice.voice_language);
      }
      // The browser WebSocket API cannot set headers, so a key held in
      // LocalStorage travels as a query param. It still never touches server
      // disk — the backend uses it for this connection only.
      const keys = getClientApiKeys();
      if (keys.gemini_key && !keys.gemini_key.includes('•')) {
        params.set('key', keys.gemini_key.trim());
      }

      const socket = new WebSocket(websocketUrl(`/voice/live?${params.toString()}`));
      socket.binaryType = 'arraybuffer';
      socketRef.current = socket;

      const player = createAudioPlayer({
        onSpeakingChange: (speaking) => {
          if (!activeRef.current) return;
          applyStatus(speaking ? 'speaking' : 'listening');
        },
      });
      playerRef.current = player;

      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Live voice timed out connecting.')), 15000);
        socket.onopen = () => { clearTimeout(timer); resolve(); };
        socket.onerror = () => {
          clearTimeout(timer);
          reject(new Error('Could not reach the live voice service.'));
        };
      });

      socket.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          playerRef.current?.enqueue(event.data);
          return;
        }
        let payload: Record<string, unknown>;
        try {
          payload = JSON.parse(event.data as string);
        } catch {
          return;
        }

        switch (payload.type) {
          case 'ready':
            applyStatus('listening');
            break;

          case 'interrupted':
            // Kill buffered speech first, before anything else in this
            // handler — every millisecond here is Madhav talking over them.
            playerRef.current?.flush();
            setPartialSaid('');
            setInterruptions((n) => n + 1);
            applyStatus('listening');
            break;

          case 'input_transcript':
            setPartialHeard(String(payload.accumulated ?? ''));
            applyStatus('thinking');
            break;

          case 'output_transcript':
            setPartialSaid(String(payload.accumulated ?? ''));
            break;

          case 'turn_complete': {
            const heard = String(payload.heard ?? '');
            const said = String(payload.said ?? '');
            if (heard || said) {
              optionsRef.current.onTurn?.({
                heard, said, interrupted: Boolean(payload.interrupted),
              });
            }
            setPartialHeard('');
            setPartialSaid('');
            break;
          }

          case 'conversation':
            if (typeof payload.conversation_id === 'string') {
              optionsRef.current.onConversationId?.(payload.conversation_id);
            }
            break;

          case 'error': {
            const message = String(payload.message ?? 'Live voice failed.');
            setError(message);
            if (payload.fatal) {
              teardown();
              applyStatus('error');
            }
            break;
          }
        }
      };

      socket.onclose = () => {
        if (!activeRef.current) return;
        teardown();
        applyStatus('idle');
      };

      mic = await startMicCapture({
        onChunk: (pcm) => {
          const active = socketRef.current;
          if (active && active.readyState === WebSocket.OPEN) active.send(pcm);
        },
        onLevel: setMicLevel,
      });
      micRef.current = mic;
      applyStatus('listening');
    } catch (err) {
      mic?.stop();
      teardown();
      const message = err instanceof Error ? err.message : 'Live voice failed to start.';
      setError(
        message.includes('Permission') || message.includes('NotAllowed')
          ? 'Microphone blocked. Allow microphone access, then try again.'
          : message,
      );
      applyStatus('error');
    }
  }, [applyStatus, teardown]);

  const toggle = useCallback(() => {
    if (activeRef.current) stop();
    else void start();
  }, [start, stop]);

  const toggleMute = useCallback(() => {
    setMuted((previous) => {
      const next = !previous;
      micRef.current?.setMuted(next);
      return next;
    });
  }, []);

  useEffect(() => () => teardown(), [teardown]);

  return {
    status,
    isActive: status !== 'idle' && status !== 'error',
    error,
    setError,
    partialHeard,
    partialSaid,
    micLevel,
    muted,
    interruptions,
    start,
    stop,
    toggle,
    toggleMute,
  };
}

export type LiveVoiceHandle = ReturnType<typeof useLiveVoice>;
