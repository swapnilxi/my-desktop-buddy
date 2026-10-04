'use client';

import { useSyncExternalStore } from 'react';
import type { ChatMessage } from '@/lib/api';

interface ChatState {
  messages: ChatMessage[];
  loading: boolean;
}

// Each window mode mounts its own ChatPanel; keeping the conversation here means
// switching Sidebar ⇄ Dashboard (even mid-reply) doesn't lose it.
let state: ChatState = { messages: [], loading: false };
const listeners = new Set<() => void>();

export function getChatState(): ChatState {
  return state;
}

export function setChatState(patch: Partial<ChatState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useChatState(): ChatState {
  return useSyncExternalStore(subscribe, getChatState, getChatState);
}
