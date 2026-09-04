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

export type VoiceProviderId =
  | 'gemini' | 'sarvam' | 'cartesia' | 'deepgram' | 'fish_audio' | 'apple' | 'browser';

export interface VoiceConfig {
  /** Legacy alias for tts_provider; the backend keeps the two in sync. */
  mode: string;
  tts_provider?: string;
  stt_provider?: string;
  /** Tried in order when the chosen provider fails. */
  tts_fallback?: string[];
  stt_fallback?: string[];

  // Per-provider settings
  gemini_voice?: string;
  gemini_tts_model?: string;
  sarvam_speaker?: string;
  sarvam_tts_model?: string;
  sarvam_stt_model?: string;
  cartesia_voice_id?: string;
  cartesia_tts_model?: string;
  cartesia_stt_model?: string;
  deepgram_model: string;
  tts_voice: string;
  apple_voice: string;
  fish_audio_model?: string;

  /** 'auto' | 'hi-IN' | 'en-IN' */
  voice_language?: string;
  voice_autoplay?: boolean;
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
  cartesia_key?: string;
  sarvam_key?: string;
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
    return {
      gemini_key: '', deepseek_key: '', deepgram_key: '',
      fish_audio_key: '', cartesia_key: '', sarvam_key: '',
    };
  }
  try {
    const raw = localStorage.getItem(KEYS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : { gemini_key: '', deepseek_key: '', deepgram_key: '', fish_audio_key: '' };
  } catch {
    return {
      gemini_key: '', deepseek_key: '', deepgram_key: '',
      fish_audio_key: '', cartesia_key: '', sarvam_key: '',
    };
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
  if (keys.cartesia_key && !keys.cartesia_key.includes('•')) {
    headers['X-Cartesia-Key'] = keys.cartesia_key.trim();
  }
  if (keys.sarvam_key && !keys.sarvam_key.includes('•')) {
    headers['X-Sarvam-Key'] = keys.sarvam_key.trim();
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

  if (savedConfig?.voice?.gemini_voice) {
    headers['X-Voice-Preset'] = savedConfig.voice.gemini_voice;
  }

  // Every call carries the user id, not just the Krishna ones. Without it the
  // legacy /todos endpoints resolve to 'local-user' while the tools resolve to
  // this browser's id, and the To-Do tab and the buddy end up looking at two
  // different people's tasks.
  headers['X-User-Id'] = getUserId();

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



// ══════════════════════════════════════════════════════════════════
// Krishna Companion API (Madhav)
// Gita engine, daily content, memory, modes and orchestrated chat.
// ══════════════════════════════════════════════════════════════════

export const USER_ID_STORAGE_KEY = 'krishna_user_id';

/** Stable local user id, so memories belong to someone even offline. */
export function getUserId(): string {
  if (typeof window === 'undefined') return 'local-user';
  try {
    let id = localStorage.getItem(USER_ID_STORAGE_KEY);
    if (!id) {
      id = `local-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(USER_ID_STORAGE_KEY, id);
    }
    return id;
  } catch {
    return 'local-user';
  }
}

function krishnaHeaders(): Record<string, string> {
  return { ...getClientAuthHeaders(), 'X-User-Id': getUserId() };
}

/**
 * Request helper for the Krishna endpoints.
 *
 * Unlike apiRequest it preserves the structured `detail` object that the Gita
 * routes return on a 404, because the difference between "invalid reference"
 * and "not in the knowledge base" is something the UI must show accurately.
 */
export class KrishnaApiError extends Error {
  status: number;
  detail: unknown;
  constructor(message: string, status: number, detail: unknown) {
    super(message);
    this.name = 'KrishnaApiError';
    this.status = status;
    this.detail = detail;
  }
}

async function krishnaRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...krishnaHeaders(),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let detail: unknown = null;
    try {
      detail = (await response.json())?.detail ?? null;
    } catch {
      /* non-JSON error body */
    }
    const message =
      typeof detail === 'string'
        ? detail
        : (detail as { message?: string })?.message || `Request failed (${response.status})`;
    throw new KrishnaApiError(message, response.status, detail);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

// ── Types ────────────────────────────────────────────────────────

export type KrishnaModeId =
  | 'friend' | 'wise' | 'productivity' | 'gita'
  | 'meditation' | 'focus' | 'playful' | 'listening';

export interface KrishnaMode {
  id: KrishnaModeId;
  label: string;
  emoji: string;
  description: string;
  default: boolean;
}

export interface GitaTranslation {
  text: string;
  language: string;
  source: string;
  source_name?: string;
  verified: boolean;
}

export interface GitaCommentary {
  text: string;
  author: string;
  language: string;
  source: string;
  source_name?: string;
  verified: boolean;
}

export interface GitaApplication {
  text: string;
  label: string;
}

export interface GitaVerse {
  id: string;
  chapter: number;
  verse: number;
  chapter_name?: string;
  sanskrit?: string;
  transliteration?: string;
  translations: GitaTranslation[];
  commentaries: GitaCommentary[];
  practical_application: GitaApplication[];
  themes: string[];
  keywords: string[];
  source?: string;
  source_type?: string;
  verified: boolean;
}

export interface GitaSearchResult {
  chapter: number;
  verse: number;
  reference: string;
  sanskrit?: string;
  transliteration?: string;
  translation?: string;
  theme?: string;
  themes: string[];
  source?: string;
  source_name?: string;
  verified: boolean;
  score: number;
}

export interface GitaSearchResponse {
  query: string;
  results: GitaSearchResult[];
  total: number;
  invalid_reference: boolean;
  message?: string;
}

export interface DailyVerse {
  day: string;
  available: boolean;
  message?: string;
  chapter?: number;
  verse?: number;
  reference?: string;
  chapter_name?: string;
  sanskrit?: string;
  transliteration?: string;
  translation?: string;
  translation_source?: string;
  themes?: string[];
  theme?: string;
  practical_lesson?: { text: string; label: string; note: string };
  krishna_thought?: { text: string; label: string; note: string };
  source?: string;
  verified?: boolean;
  provenance_note?: string;
}

export interface WordOfDay {
  day: string;
  id: string;
  word: string;
  devanagari: string;
  transliteration: string;
  pronunciation: string;
  meaning: string;
  explanation: string;
  gita_connection: {
    reference: string;
    chapter: number;
    verse: number;
    translation?: string;
    verified: boolean;
  } | null;
  application: { text: string; label: string };
}

export interface DailyTeaching {
  day: string;
  id: string;
  text: string;
  theme: string;
  label: string;
  note: string;
  inspired_by: { reference: string; chapter: number; verse: number; verified: boolean } | null;
}

export interface DailyBundle {
  day: string;
  verse: DailyVerse;
  word: WordOfDay;
  teaching: DailyTeaching;
  corpus_size: number;
}

export type MemoryCategory =
  | 'PROFILE' | 'PREFERENCE' | 'GOAL' | 'PROJECT' | 'WORK'
  | 'LEARNING' | 'HABIT' | 'TASK' | 'DECISION' | 'CONVERSATION_CONTEXT';

export interface MemoryItem {
  id: string;
  user_id: string;
  category: MemoryCategory;
  key: string;
  value: string;
  source: string;
  user_confirmed: boolean;
  sensitive: boolean;
  created_at: string;
  updated_at: string;
}

export interface MemoryListResponse {
  user_id: string;
  memory_paused: boolean;
  categories: MemoryCategory[];
  count: number;
  memories: MemoryItem[];
}

export interface MemoryProposal {
  category: MemoryCategory;
  key: string;
  value: string;
  source: string;
  sensitive: boolean;
  sensitivity_kinds: string[];
  requires_consent: boolean;
  prompt: string;
  actions: string[];
}

export interface KrishnaChatResponse {
  response: string;
  model: string;
  mode: KrishnaModeId;
  intent: string;
  emotion: string;
  presentation: {
    animation: string;
    chakra: string;
    voiceMode: string;
    particles: boolean;
  };
  hamster_mood: string;
  gita_used: {
    reference: string;
    chapter: number;
    verse: number;
    verified: boolean;
    source?: string;
    source_name?: string;
  }[];
  gita_invalid_message?: string | null;
  tools_used: { name: string; arguments: Record<string, unknown>; result: Record<string, unknown> }[];
  memory_proposal?: MemoryProposal | null;
  memories_used: number;
  productivity_used?: boolean;
  gita_action?: GitaActionSituation | null;
  classification: Record<string, unknown>;
  events: { event: string; at: string; presentation: Record<string, unknown> }[];
  safety_flags: string[];
  request_id: string;
  conversation_id?: string | null;
}

/**
 * A situation from the Gita → Action map. `actions` are a modern
 * interpretation, never a quotation — `action_label` and `disclaimer` carry
 * that and must be shown if the actions are.
 */
export interface GitaActionSituation {
  id: string;
  label: string;
  concepts: string[];
  search_themes: string[];
  actions: string[];
  action_label: string;
  tool_hint?: string | null;
  avoid: string[];
  disclaimer: string;
}

export interface GitaSources {
  sources: {
    id: string;
    name: string;
    source_type: string;
    source_url?: string;
    edition?: string;
    language?: string;
    retrieved_at?: string;
    notes?: string;
  }[];
  verses_available: number;
  unverified_verses: number;
  note: string;
}

// ── Chat ─────────────────────────────────────────────────────────

export async function sendKrishnaMessage(
  message: string,
  history: ChatMessage[] = [],
  mode?: KrishnaModeId,
  conversationId?: string,
  buddyName?: string,
): Promise<KrishnaChatResponse> {
  return krishnaRequest<KrishnaChatResponse>('/krishna/chat', {
    method: 'POST',
    body: JSON.stringify({
      message,
      history,
      mode,
      conversation_id: conversationId,
      buddy_name: buddyName,
    }),
  });
}

export async function fetchKrishnaModes(): Promise<{
  modes: KrishnaMode[];
  time_context: { id: string; label: string };
}> {
  return krishnaRequest('/krishna/modes');
}

export async function fetchKrishnaPersona(): Promise<{
  name: string;
  apparent_age: string;
  inspired_by: string;
  claims_divinity: boolean;
  disclaimer: string;
  traits: string[];
  modes: KrishnaMode[];
}> {
  return krishnaRequest('/krishna/persona');
}

// ── Gita ─────────────────────────────────────────────────────────

/**
 * Search the Gita knowledge base.
 *
 * An invalid reference comes back as a resolved response with
 * `invalid_reference: true` rather than a thrown error, so the panel can
 * render the explanation inline.
 */
export async function searchGita(
  query: string,
  opts: { chapter?: number; verse?: number; theme?: string; limit?: number } = {},
): Promise<GitaSearchResponse> {
  try {
    return await krishnaRequest<GitaSearchResponse>('/gita/search', {
      method: 'POST',
      body: JSON.stringify({ query, limit: 5, ...opts }),
    });
  } catch (err) {
    if (err instanceof KrishnaApiError && err.status === 404) {
      const detail = err.detail as { message?: string; error?: string } | null;
      return {
        query,
        results: [],
        total: 0,
        invalid_reference: detail?.error === 'invalid_reference',
        message: detail?.message || err.message,
      };
    }
    throw err;
  }
}

export async function fetchGitaVerse(chapter: number, verse: number): Promise<GitaVerse> {
  return krishnaRequest<GitaVerse>(`/gita/verse/${chapter}/${verse}`);
}

export async function fetchGitaChapters(): Promise<{
  total_chapters: number;
  total_verses: number;
  verses_available: number;
  chapters: {
    chapter: number;
    name_iast: string;
    name_en: string;
    verse_count: number;
    verses_available: number;
  }[];
}> {
  return krishnaRequest('/gita/chapters');
}

export async function fetchGitaThemes(): Promise<{ themes: { theme: string; count: number }[] }> {
  return krishnaRequest('/gita/themes');
}

export async function fetchGitaSources(): Promise<GitaSources> {
  return krishnaRequest('/gita/sources');
}

// ── Daily ────────────────────────────────────────────────────────

export async function fetchDaily(day?: string): Promise<DailyBundle> {
  const qs = day ? `?day=${encodeURIComponent(day)}` : '';
  return krishnaRequest<DailyBundle>(`/daily${qs}`);
}

// ── Memory ───────────────────────────────────────────────────────

export async function fetchMemories(category?: MemoryCategory): Promise<MemoryListResponse> {
  const qs = category ? `?category=${encodeURIComponent(category)}` : '';
  return krishnaRequest<MemoryListResponse>(`/memory${qs}`);
}

export async function saveMemory(
  category: MemoryCategory,
  key: string,
  value: string,
  opts: { userConfirmed?: boolean; allowSensitive?: boolean } = {},
): Promise<{ saved: boolean; action?: string; memory?: MemoryItem }> {
  return krishnaRequest('/memory', {
    method: 'POST',
    body: JSON.stringify({
      category,
      key,
      value,
      source: 'user',
      user_confirmed: opts.userConfirmed ?? true,
      allow_sensitive: opts.allowSensitive ?? false,
    }),
  });
}

export async function updateMemory(
  id: string,
  patch: { key?: string; value?: string; category?: MemoryCategory },
): Promise<MemoryItem> {
  return krishnaRequest<MemoryItem>(`/memory/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function deleteMemory(id: string): Promise<void> {
  return krishnaRequest<void>(`/memory/${id}`, { method: 'DELETE' });
}

export async function forgetEverything(): Promise<{ deleted: number; user_id: string }> {
  return krishnaRequest('/memory/forget-everything', { method: 'POST' });
}

export async function setMemoryPaused(paused: boolean): Promise<{ memory_paused: boolean }> {
  return krishnaRequest('/memory/pause', {
    method: 'POST',
    body: JSON.stringify({ paused }),
  });
}

export async function exportMemories(): Promise<{
  user_id: string;
  exported_at: string;
  memory_paused: boolean;
  memories: MemoryItem[];
}> {
  return krishnaRequest('/memory/export');
}

// ── Tools ────────────────────────────────────────────────────────

export interface ToolResultEnvelope {
  ok: boolean;
  data?: unknown;
  message?: string;
  error?: string;
}

/** Run a backend tool. A failed tool resolves with ok:false — it does not throw. */
export async function runKrishnaTool(
  name: string,
  args: Record<string, unknown> = {},
): Promise<ToolResultEnvelope> {
  return krishnaRequest<ToolResultEnvelope>('/krishna/tools/execute', {
    method: 'POST',
    body: JSON.stringify({ name, arguments: args }),
  });
}

// ══════════════════════════════════════════════════════════════════
// Sessions — "New chat" / restart
// ══════════════════════════════════════════════════════════════════

export interface ChatSession {
  id: string;
  user_id: string;
  title?: string | null;
  mode: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

/** Start a fresh conversation. The previous one is kept, not deleted. */
export async function createChatSession(
  mode: KrishnaModeId = 'friend',
  title?: string,
): Promise<ChatSession> {
  return krishnaRequest<ChatSession>('/krishna/sessions', {
    method: 'POST',
    body: JSON.stringify({ mode, title }),
  });
}

export async function fetchChatSessions(limit = 20): Promise<{ sessions: ChatSession[] }> {
  return krishnaRequest(`/krishna/sessions?limit=${limit}`);
}

export async function fetchSessionMessages(
  conversationId: string,
  limit = 50,
): Promise<{ conversation_id: string; messages: ChatMessage[] }> {
  return krishnaRequest(`/krishna/sessions/${conversationId}?limit=${limit}`);
}

export async function deleteChatSession(conversationId: string): Promise<void> {
  return krishnaRequest<void>(`/krishna/sessions/${conversationId}`, { method: 'DELETE' });
}

// ══════════════════════════════════════════════════════════════════
// Voice
// ══════════════════════════════════════════════════════════════════

export interface VoicePreset {
  id: string;
  label: string;
  voice: string;
  description: string;
  default_for: string[];
}

export interface VoicePresetsResponse {
  presets: VoicePreset[];
  default: string;
  selected: string;
  gemini_available: boolean;
  languages: string[];
  model: string;
  note: string;
  voices: Record<string, ProviderVoice[]>;
}

export async function fetchVoicePresets(): Promise<VoicePresetsResponse> {
  return krishnaRequest('/voice/voices');
}

/** A voice offered by one provider. Ids mean different things per provider —
 *  a Gemini preset id, a Sarvam speaker name, a Cartesia UUID, a macOS voice. */
export interface ProviderVoice {
  id: string;
  label: string;
  language?: string | null;
  gender?: string | null;
  description?: string;
}

export interface VoiceProvider {
  id: VoiceProviderId;
  label: string;
  supports_tts: boolean;
  supports_stt: boolean;
  description: string;
  key_field: string | null;
  client_side: boolean;
  local: boolean;
  /** 'native' — real Indian voices; 'directed' — accent via prompt; 'none'. */
  indian_voices: 'native' | 'directed' | 'none';
  languages: string[];
  notes: string;
  available: boolean;
  unavailable_reason: string | null;
}

export interface VoiceProvidersResponse {
  providers: VoiceProvider[];
  voices: Record<string, ProviderVoice[]>;
  tts_providers: string[];
  stt_providers: string[];
  default_tts_chain: string[];
  default_stt_chain: string[];
  effective_tts_chain: string[];
  effective_stt_chain: string[];
  selected: {
    tts_provider: string;
    stt_provider: string;
    tts_fallback: string[];
    stt_fallback: string[];
    language: string;
    autoplay: boolean;
    voices: Record<string, string>;
  };
}

/** The full capability matrix: who can do what, and what is usable right now. */
export async function fetchVoiceProviders(): Promise<VoiceProvidersResponse> {
  return krishnaRequest('/voice/providers');
}

export interface VoiceTestResponse {
  ok: boolean;
  provider: string;
  audio: string | null;
  audio_mime?: string;
  meta?: Record<string, unknown>;
  error: string | null;
  attempts?: { provider: string; error: string }[];
}

/**
 * Audition one provider+voice.
 *
 * Deliberately does NOT fall back — the point is to find out whether *this*
 * provider works, so a failure is reported rather than quietly answered by a
 * different voice.
 */
export async function testVoice(
  provider: string,
  options: { voice?: string; text?: string; language?: string } = {},
): Promise<VoiceTestResponse> {
  return krishnaRequest<VoiceTestResponse>('/voice/test', {
    method: 'POST',
    body: JSON.stringify({
      provider,
      voice: options.voice,
      text: options.text ?? '',
      language: options.language,
    }),
  });
}

/**
 * One round trip for a spoken turn: audio in → transcript + orchestrated
 * reply + spoken audio out.
 *
 * `audio` is base64; it is null when synthesis failed, in which case
 * `voice_error` says why. The transcript and reply are always present, so a
 * TTS outage costs the voice, not the answer.
 */
export interface VoiceConverseResponse extends KrishnaChatResponse {
  transcript: string;
  stt_model: string;
  audio: string | null;
  audio_mime: string | null;
  voice_provider: string | null;
  voice_meta: Record<string, unknown> | null;
  voice_error: string | null;
}

export async function converseWithVoice(
  blob: Blob,
  options: {
    conversationId?: string;
    mode?: KrishnaModeId;
    buddyName?: string;
    speakReply?: boolean;
  } = {},
): Promise<VoiceConverseResponse> {
  const form = new FormData();
  const ext = blob.type.includes('mp4') ? 'mp4' : blob.type.includes('wav') ? 'wav' : 'webm';
  form.append('audio', blob, `speech.${ext}`);
  if (options.conversationId) form.append('conversation_id', options.conversationId);
  if (options.mode) form.append('mode', options.mode);
  if (options.buddyName) form.append('buddy_name', options.buddyName);
  form.append('speak_reply', String(options.speakReply !== false));

  // Note: no Content-Type header — the browser must set the multipart boundary.
  const response = await fetch(`${API_BASE}/voice/converse`, {
    method: 'POST',
    headers: krishnaHeaders(),
    body: form,
  });

  if (!response.ok) {
    let detail: unknown = null;
    try {
      detail = (await response.json())?.detail ?? null;
    } catch {
      /* non-JSON error body */
    }
    const message =
      typeof detail === 'string' ? detail : `Voice chat failed (${response.status})`;
    throw new KrishnaApiError(message, response.status, detail);
  }

  return response.json();
}
