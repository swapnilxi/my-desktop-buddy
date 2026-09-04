'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppConfig } from '@/lib/api';
import {
  fetchConfig,
  saveConfig,
  getClientApiKeys,
  saveClientApiKeys,
  clearClientApiKeys,
  getClientSavedConfig,
  saveClientSavedConfig,
  fetchVoiceProviders,
  testVoice,
} from '@/lib/api';
import type {
  ProviderVoice,
  VoiceConfig,
  VoiceProvider,
  VoiceProvidersResponse,
  VoiceTestResponse,
} from '@/lib/api';
import { playAudioBase64 } from '@/lib/speech';
import { BUDDY_REGISTRY, getBuddyDefinition } from '@/components/Buddies/registry';
import type { BuddyType } from '@/components/Buddies/types';

const DEFAULT_CONFIG: AppConfig = {
  llm: {
    provider: 'gemini',
    gemini_model: 'gemini-2.5-flash',
    deepseek_model: 'deepseek-chat',
    ollama_model: 'llama3',
    ollama_endpoint: 'http://localhost:11434',
  },
  voice: {
    mode: 'gemini',
    stt_provider: 'gemini',
    deepgram_model: 'nova-2',
    tts_voice: 'aura-asteria-en',
    apple_voice: 'Samantha',
    fish_audio_model: 's2.1-pro-free',
    tts_provider: 'gemini',
    tts_fallback: ['sarvam', 'cartesia', 'deepgram', 'apple'],
    stt_fallback: ['sarvam', 'cartesia', 'deepgram'],
    gemini_voice: 'madhav_warm',
    sarvam_speaker: 'anand',
    cartesia_voice_id: '',
    voice_language: 'auto',
    voice_autoplay: true,
  },
  rag: {
    enabled: false,
    knowledge_base_path: '',
    endpoint: '',
  },
  hamster: {
    buddy_type: 'hamster',
    name: 'Hammy',
    skin: 'classic',
    color: '#F4A460',
  },
  startup: {
    launch_on_login: false,
    default_tab: 'chat',
  },
  api_keys: {
    gemini_key: '',
    deepseek_key: '',
    deepgram_key: '',
    fish_audio_key: '',
    cartesia_key: '',
    sarvam_key: '',
  },
};

interface ConfigPanelProps {
  currentBuddyType?: string;
  currentBuddyName?: string;
  currentColor?: string;
  currentPose?: string;
  onColorChange?: (color: string) => void;
  onNameChange?: (name: string) => void;
  onBuddyTypeChange?: (type: string) => void;
  onPoseChange?: (pose: string) => void;
}

/**
 * Krishna's config-picker thumbnail — the actual peacock feather worn in his
 * hair, cropped straight out of `krishna_hair.png` (the same asset the live
 * sprite renders), not a redrawn icon. Scoped to this one thumbnail only —
 * the shared `emoji` field elsewhere (favicon, tab title, chat header) still
 * needs a plain string, so it is left untouched.
 */
function PeacockFeatherThumbnail() {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- fixed decorative crop, not a content image worth next/image's overhead
    <img
      src="/characters/krishna_peacock_feather_icon.png"
      alt=""
      aria-hidden="true"
      style={{ width: '36px', height: 'auto', display: 'block' }}
    />
  );
}

/**
 * Shown only when /voice/providers is unreachable. The backend list is the
 * real one; this exists so an offline Config panel still renders a usable
 * picker instead of an empty grid.
 */
