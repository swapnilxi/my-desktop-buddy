/**
 * HamsterDesk API Client
 * Handles all communication with the FastAPI backend.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
  deepgram_model: string;
  tts_voice: string;
  apple_voice: string;
}

export interface RAGConfig {
  enabled: boolean;
  knowledge_base_path: string;
  endpoint: string;
}

export interface HamsterConfig {
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
}

export interface AppConfig {
  llm: LLMConfig;
  voice: VoiceConfig;
  rag: RAGConfig;
  hamster: HamsterConfig;
  startup: StartupConfig;
  api_keys: APIKeysConfig;
}

export type HamsterMood = 'idle' | 'listening' | 'thinking' | 'speaking' | 'happy' | 'sleeping' | 'eating' | 'waving' | 'excited' | 'dragged';

// ── API Functions ────────────────────────────────────────────────

async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
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

// Config — reveal real (unmasked) API keys
export async function fetchRevealedKeys(): Promise<{
  gemini_key: string;
  deepseek_key: string;
  deepgram_key: string;
}> {
  return apiRequest('/config/reveal-keys');
}

// Voice — Speech-to-Text (Deepgram)
export async function transcribeAudio(
  audioBlob: Blob
): Promise<{ transcript: string; model: string }> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');

  const response = await fetch(`${API_BASE}/voice/transcribe`, {
    method: 'POST',
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

