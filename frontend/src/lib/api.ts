/**
 * HamsterDesk API Client
 * Handles all communication with the FastAPI backend.
 * Storing credentials in browser LocalStorage for privacy and public sharing.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const KEYS_STORAGE_KEY = 'hamsterdesk_api_keys';
export const USER_CONFIG_STORAGE_KEY = 'hamsterdesk_user_config';

// ── Types ────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  response: string;
  model: string;
  hamster_mood: string;
}

export interface TodoItem {
  id: number;
  text: string;
  completed: boolean;
  created_at: string;
  completed_at?: string;
}

export interface LLMConfig {
  provider: string;
  gemini_model: string;
  deepseek_model: string;
  ollama_model: string;
  ollama_endpoint: string;
}

export interface VoiceConfig {
  mode: string;
  stt_provider?: string;
  deepgram_model: string;
  tts_voice: string;
  apple_voice: string;
  fish_audio_model?: string;
}

export interface RAGConfig {
  enabled: boolean;
  knowledge_base_path: string;
  endpoint: string;
}

export interface HamsterConfig {
  buddy_type?: string;
  pose?: string;
  name: string;
  skin: string;
  color: string;
}

export interface StartupConfig {
  launch_on_login: boolean;
  default_tab: string;
}

export interface APIKeysConfig {
  gemini_key: string;
  deepseek_key: string;
  deepgram_key: string;
  fish_audio_key?: string;
}

export interface ServerCapabilities {
  server_has_gemini: boolean;
  server_has_deepseek: boolean;
  server_has_deepgram: boolean;
  server_has_fish_audio?: boolean;
  fish_audio_ids?: Record<string, boolean>;
}

export interface AppConfig {
  llm: LLMConfig;
  voice: VoiceConfig;
  rag: RAGConfig;
  hamster: HamsterConfig;
  startup: StartupConfig;
  api_keys: APIKeysConfig;
  server_capabilities?: ServerCapabilities;
}

export type HamsterMood = 'idle' | 'listening' | 'thinking' | 'speaking' | 'happy' | 'sleeping' | 'eating' | 'waving' | 'excited' | 'dragged';
export type BuddyMood = HamsterMood;

// ── LocalStorage Helpers ─────────────────────────────────────────

export function getClientApiKeys(): APIKeysConfig {
  if (typeof window === 'undefined') {
    return { gemini_key: '', deepseek_key: '', deepgram_key: '', fish_audio_key: '' };
  }
  try {
    const raw = localStorage.getItem(KEYS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : { gemini_key: '', deepseek_key: '', deepgram_key: '', fish_audio_key: '' };
  } catch {
    return { gemini_key: '', deepseek_key: '', deepgram_key: '', fish_audio_key: '' };
  }
}

export function saveClientApiKeys(keys: Partial<APIKeysConfig>) {
  if (typeof window === 'undefined') return;
  try {
    const current = getClientApiKeys();
    const updated = { ...current, ...keys };
    localStorage.setItem(KEYS_STORAGE_KEY, JSON.stringify(updated));
  } catch { }
}

export function clearClientApiKeys() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(KEYS_STORAGE_KEY);
  } catch { }
}

export function getClientSavedConfig(): Partial<AppConfig> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_CONFIG_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveClientSavedConfig(config: AppConfig) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(USER_CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch { }
}

/** Get headers containing user's client-side API keys, buddy choice, and provider choices */
export function getClientAuthHeaders(): Record<string, string> {
  const keys = getClientApiKeys();
  const savedConfig = getClientSavedConfig();
  const headers: Record<string, string> = {};

  if (keys.gemini_key && !keys.gemini_key.includes('•')) {
    headers['X-Gemini-Key'] = keys.gemini_key.trim();
  }
  if (keys.deepseek_key && !keys.deepseek_key.includes('•')) {
    headers['X-DeepSeek-Key'] = keys.deepseek_key.trim();
  }
  if (keys.deepgram_key && !keys.deepgram_key.includes('•')) {
    headers['X-Deepgram-Key'] = keys.deepgram_key.trim();
  }
  if (keys.fish_audio_key && !keys.fish_audio_key.includes('•')) {
    headers['X-Fish-Audio-Key'] = keys.fish_audio_key.trim();
  }

  if (savedConfig?.voice?.mode) {
    headers['X-Voice-Mode'] = savedConfig.voice.mode;
  }
  if (savedConfig?.voice?.stt_provider) {
    headers['X-STT-Provider'] = savedConfig.voice.stt_provider;
  }

  if (savedConfig?.llm?.provider) {
    headers['X-LLM-Provider'] = savedConfig.llm.provider;
  }
  if (savedConfig?.llm?.gemini_model) {
    headers['X-Gemini-Model'] = savedConfig.llm.gemini_model;
  }
  if (savedConfig?.llm?.deepseek_model) {
    headers['X-DeepSeek-Model'] = savedConfig.llm.deepseek_model;
  }

  if (savedConfig?.hamster?.buddy_type) {
    headers['X-Buddy-Type'] = savedConfig.hamster.buddy_type;
  }
  if (savedConfig?.hamster?.name) {
    headers['X-Buddy-Name'] = savedConfig.hamster.name;
  }

  return headers;
}