const FALLBACK_PROVIDERS: VoiceProvider[] = [
  { id: 'gemini', label: 'Gemini', supports_tts: true, supports_stt: true, description: 'Google Gemini.', key_field: 'gemini_key', client_side: false, local: false, indian_voices: 'directed', languages: ['hi-IN', 'en-IN'], notes: '', available: false, unavailable_reason: 'backend offline' },
  { id: 'sarvam', label: 'Sarvam AI', supports_tts: true, supports_stt: true, description: 'Built for Indian languages.', key_field: 'sarvam_key', client_side: false, local: false, indian_voices: 'native', languages: ['hi-IN', 'en-IN'], notes: '', available: false, unavailable_reason: 'backend offline' },
  { id: 'cartesia', label: 'Cartesia', supports_tts: true, supports_stt: true, description: 'Sonic TTS, Ink-Whisper STT.', key_field: 'cartesia_key', client_side: false, local: false, indian_voices: 'native', languages: ['hi', 'en'], notes: '', available: false, unavailable_reason: 'backend offline' },
  { id: 'deepgram', label: 'Deepgram', supports_tts: true, supports_stt: true, description: 'Nova STT, Aura TTS.', key_field: 'deepgram_key', client_side: false, local: false, indian_voices: 'none', languages: ['en'], notes: '', available: false, unavailable_reason: 'backend offline' },
  { id: 'fish_audio', label: 'Fish Audio', supports_tts: true, supports_stt: false, description: 'Per-character cloned voices.', key_field: 'fish_audio_key', client_side: false, local: false, indian_voices: 'none', languages: [], notes: '', available: false, unavailable_reason: 'backend offline' },
  { id: 'apple', label: 'Apple (local)', supports_tts: true, supports_stt: false, description: 'macOS `say`.', key_field: null, client_side: false, local: true, indian_voices: 'native', languages: ['en-IN'], notes: '', available: false, unavailable_reason: 'backend offline' },
  { id: 'browser', label: 'Browser (local)', supports_tts: true, supports_stt: true, description: 'Browser speech APIs.', key_field: null, client_side: true, local: true, indian_voices: 'none', languages: [], notes: '', available: false, unavailable_reason: 'backend offline' },
];

