'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatMessage, ExplainDepth, ExplainLanguage, HamsterMood, KrishnaChatResponse } from '@/lib/api';
import {
  converseWithVoice,
  createChatSession,
  explainGitaVerse,
  getClientSavedConfig,
  sendChatMessage,
  sendKrishnaMessage,
} from '@/lib/api';
import { addGitaContext, removeGitaContext, type GitaContextRef } from '@/lib/gitaContext';
import { playAudioBase64, speak, stopSpeaking } from '@/lib/speech';
import type { RequestStateFn } from '@/lib/useKrishnaCharacterState';

export interface UseConversationOptions {
  onMoodChange: (mood: HamsterMood) => void;
  /** Which buddy is currently on screen — Krishna gets the emotion-aware orchestrated pipeline, others keep the flat prompt. */
  buddyType?: string;
  buddyName?: string;
  /**
   * The richer character-state channel (useKrishnaCharacterState's
   * `requestState`), wired in by app/page.tsx. Optional and additive: the
   * existing `onMoodChange('speaking'|'idle')` calls below are untouched —
   * they still drive the legacy `hamsterMood` channel for non-Krishna
   * buddies. This only ever receives Krishna responses, since only those
   * carry a `presentation` payload.
   */
  onPresentation?: RequestStateFn;
}

const SESSION_STORAGE_KEY = 'krishna_conversation_id';

/**
 * The single home for the buddy conversation.
 *
 * This lives above the window-mode branches on purpose. It used to be local
 * state inside ChatPanel, so every switch between pet / sidebar / dashboard
 * unmounted the panel and silently erased the whole chat history and any
 * unsent draft. Hoisting it also lets pet mode's Tap-to-Talk write into the
 * same history the Chat tab shows, instead of keeping a second, memory-less
 * conversation the user could never see.
 *
 * Two things it owns beyond the message list:
 *
 *   * **The session id.** Turns are persisted server-side against a
 *     conversation, so a reload resumes where the user left off and "New chat"
 *     means something more than clearing the screen.
 *   * **The spoken turn.** `sendVoice` posts the recording to
 *     `/voice/converse`, which transcribes, runs the full orchestrator and
 *     synthesizes the reply in one round trip.
 */
