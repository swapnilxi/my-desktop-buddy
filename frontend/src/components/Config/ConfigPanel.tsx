'use client';

import { useState, useEffect, useCallback } from 'react';
import type { AppConfig } from '@/lib/api';
import {
  fetchConfig,
  saveConfig,
  getClientApiKeys,
  saveClientApiKeys,
  clearClientApiKeys,
  getClientSavedConfig,
  saveClientSavedConfig,
} from '@/lib/api';
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
    mode: 'fish_audio',
    stt_provider: 'apple',
    deepgram_model: 'nova-2',
    tts_voice: 'aura-asteria-en',
    apple_voice: 'Samantha',
    fish_audio_model: 's2.1-pro-free',
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
  });
  const [clearedNotice, setClearedNotice] = useState(false);

  const currentBuddyType = (propBuddyType || config.hamster?.buddy_type || 'hamster') as BuddyType;
  const currentBuddyDef = getBuddyDefinition(currentBuddyType);

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
        },
        server_capabilities: serverConfig.server_capabilities,
      };
      setConfig(merged);
      if (merged.hamster?.color && onColorChange) onColorChange(merged.hamster.color);
      if (merged.hamster?.name && onNameChange) onNameChange(merged.hamster.name);
      if (merged.hamster?.buddy_type && onBuddyTypeChange) onBuddyTypeChange(merged.hamster.buddy_type);
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
      if (fallbackConfig.hamster?.color && onColorChange) onColorChange(fallbackConfig.hamster.color);
      if (fallbackConfig.hamster?.name && onNameChange) onNameChange(fallbackConfig.hamster.name);
      if (fallbackConfig.hamster?.buddy_type && onBuddyTypeChange) onBuddyTypeChange(fallbackConfig.hamster.buddy_type);
    } finally {
      setIsLoading(false);
    }
  }, [onColorChange, onNameChange, onBuddyTypeChange, propBuddyType, propBuddyName, propColor]);

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
      api_keys: { gemini_key: '', deepseek_key: '', deepgram_key: '', fish_audio_key: '' },
    }));
    setClearedNotice(true);
    setTimeout(() => setClearedNotice(false), 3000);
  };

  const toggleKeyVisibility = (toggle: 'gemini' | 'deepseek' | 'deepgram' | 'fish_audio') => {
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
                <div style={{ fontSize: '36px', marginBottom: '4px' }}>{buddy.emoji}</div>
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

      {/* Voice Mode */}
      <div className="config-section">
        <div className="config-section-title">🎙️ Voice Mode</div>
        <div className="config-group">
          <div className="radio-group" style={{ flexWrap: 'wrap' }}>
            <label className={`radio-option ${config.voice.mode === 'fish_audio' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="voice-mode"
                value="fish_audio"
                checked={config.voice.mode === 'fish_audio'}
                onChange={() => updateConfig('voice.mode', 'fish_audio')}
              />
              🐟 Fish Audio (Character Voice)
            </label>
            <label className={`radio-option ${config.voice.mode === 'deepgram' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="voice-mode"
                value="deepgram"
                checked={config.voice.mode === 'deepgram'}
                onChange={() => updateConfig('voice.mode', 'deepgram')}
              />
              ☁️ Deepgram (Cloud)
            </label>
            <label className={`radio-option ${config.voice.mode === 'apple' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="voice-mode"
                value="apple"
                checked={config.voice.mode === 'apple'}
                onChange={() => updateConfig('voice.mode', 'apple')}
              />
              🍎 Apple / Browser TTS
            </label>
          </div>

          {config.voice.mode === 'fish_audio' && (
            <div style={{ marginTop: '12px' }}>
              <div className="config-row">
                <span className="config-label">Model</span>
                <select
                  className="config-select"
                  value={config.voice.fish_audio_model || 's2.1-pro-free'}
                  onChange={(e) => updateConfig('voice.fish_audio_model', e.target.value)}
                >
                  <option value="s2.1-pro-free">s2.1-pro-free (Free Tier — No Credit Needed)</option>
                  <option value="s2.1-pro">s2.1-pro (Paid Credit Model)</option>
                  <option value="s2.1">s2.1</option>
                </select>
              </div>

              {/* Character Voice ID Status Card */}
              <div
                style={{
                  marginTop: '12px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  fontSize: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{currentBuddyDef.emoji}</span>
                    <span>{currentBuddyDef.name} Voice Model ID:</span>
                  </span>
                  {caps?.fish_audio_ids?.[currentBuddyType] ? (
                    <span style={{ color: '#10b981', fontWeight: 600, fontSize: '11px' }}>
                      ● Active in .env
                    </span>
                  ) : (
                    <span style={{ color: '#f59e0b', fontWeight: 600, fontSize: '11px' }}>
                      ○ Not set in .env
                    </span>
                  )}
                </div>

                <div style={{ color: 'var(--text-muted)', fontSize: '11px', lineHeight: '1.5' }}>
                  Configure each character&apos;s Fish Audio ID in <code style={{ color: '#38bdf8', padding: '1px 4px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>backend/.env</code>:
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 10px', borderRadius: '6px', marginTop: '6px', fontFamily: 'monospace' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                      <span>FISH_AUDIO_ID_KRISHNA=...</span>
                      <span>{caps?.fish_audio_ids?.['krishna'] ? '✅ Active' : '⚪ Pending'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                      <span>FISH_AUDIO_ID_HAMSTER=...</span>
                      <span>{caps?.fish_audio_ids?.['hamster'] ? '✅ Active' : '⚪ Pending'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                      <span>FISH_AUDIO_ID_PANDA=...</span>
                      <span>{caps?.fish_audio_ids?.['panda'] ? '✅ Active' : '⚪ Pending'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Microphone Transcription (STT) */}
        <div style={{ marginTop: '16px' }}>
          <div style={{ fontWeight: 600, fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
            🎙️ MICROPHONE TRANSCRIBE (STT)
          </div>
          <div className="radio-group" style={{ flexWrap: 'wrap' }}>
            <label className={`radio-option ${(config.voice.stt_provider || 'apple') === 'apple' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="stt-provider"
                value="apple"
                checked={(config.voice.stt_provider || 'apple') === 'apple'}
                onChange={() => updateConfig('voice.stt_provider', 'apple')}
              />
              🍎 Apple / Browser Speech
            </label>
            <label className={`radio-option ${config.voice.stt_provider === 'gemini' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="stt-provider"
                value="gemini"
                checked={config.voice.stt_provider === 'gemini'}
                onChange={() => updateConfig('voice.stt_provider', 'gemini')}
              />
              ✨ Gemini Transcribe
            </label>
            <label className={`radio-option ${config.voice.stt_provider === 'deepgram' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="stt-provider"
                value="deepgram"
                checked={config.voice.stt_provider === 'deepgram'}
                onChange={() => updateConfig('voice.stt_provider', 'deepgram')}
              />
              ☁️ Deepgram STT
            </label>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
            {(config.voice.stt_provider || 'apple') === 'apple' && (
              <span>🍎 Uses Apple / Browser Speech Recognition natively — free, zero API key required.</span>
            )}
            {config.voice.stt_provider === 'gemini' && (
              <span>✨ Uses Gemini Flash for high-accuracy audio transcription (uses Gemini API key).</span>
            )}
            {config.voice.stt_provider === 'deepgram' && (
              <span>☁️ Uses Deepgram Nova-2 cloud speech transcription.</span>
            )}
          </div>
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
          {(config.api_keys.gemini_key || config.api_keys.deepseek_key || config.api_keys.deepgram_key || config.api_keys.fish_audio_key) && (
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


