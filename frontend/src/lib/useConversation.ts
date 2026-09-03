'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatMessage, HamsterMood } from '@/lib/api';
import { sendChatMessage } from '@/lib/api';
import { speak } from '@/lib/speech';

export interface UseConversationOptions {
  onMoodChange: (mood: HamsterMood) => void;
}

/**
 * The single home for the buddy conversation.
 *
 * This lives above the window-mode branches on purpose. It used to be local
 * state inside ChatPanel, so every switch between pet / sidebar / dashboard
 * unmounted the panel and silently erased the whole chat history and any
 * unsent draft. Hoisting it also lets pet mode's Tap-to-Talk write into the
 * same history the Chat tab shows, instead of keeping a second, memory-less
 * conversation the user could never see.
 */
export function useConversation({ onMoodChange }: UseConversationOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useRag, setUseRag] = useState(false);

  // Latest-value refs so send() stays stable across renders. send() only reads
  // them when it is actually called, which is always after the commit below.
  const moodRef = useRef(onMoodChange);
  const messagesRef = useRef<ChatMessage[]>(messages);
  const ragRef = useRef(useRag);

  useEffect(() => {
    moodRef.current = onMoodChange;
    messagesRef.current = messages;
    ragRef.current = useRag;
  });

  /**
   * Send a turn and append both sides to the shared history.
   * Returns the assistant's reply so callers (e.g. the pet-mode speech bubble)
   * can display it without keeping their own copy.
   */
  const send = useCallback(async (text: string, options?: { speakReply?: boolean }): Promise<string | null> => {
    const trimmed = text.trim();
    if (!trimmed) return null;

    setError(null);
    const history = messagesRef.current;
    const withUser = [...history, { role: 'user', content: trimmed } as ChatMessage];
    setMessages(withUser);
    setIsSending(true);
    moodRef.current('thinking');

    try {
      const response = await sendChatMessage(trimmed, history, ragRef.current);
      setMessages([...withUser, { role: 'assistant', content: response.response }]);
      moodRef.current('speaking');

      if (options?.speakReply !== false) {
        speak(response.response, {
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
  }, []);

  const clear = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    input,
    setInput,
    isSending,
    error,
    setError,
    useRag,
    setUseRag,
    send,
    clear,
    messageCount: messages.length,
  };
}

export type ConversationHandle = ReturnType<typeof useConversation>;