// ── API Functions ────────────────────────────────────────────────

async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const clientHeaders = getClientAuthHeaders();

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...clientHeaders,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `API error: ${response.status}`);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// Chat
export async function sendChatMessage(
  message: string,
  history: ChatMessage[],
  useRag: boolean = false
): Promise<ChatResponse> {
  return apiRequest<ChatResponse>('/chat', {
    method: 'POST',
    body: JSON.stringify({
      message,
      history,
      use_rag: useRag,
    }),
  });
}

// Todos
export async function fetchTodos(): Promise<TodoItem[]> {
  return apiRequest<TodoItem[]>('/todos');
}

export async function createTodo(text: string): Promise<TodoItem> {
  return apiRequest<TodoItem>('/todos', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

export async function toggleTodo(id: number): Promise<TodoItem> {
  return apiRequest<TodoItem>(`/todos/${id}`, {
    method: 'PATCH',
  });
}

export async function deleteTodo(id: number): Promise<void> {
  return apiRequest<void>(`/todos/${id}`, {
    method: 'DELETE',
  });
}

// Config
export async function fetchConfig(): Promise<AppConfig> {
  return apiRequest<AppConfig>('/config');
}

export async function saveConfig(config: AppConfig): Promise<{ status: string; message: string }> {
  // Always cache keys and user config in LocalStorage first!
  saveClientApiKeys(config.api_keys);
  saveClientSavedConfig(config);

  return apiRequest('/config', {
    method: 'POST',
    body: JSON.stringify(config),
  });
}

// Health
export async function checkHealth(): Promise<{ status: string; pet: string; message: string }> {
  return apiRequest('/health');
}

// Greeting
export async function fetchGreeting(): Promise<{ greeting: string; model: string }> {
  return apiRequest('/greeting');
}

// Config — reveal real (unmasked) API keys (fallback to LocalStorage)
export async function fetchRevealedKeys(): Promise<{
  gemini_key: string;
  deepseek_key: string;
  deepgram_key: string;
  fish_audio_key?: string;
}> {
  const localKeys = getClientApiKeys();
  if (localKeys.gemini_key || localKeys.deepseek_key || localKeys.deepgram_key || localKeys.fish_audio_key) {
    return localKeys;
  }
  return apiRequest('/config/reveal-keys');
}

// Voice — Speech-to-Text (Deepgram)
export async function transcribeAudio(
  audioBlob: Blob
): Promise<{ transcript: string; model: string }> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');

  const clientHeaders = getClientAuthHeaders();

  const response = await fetch(`${API_BASE}/voice/transcribe`, {
    method: 'POST',
    headers: {
      ...clientHeaders,
    },
    body: formData,
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Transcription failed' }));
    const detailMsg =
      typeof errorData.detail === 'string'
        ? errorData.detail
        : Array.isArray(errorData.detail)
          ? errorData.detail.map((d: { msg?: string }) => d.msg || 'Validation error').join(', ')
          : JSON.stringify(errorData.detail || errorData);
    throw new Error(detailMsg || `API error: ${response.status}`);
  }
  return response.json();
}