export function useConversation({ onMoodChange, buddyType, buddyName, onPresentation }: UseConversationOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useRag, setUseRag] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isVoiceThinking, setIsVoiceThinking] = useState(false);
  /** Set when the reply text arrived but could not be spoken, so the UI can say why. */
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  /**
   * Verses explicitly attached via "Add to Chat Context" (Gita Verse
   * Context). Scoped to this conversation only — never persisted, and reset
   * whenever the screen is cleared or a new session starts.
   */
  const [gitaContext, setGitaContext] = useState<GitaContextRef[]>([]);

  // Latest-value refs so send() stays stable across renders. send() only reads
  // them when it is actually called, which is always after the commit below.
  const moodRef = useRef(onMoodChange);
  const presentationRef = useRef(onPresentation);
  const messagesRef = useRef<ChatMessage[]>(messages);
  const ragRef = useRef(useRag);
  const buddyTypeRef = useRef(buddyType);
  const buddyNameRef = useRef(buddyName);
  const conversationIdRef = useRef<string | null>(conversationId);
  const gitaContextRef = useRef<GitaContextRef[]>(gitaContext);

  useEffect(() => {
    moodRef.current = onMoodChange;
    presentationRef.current = onPresentation;
    messagesRef.current = messages;
    ragRef.current = useRag;
    buddyTypeRef.current = buddyType;
    buddyNameRef.current = buddyName;
    conversationIdRef.current = conversationId;
    gitaContextRef.current = gitaContext;
  });

  // Restore the session id after mount. This is a deliberate post-mount
  // hydration step, the same pattern page.tsx uses for its saved preferences:
  // localStorage does not exist while the static export is prerendered, so
  // reading it during render would be a hydration mismatch rather than a
  // one-frame correction.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setConversationId(saved);
    } catch {
      /* private mode / storage disabled */
    }
  }, []);

  const rememberSession = useCallback((id: string | null) => {
    setConversationId(id);
    conversationIdRef.current = id;
    try {
      if (id) localStorage.setItem(SESSION_STORAGE_KEY, id);
      else localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  /**
   * Send a turn and append both sides to the shared history.
   * Returns the assistant's reply so callers (e.g. the pet-mode speech bubble)
   * can display it without keeping their own copy.
   */
  const send = useCallback(async (text: string, options?: { speakReply?: boolean }): Promise<string | null> => {
    const trimmed = text.trim();
    if (!trimmed) return null;

    setError(null);
    setVoiceNotice(null);
    const history = messagesRef.current;
    const withUser = [...history, { role: 'user', content: trimmed } as ChatMessage];
    setMessages(withUser);
    setIsSending(true);
    moodRef.current('thinking');

    try {
      const currentBuddyType = buddyTypeRef.current;
      // Krishna gets the orchestrated pipeline (mood/emotion classification,
      // Gita retrieval, varied persona prompt per turn) instead of the flat
      // static-prompt path, so replies stop repeating the same lines.
      const response = currentBuddyType === 'krishna'
        ? await sendKrishnaMessage(
          trimmed,
          history,
          undefined,
          conversationIdRef.current ?? undefined,
          buddyNameRef.current,
          gitaContextRef.current.map(({ chapter, verse }) => ({ chapter, verse })),
        )
        : await sendChatMessage(trimmed, history, ragRef.current);
      setMessages([...withUser, { role: 'assistant', content: response.response }]);
      moodRef.current('speaking');

      // Only Krishna responses carry a `presentation` payload — a plain
      // `ChatResponse` (Hamster/Panda's flat prompt path) doesn't. The ternary
      // above already guarantees the real shape at runtime; TS can't narrow
      // a plain (non-discriminated) union across the `await`, hence the cast.
      if (currentBuddyType === 'krishna') {
        const krishnaResponse = response as KrishnaChatResponse;
        presentationRef.current?.(krishnaResponse.presentation, krishnaResponse.classification, 'chat');
      }

      const newId = 'conversation_id' in response ? response.conversation_id : null;
      if (typeof newId === 'string' && newId) rememberSession(newId);

      if (options?.speakReply !== false) {
        speak(response.response, {
          buddyType: currentBuddyType,
          preset: getClientSavedConfig()?.voice?.gemini_voice,
          onStart: () => moodRef.current('speaking'),
          onEnd: () => moodRef.current('idle'),
        });
        // Safety net for when speech events never fire (muted / unavailable).
        setTimeout(() => moodRef.current('idle'), 15000);
      } else {
        moodRef.current('idle');
      }
      return response.response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get response';
      setError(message);
      moodRef.current('idle');
      return null;
    } finally {
      setIsSending(false);
    }
  }, [rememberSession]);

  /**
   * A spoken turn, in one request.
   *
   * The transcript is only appended once the backend has actually heard it,
   * so a failed recognition never leaves a phantom user message on screen.
   * A TTS failure is surfaced as a notice rather than an error: the reply is
   * on screen and readable, and losing it because synthesis was rate-limited
   * would be the wrong trade.
   */
  const sendVoice = useCallback(async (blob: Blob): Promise<string | null> => {
    setError(null);
    setVoiceNotice(null);
    setIsSending(true);
    setIsVoiceThinking(true);
    moodRef.current('thinking');

    try {
      const result = await converseWithVoice(blob, {
        conversationId: conversationIdRef.current ?? undefined,
        buddyName: buddyNameRef.current,
        speakReply: true,
      });

      setMessages((prev) => [
        ...prev,
        { role: 'user', content: result.transcript },
        { role: 'assistant', content: result.response },
      ]);

      if (result.conversation_id) rememberSession(result.conversation_id);
      if (result.voice_error) setVoiceNotice(result.voice_error);
      presentationRef.current?.(result.presentation, result.classification, 'chat');

      if (result.audio) {
        playAudioBase64(result.audio, result.audio_mime ?? 'audio/wav', {
          onStart: () => moodRef.current('speaking'),
          onEnd: () => moodRef.current('idle'),
        });
      } else {
        // No audio came back — read it with whatever local voice exists so the
        // spoken conversation does not just go silent.
        speak(result.response, {
          buddyType: buddyTypeRef.current,
          preset: getClientSavedConfig()?.voice?.gemini_voice,
          onStart: () => moodRef.current('speaking'),
          onEnd: () => moodRef.current('idle'),
        });
      }
      return result.response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Voice chat failed';
      setError(message);
      moodRef.current('idle');
      return null;
    } finally {
      setIsSending(false);
      setIsVoiceThinking(false);
    }
  }, [rememberSession]);

  /**
   * Append a completed live-voice exchange.
   *
   * The backend has already persisted it, so this only mirrors it into the
   * on-screen transcript — which is what keeps live and typed conversation
   * looking like one conversation instead of two.
   */
  const appendLiveTurn = useCallback((turn: {
    heard: string; said: string; interrupted: boolean;
  }) => {
    setMessages((prev) => {
      const next = [...prev];
      if (turn.heard) next.push({ role: 'user', content: turn.heard });
      if (turn.said) {
        next.push({
          role: 'assistant',
          content: turn.interrupted ? `${turn.said}…` : turn.said,
        });
      }
      return next;
    });
  }, []);

  /**
   * Gita Verse Context — add/remove/clear an attached verse.
   *
   * Deliberately explicit: nothing else in this hook ever mutates
   * `gitaContext`, so a verse only ever enters the conversation because the
   * user clicked "Add to Chat Context".
   */
  const addVerseToContext = useCallback((chapter: number, verse: number) => {
    setGitaContext((prev) => addGitaContext(prev, chapter, verse));
  }, []);
  const removeVerseFromContext = useCallback((chapter: number, verse: number) => {
    setGitaContext((prev) => removeGitaContext(prev, chapter, verse));
  }, []);
  const clearVerseContext = useCallback(() => setGitaContext([]), []);

  /**
   * Explain Simply / Go Deeper on one verse.
   *
   * Appends a synthetic user line plus the tagged assistant reply to the same
   * history `send()` uses, so the explanation reads as a normal part of the
   * conversation rather than a separate view.
   */
  const explainVerse = useCallback(async (
    chapter: number,
    verse: number,
    depth: ExplainDepth = 'simple',
    language: ExplainLanguage = 'en',
    speakReply: boolean = true,
  ): Promise<string | null> => {
    setError(null);
    setIsSending(true);
    moodRef.current('thinking');

    try {
      const res = await explainGitaVerse(
        chapter, verse, depth, language,
        conversationIdRef.current ?? undefined, buddyNameRef.current,
      );
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: `Explain Bhagavad Gita ${chapter}.${verse} (${depth}).` },
        { role: 'assistant', content: res.response, meta: { kind: 'gita_explain', chapter, verse, depth, language } },
      ]);
      moodRef.current('speaking');
      presentationRef.current?.(res.presentation, res.classification, 'chat');

      if (res.conversation_id) rememberSession(res.conversation_id);

      if (speakReply) {
        speak(res.response, {
          buddyType: buddyTypeRef.current,
          preset: getClientSavedConfig()?.voice?.gemini_voice,
          onStart: () => moodRef.current('speaking'),
          onEnd: () => moodRef.current('idle'),
        });
        setTimeout(() => moodRef.current('idle'), 15000);
      } else {
        moodRef.current('idle');
      }
      return res.response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not explain that verse.';
      setError(message);
      moodRef.current('idle');
      return null;
    } finally {
      setIsSending(false);
    }
  }, [rememberSession]);

  /** Clear the screen without touching the stored session. */
  const clear = useCallback(() => {
    setMessages([]);
    setError(null);
    setVoiceNotice(null);
    setGitaContext([]);
  }, []);

  /**
   * Start a fresh conversation.
   *
   * The old session is kept server-side — this is "start from a clean slate",
   * not "delete what we talked about". If the backend is unreachable the
   * screen still clears and the id is dropped, so the button never feels
   * broken offline.
   */
  const newSession = useCallback(async (): Promise<void> => {
    stopSpeaking();
    setMessages([]);
    setError(null);
    setVoiceNotice(null);
    setGitaContext([]);
    setInput('');
    moodRef.current('idle');

    if (buddyTypeRef.current !== 'krishna') {
      // Hamster and panda use the legacy stateless /chat path — there is no
      // server-side session to create for them.
      rememberSession(null);
      return;
    }
    try {
      const session = await createChatSession();
      rememberSession(session.id);
    } catch {
      rememberSession(null);
    }
  }, [rememberSession]);

  return {
    messages,
    input,
    setInput,
    isSending,
    isVoiceThinking,
    error,
    setError,
    voiceNotice,
    setVoiceNotice,
    useRag,
    setUseRag,
    conversationId,
    gitaContext,
    addVerseToContext,
    removeVerseFromContext,
    clearVerseContext,
    explainVerse,
    send,
    sendVoice,
    appendLiveTurn,
    rememberSession,
    clear,
    newSession,
    messageCount: messages.length,
  };
}

export type ConversationHandle = ReturnType<typeof useConversation>;