export default function ConfigPanel({
  currentBuddyType: propBuddyType,
  currentBuddyName: propBuddyName,
  currentColor: propColor,
  currentPose: propPose,
  onColorChange,
  onNameChange,
  onBuddyTypeChange,
  onPoseChange,
}: ConfigPanelProps) {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showKeys, setShowKeys] = useState({
    gemini: false,
    deepseek: false,
    deepgram: false,
    fish_audio: false,
    cartesia: false,
    sarvam: false,
  });
  const [clearedNotice, setClearedNotice] = useState(false);
  const [voiceProviders, setVoiceProviders] = useState<VoiceProvidersResponse | null>(null);
  const [testingVoice, setTestingVoice] = useState(false);
  const [testResult, setTestResult] = useState<VoiceTestResponse | null>(null);

  // The provider matrix comes from the backend so the picker cannot claim a
  // provider works when it has no key, and cannot drift from the voices that
  // actually exist. Offline, the local fallback keeps the picker usable.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchVoiceProviders();
        if (!cancelled) setVoiceProviders(data);
      } catch {
        /* backend offline — FALLBACK_PROVIDERS covers the picker */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const allProviders: VoiceProvider[] = voiceProviders?.providers || FALLBACK_PROVIDERS;
  const ttsProviders = allProviders.filter((p) => p.supports_tts);
  const sttProviders = allProviders.filter((p) => p.supports_stt);

  const ttsProvider = config.voice.tts_provider || config.voice.mode || 'gemini';
  const sttProvider = config.voice.stt_provider || 'gemini';
  const selectedTtsProvider = allProviders.find((p) => p.id === ttsProvider);
  const selectedSttProvider = allProviders.find((p) => p.id === sttProvider);

  /**
   * Which config field holds this provider's voice.
   *
   * They are genuinely different things — a Gemini preset id, a Sarvam speaker
   * name, a Cartesia UUID, an Aura model, a macOS voice name — so one shared
   * "voice" field would be wrong.
   */
  const VOICE_FIELD_BY_PROVIDER: Record<string, keyof VoiceConfig> = {
    gemini: 'gemini_voice',
    sarvam: 'sarvam_speaker',
    cartesia: 'cartesia_voice_id',
    deepgram: 'tts_voice',
    apple: 'apple_voice',
  };
  const ttsVoiceField = VOICE_FIELD_BY_PROVIDER[ttsProvider];
  const ttsVoiceOptions: ProviderVoice[] = voiceProviders?.voices?.[ttsProvider] || [];

  const providerLabel = (id: string) =>
    allProviders.find((p) => p.id === id)?.label || id;

  const handleTestVoice = async () => {
    setTestingVoice(true);
    setTestResult(null);
    try {
      const voice = ttsVoiceField ? (config.voice[ttsVoiceField] as string) : undefined;
      const result = await testVoice(ttsProvider, {
        voice: voice || undefined,
        language: config.voice.voice_language === 'auto' ? undefined : config.voice.voice_language,
      });
      setTestResult(result);
      if (result.ok && result.audio) {
        playAudioBase64(result.audio, result.audio_mime || 'audio/wav');
      }
    } catch (err) {
      setTestResult({
        ok: false, provider: ttsProvider, audio: null,
        error: err instanceof Error ? err.message : 'Test failed',
      });
    } finally {
      setTestingVoice(false);
    }
  };

  const currentBuddyType = (propBuddyType || config.hamster?.buddy_type || 'hamster') as BuddyType;
  const currentBuddyDef = getBuddyDefinition(currentBuddyType);

  // Parent passes fresh inline callbacks on every one of its renders. Keeping
  // them in a ref stops loadConfig's identity from changing, which otherwise
  // re-ran the load effect on every parent render and wiped unsaved form edits.
  const syncRef = useRef({ onColorChange, onNameChange, onBuddyTypeChange });

  useEffect(() => {
    syncRef.current = { onColorChange, onNameChange, onBuddyTypeChange };
  });

  const loadConfig = useCallback(async () => {
    const localKeys = getClientApiKeys();
    const localSaved = getClientSavedConfig();

    try {
      const serverConfig = await fetchConfig();
      const merged: AppConfig = {
        ...serverConfig,
        ...(localSaved || {}),
        hamster: {
          ...serverConfig.hamster,
          ...(localSaved?.hamster || {}),
          buddy_type: propBuddyType || localSaved?.hamster?.buddy_type || serverConfig.hamster?.buddy_type || 'hamster',
          name: propBuddyName || localSaved?.hamster?.name || serverConfig.hamster?.name || 'Hammy',
          color: propColor || localSaved?.hamster?.color || serverConfig.hamster?.color || '#F4A460',
        },
        api_keys: {
          gemini_key: localKeys.gemini_key || '',
          deepseek_key: localKeys.deepseek_key || '',
          deepgram_key: localKeys.deepgram_key || '',
          fish_audio_key: localKeys.fish_audio_key || '',
          cartesia_key: localKeys.cartesia_key || '',
          sarvam_key: localKeys.sarvam_key || '',
        },
        server_capabilities: serverConfig.server_capabilities,
      };
      setConfig(merged);
      if (merged.hamster?.color) syncRef.current.onColorChange?.(merged.hamster.color);
      if (merged.hamster?.name) syncRef.current.onNameChange?.(merged.hamster.name);
      if (merged.hamster?.buddy_type) syncRef.current.onBuddyTypeChange?.(merged.hamster.buddy_type);
    } catch {
      // Backend unavailable — use defaults + local storage
      const fallbackConfig: AppConfig = {
        ...DEFAULT_CONFIG,
        ...(localSaved || {}),
        hamster: {
          ...DEFAULT_CONFIG.hamster,
          ...(localSaved?.hamster || {}),
          buddy_type: propBuddyType || localSaved?.hamster?.buddy_type || DEFAULT_CONFIG.hamster.buddy_type,
          name: propBuddyName || localSaved?.hamster?.name || DEFAULT_CONFIG.hamster.name,
          color: propColor || localSaved?.hamster?.color || DEFAULT_CONFIG.hamster.color,
        },
        api_keys: localKeys,
      };
      setConfig(fallbackConfig);
      if (fallbackConfig.hamster?.color) syncRef.current.onColorChange?.(fallbackConfig.hamster.color);
      if (fallbackConfig.hamster?.name) syncRef.current.onNameChange?.(fallbackConfig.hamster.name);
      if (fallbackConfig.hamster?.buddy_type) syncRef.current.onBuddyTypeChange?.(fallbackConfig.hamster.buddy_type);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const updateConfig = (path: string, value: unknown) => {
    setConfig((prev) => {
      const updated = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let current = updated;
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return updated;
    });
    setSaveStatus('idle');
  };

  const handleBuddySelect = (buddyId: BuddyType) => {
    const def = BUDDY_REGISTRY[buddyId];
    updateConfig('hamster.buddy_type', buddyId);
    updateConfig('hamster.name', def.defaultName);
    updateConfig('hamster.color', def.defaultColor);
    onBuddyTypeChange?.(buddyId);
    onNameChange?.(def.defaultName);
    onColorChange?.(def.defaultColor);

    const saved = getClientSavedConfig() || ({} as any);
    saved.hamster = {
      ...(saved.hamster || {}),
      buddy_type: buddyId,
      name: def.defaultName,
      color: def.defaultColor,
    };
    saveClientSavedConfig(saved);
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      // 1. Save directly to browser LocalStorage
      saveClientApiKeys(config.api_keys);
      saveClientSavedConfig(config);

      // 2. Sync non-secret preferences with backend if reachable
      await saveConfig(config);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch {
      // If server sync fails, local storage still succeeded
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    }
  };

  const handleClearKeys = () => {
    clearClientApiKeys();
    setConfig((prev) => ({
      ...prev,
      api_keys: {
        gemini_key: '', deepseek_key: '', deepgram_key: '',
        fish_audio_key: '', cartesia_key: '', sarvam_key: '',
      },
    }));
    setClearedNotice(true);
    setTimeout(() => setClearedNotice(false), 3000);
  };

  const toggleKeyVisibility = (
    toggle: 'gemini' | 'deepseek' | 'deepgram' | 'fish_audio' | 'cartesia' | 'sarvam',
  ) => {
    setShowKeys((prev) => ({ ...prev, [toggle]: !prev[toggle] }));
  };

  if (isLoading) {
    return (
      <div className="config-panel" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading configuration...</p>
      </div>
    );
  }

  const caps = config.server_capabilities;

  return (
    <div className="config-panel">
      {/* Privacy Notice Banner */}
      <div
        style={{
          background: 'rgba(56, 189, 248, 0.08)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: '12px',
          padding: '10px 14px',
          marginBottom: '14px',
          fontSize: '12px',
          lineHeight: '1.45',
          color: 'var(--text-primary)',
        }}
      >
        <div style={{ fontWeight: 600, color: '#38bdf8', marginBottom: '3px' }}>
          🔒 Privacy & Public Sharing Safe
        </div>
        Your Desktop Buddy configuration and API keys are stored in your browser&apos;s <strong>LocalStorage</strong> and sent directly with your requests.
      </div>

      {/* ── Choose Desktop Buddy Character ── */}
      <div className="config-section">
        <div className="config-section-title">🐾 Choose Your Desktop Buddy</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px', marginTop: '6px' }}>
          {Object.values(BUDDY_REGISTRY).map((buddy) => {
            const isSelected = currentBuddyType === buddy.id;
            return (
              <div
                key={buddy.id}
                onClick={() => handleBuddySelect(buddy.id)}
                style={{
                  background: isSelected ? 'rgba(244, 164, 96, 0.15)' : 'var(--card-bg, rgba(255, 255, 255, 0.04))',
                  border: isSelected ? '2px solid var(--accent-primary, #F4A460)' : '1px solid var(--border-color, rgba(255,255,255,0.1))',
                  borderRadius: '12px',
                  padding: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '36px', marginBottom: '4px' }}>
                  {buddy.id === 'krishna' ? <PeacockFeatherThumbnail /> : buddy.emoji}
                </div>
                <div style={{ fontWeight: 700, fontSize: '13px', color: isSelected ? 'var(--accent-primary, #F4A460)' : 'var(--text-primary)' }}>
                  {buddy.name}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {buddy.favoriteSnack} {buddy.snackEmoji}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Buddy Appearance & Customization */}
      <div className="config-section">
        <div className="config-section-title">{currentBuddyDef.emoji} {currentBuddyDef.name} Customization</div>
        <div className="config-group">
          <div className="config-row">
            <span className="config-label">Name</span>
            <input
              className="config-input"
              value={config.hamster.name || currentBuddyDef.defaultName}
              onChange={(e) => {
                updateConfig('hamster.name', e.target.value);
                onNameChange?.(e.target.value);
              }}
              placeholder={currentBuddyDef.defaultName}
            />
          </div>
          {currentBuddyType === 'krishna' && (
            <div className="config-row">
              <span className="config-label">Pose</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    updateConfig('hamster.pose', 'crossed');
                    onPoseChange?.('crossed');
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: (config.hamster?.pose || propPose || 'chakra') === 'crossed' ? 'rgba(255, 200, 61, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    border: (config.hamster?.pose || propPose || 'chakra') === 'crossed' ? '1.5px solid #FFC83D' : '1px solid rgba(255, 255, 255, 0.1)',
                    color: (config.hamster?.pose || propPose || 'chakra') === 'crossed' ? '#FFC83D' : 'var(--text-secondary)',
                  }}
                >
                  🧘 Cross-Handed
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateConfig('hamster.pose', 'chakra');
                    onPoseChange?.('chakra');
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: (config.hamster?.pose || propPose || 'chakra') === 'chakra' ? 'rgba(255, 138, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    border: (config.hamster?.pose || propPose || 'chakra') === 'chakra' ? '1.5px solid #FF8A00' : '1px solid rgba(255, 255, 255, 0.1)',
                    color: (config.hamster?.pose || propPose || 'chakra') === 'chakra' ? '#FF8A00' : 'var(--text-secondary)',
                  }}
                >
                  ☸️ Sudarshana Chakra
                </button>
              </div>
            </div>
          )}
          <div className="config-row">
            <span className="config-label">Color Theme</span>
            <div className="color-picker-wrapper">
              {currentBuddyDef.colors.map((c) => (
                <div
                  key={c.hex}
                  className={`color-swatch ${(config.hamster.color || currentBuddyDef.defaultColor) === c.hex ? 'selected' : ''}`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                  onClick={() => {
                    updateConfig('hamster.color', c.hex);
                    onColorChange?.(c.hex);
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* LLM Provider */}
      <div className="config-section">
        <div className="config-section-title">🧠 AI Model Provider</div>
        <div className="config-group">
          <div className="radio-group">
            {['gemini', 'deepseek', 'ollama'].map((provider) => (
              <label
                key={provider}
                className={`radio-option ${config.llm.provider === provider ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="llm-provider"
                  value={provider}
                  checked={config.llm.provider === provider}
                  onChange={() => updateConfig('llm.provider', provider)}
                />
                {provider === 'gemini' ? '✨ Gemini' : provider === 'deepseek' ? '🔮 DeepSeek' : '🦙 Ollama'}
              </label>
            ))}
          </div>

          {config.llm.provider === 'gemini' && (
            <div className="config-row">
              <span className="config-label">Model</span>
              <select
                className="config-select"
                value={config.llm.gemini_model || 'gemini-2.5-flash'}
                onChange={(e) => updateConfig('llm.gemini_model', e.target.value)}
              >
                <option value="gemini-2.5-flash">gemini-2.5-flash (Fast & Free)</option>
                <option value="gemini-2.5-pro">gemini-2.5-pro (High Quality)</option>
                <option value="gemini-2.0-flash">gemini-2.0-flash</option>
              </select>
            </div>
          )}

          {config.llm.provider === 'deepseek' && (
            <div className="config-row">
              <span className="config-label">Model</span>
              <input
                className="config-input"
                value={config.llm.deepseek_model || 'deepseek-chat'}
                onChange={(e) => updateConfig('llm.deepseek_model', e.target.value)}
                placeholder="deepseek-chat"
              />
            </div>
          )}

          {config.llm.provider === 'ollama' && (
            <div className="config-row">
              <span className="config-label">Model</span>
              <input
                className="config-input"
                value={config.llm.ollama_model}
                onChange={(e) => updateConfig('llm.ollama_model', e.target.value)}
                placeholder="llama3"
              />
            </div>
          )}

          {config.llm.provider === 'ollama' && (
            <div className="config-row">
              <span className="config-label">Endpoint</span>
              <input
                className="config-input"
                value={config.llm.ollama_endpoint}
                onChange={(e) => updateConfig('llm.ollama_endpoint', e.target.value)}
                placeholder="http://localhost:11434"
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Voice ──────────────────────────────────────────────────
          STT and TTS are chosen independently and each has its own fallback
          order, so "Sarvam ears, Cartesia voice" is a real configuration. */}
      <div className="config-section">
        <div className="config-section-title">🎙️ Voice</div>

        <div className="config-group">
          {/* ── Speaking ── */}
          <div className="voice-block-label">🔊 SPEAKING (TTS)</div>
          <div className="voice-provider-grid">
            {ttsProviders.map((provider) => (
              <button
                type="button"
                key={provider.id}
                className={`voice-provider-card ${ttsProvider === provider.id ? 'selected' : ''} ${provider.available ? '' : 'unavailable'}`}
                onClick={() => updateConfig('voice.tts_provider', provider.id)}
                title={provider.unavailable_reason || provider.description}
              >
                <span className="voice-provider-name">
                  {provider.label}
                  {provider.indian_voices === 'native' && (
                    <span className="voice-badge native" title="Genuine Indian voices">🇮🇳</span>
                  )}
                  {provider.indian_voices === 'directed' && (
                    <span className="voice-badge directed" title="Indian accent via style instruction">🇮🇳*</span>
                  )}
                  {provider.local && <span className="voice-badge local">local</span>}
                </span>
                <span className="voice-provider-status">
                  {provider.available ? '● ready' : `○ ${provider.unavailable_reason}`}
                </span>
              </button>
            ))}
          </div>

          {selectedTtsProvider && (
            <p className="config-hint">{selectedTtsProvider.description}</p>
          )}
          {selectedTtsProvider?.notes && (
            <p className="config-hint">{selectedTtsProvider.notes}</p>
          )}

          {/* Voice picker for whichever provider is selected. Each provider
              names its voices differently, so the field it writes differs. */}
          {ttsVoiceField && ttsVoiceOptions.length > 0 && (
            <div className="config-row">
              <span className="config-label">Voice</span>
              <select
                className="config-select"
                value={(config.voice[ttsVoiceField] as string) || ''}
                onChange={(e) => updateConfig(`voice.${ttsVoiceField}`, e.target.value)}
              >
                {ttsVoiceField === 'cartesia_voice_id' && <option value="">Default (Hindi)</option>}
                {ttsVoiceOptions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}{v.language ? ` — ${v.language}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="config-row">
            <span className="config-label">Language</span>
            <select
              className="config-select"
              value={config.voice.voice_language || 'auto'}
              onChange={(e) => updateConfig('voice.voice_language', e.target.value)}
            >
              <option value="auto">Auto — detect Hindi / Hinglish per reply</option>
              <option value="hi-IN">Always Hindi / Hinglish (hi-IN)</option>
              <option value="en-IN">Always Indian English (en-IN)</option>
            </select>
          </div>

          <div className="voice-test-row">
            <button
              type="button"
              className="voice-test-btn"
              onClick={handleTestVoice}
              disabled={testingVoice || !selectedTtsProvider?.available}
            >
              {testingVoice ? 'Speaking…' : '▶ Test this voice'}
            </button>
            {testResult && (
              <span className={`voice-test-result ${testResult.ok ? 'ok' : 'fail'}`}>
                {testResult.ok ? `✓ ${testResult.provider}` : `✗ ${testResult.error}`}
              </span>
            )}
          </div>

          {/* ── Listening ── */}
          <div className="voice-block-label" style={{ marginTop: '18px' }}>🎤 LISTENING (STT)</div>
          <div className="voice-provider-grid">
            {sttProviders.map((provider) => (
              <button
                type="button"
                key={provider.id}
                className={`voice-provider-card ${sttProvider === provider.id ? 'selected' : ''} ${provider.available ? '' : 'unavailable'}`}
                onClick={() => updateConfig('voice.stt_provider', provider.id)}
                title={provider.unavailable_reason || provider.description}
              >
                <span className="voice-provider-name">
                  {provider.label}
                  {provider.local && <span className="voice-badge local">local</span>}
                </span>
                <span className="voice-provider-status">
                  {provider.available ? '● ready' : `○ ${provider.unavailable_reason}`}
                </span>
              </button>
            ))}
          </div>
          {selectedSttProvider?.notes && (
            <p className="config-hint">{selectedSttProvider.notes}</p>
          )}

          {/* ── Fallback order ──
              Shown rather than hidden: when a provider is rate-limited the
              user hears a different voice, and this is the explanation. */}
          {voiceProviders && (
            <div className="voice-chain-box">
              <div className="voice-chain-row">
                <span className="voice-chain-label">Speaking falls back to</span>
                <span className="voice-chain-list">
                  {voiceProviders.effective_tts_chain.map((pid, i) => (
                    <span key={pid} className={`voice-chain-step ${i === 0 ? 'first' : ''}`}>
                      {providerLabel(pid)}
                    </span>
                  ))}
                </span>
              </div>
              <div className="voice-chain-row">
                <span className="voice-chain-label">Listening falls back to</span>
                <span className="voice-chain-list">
                  {voiceProviders.effective_stt_chain.map((pid, i) => (
                    <span key={pid} className={`voice-chain-step ${i === 0 ? 'first' : ''}`}>
                      {providerLabel(pid)}
                    </span>
                  ))}
                </span>
              </div>
              <p className="config-hint" style={{ margin: 0 }}>
                Tried left to right. A provider with no key, or one that is rate-limited,
                is skipped — you still get audio, just in a different voice.
              </p>
            </div>
          )}

          <p className="config-hint">
            🇮🇳 marks providers with genuine Indian voices. 🇮🇳* means the Indian accent
            comes from a style instruction rather than a locale-specific voice model.
          </p>

          {/* Fish Audio still needs its per-character model ids. */}
          {ttsProvider === 'fish_audio' && (
            <div className="voice-chain-box">
              <div style={{ color: 'var(--text-muted)', fontSize: '11px', lineHeight: '1.5' }}>
                Each character needs a Fish Audio model id in <code>backend/.env</code>:
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 10px', borderRadius: '6px', marginTop: '6px', fontFamily: 'monospace' }}>
                  {['krishna', 'hamster', 'panda'].map((name) => (
                    <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                      <span>FISH_AUDIO_ID_{name.toUpperCase()}=…</span>
                      <span>{caps?.fish_audio_ids?.[name] ? '✅ Active' : '⚪ Pending'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RAG */}
      <div className="config-section">
        <div className="config-section-title">📚 Knowledge Base (RAG)</div>
        <div className="config-group">
          <div className="config-row">
            <span className="config-label">Enable RAG</span>
            <div
              className={`toggle-switch ${config.rag.enabled ? 'active' : ''}`}
              onClick={() => updateConfig('rag.enabled', !config.rag.enabled)}
            />
          </div>
          {config.rag.enabled && (
            <div className="config-row">
              <span className="config-label">KB Path</span>
              <input
                className="config-input"
                value={config.rag.knowledge_base_path}
                onChange={(e) => updateConfig('rag.knowledge_base_path', e.target.value)}
                placeholder="/path/to/knowledge-base"
              />
            </div>
          )}
        </div>
      </div>

      {/* Startup */}
      <div className="config-section">
        <div className="config-section-title">🚀 Startup</div>
        <div className="config-group">
          <div className="config-row">
            <span className="config-label">Launch on Login</span>
            <div
              className={`toggle-switch ${config.startup.launch_on_login ? 'active' : ''}`}
              onClick={() => updateConfig('startup.launch_on_login', !config.startup.launch_on_login)}
            />
          </div>
          <div className="config-row">
            <span className="config-label">Default Tab</span>
            <select
              className="config-select"
              value={config.startup.default_tab}
              onChange={(e) => updateConfig('startup.default_tab', e.target.value)}
            >
              <option value="chat">💬 Chat</option>
              <option value="todo">✅ To-Do</option>
              <option value="config">⚙️ Config</option>
            </select>
          </div>
        </div>
      </div>

      {/* API Keys */}
      <div className="config-section">
        <div className="config-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>🔑 API Keys (LocalStorage)</span>
          {(config.api_keys.gemini_key || config.api_keys.deepseek_key
            || config.api_keys.deepgram_key || config.api_keys.fish_audio_key
            || config.api_keys.cartesia_key || config.api_keys.sarvam_key) && (
            <button
              onClick={handleClearKeys}
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                cursor: 'pointer',
              }}
              title="Clear all stored keys from this browser"
            >
              🗑️ Clear Keys
            </button>
          )}
        </div>
        <div className="config-group">
          {[
            {
              key: 'gemini_key' as const,
              label: 'Gemini',
              show: showKeys.gemini,
              toggle: 'gemini' as const,
              serverFallback: caps?.server_has_gemini,
            },
            {
              key: 'deepseek_key' as const,
              label: 'DeepSeek',
              show: showKeys.deepseek,
              toggle: 'deepseek' as const,
              serverFallback: caps?.server_has_deepseek,
            },
            {
              key: 'deepgram_key' as const,
              label: 'Deepgram',
              show: showKeys.deepgram,
              toggle: 'deepgram' as const,
              serverFallback: caps?.server_has_deepgram,
            },
            {
              key: 'fish_audio_key' as const,
              label: 'Fish Audio',
              show: showKeys.fish_audio,
              toggle: 'fish_audio' as const,
              serverFallback: caps?.server_has_fish_audio,
            },
            {
              key: 'sarvam_key' as const,
              label: 'Sarvam AI',
              show: showKeys.sarvam,
              toggle: 'sarvam' as const,
              serverFallback: undefined,
            },
            {
              key: 'cartesia_key' as const,
              label: 'Cartesia',
              show: showKeys.cartesia,
              toggle: 'cartesia' as const,
              serverFallback: undefined,
            },
          ].map(({ key, label, show, toggle, serverFallback }) => (
            <div className="config-row" key={key}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="config-label">{label}</span>
                {serverFallback && (
                  <span style={{ fontSize: '10px', color: '#10b981' }}>
                    ● Server .env active
                  </span>
                )}
              </div>
              <div className="api-key-wrapper">
                <input
                  className="api-key-input"
                  type={show ? 'text' : 'password'}
                  value={config.api_keys[key] || ''}
                  onChange={(e) => updateConfig(`api_keys.${key}`, e.target.value)}
                  placeholder={serverFallback ? `Using server default (or enter key)` : `Enter ${label} API key`}
                />
                <button
                  className="api-key-toggle"
                  onClick={() => toggleKeyVisibility(toggle)}
                  aria-label={show ? `Hide the ${label} key` : `Show the ${label} key`}
                  aria-pressed={show}
                  title={show ? 'Hide key' : 'Show key'}
                >
                  {show ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
          ))}
          {clearedNotice && (
            <p style={{ fontSize: 'var(--text-xs)', color: '#38bdf8', marginTop: '6px' }}>
              ✨ LocalStorage keys cleared!
            </p>
          )}
        </div>
      </div>

      {/* Save Button */}
      <button
        className={`config-save-btn ${saveStatus === 'saved' ? 'saved' : ''}`}
        onClick={handleSave}
        disabled={saveStatus === 'saving'}
      >
        {saveStatus === 'saving'
          ? '⏳ Saving...'
          : saveStatus === 'saved'
            ? '✅ Saved Locally!'
            : saveStatus === 'error'
              ? '❌ Error — Retry'
              : '💾 Save Configuration'}
      </button>
    </div>
  );
}


