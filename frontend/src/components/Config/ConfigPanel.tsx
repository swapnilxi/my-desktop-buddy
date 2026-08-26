'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppConfig } from '@/lib/api';
import { fetchConfig, saveConfig, fetchRevealedKeys } from '@/lib/api';

// localStorage cache so keys survive backend restarts / offline edits
const KEYS_CACHE_KEY = 'hamsterdesk_api_keys';

function loadCachedKeys(): Partial<AppConfig['api_keys']> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(KEYS_CACHE_KEY) || '{}');
  } catch {
    return {};
  }
}

function cacheKeys(keys: AppConfig['api_keys']) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEYS_CACHE_KEY, JSON.stringify(keys));
  } catch { }
}

const HAMSTER_COLORS = [
  { name: 'Classic', hex: '#F4A460' },
  { name: 'Cream', hex: '#FFE4C4' },
  { name: 'Chestnut', hex: '#C4732E' },
  { name: 'Gray', hex: '#A9A9A9' },
  { name: 'Golden', hex: '#DAA520' },
  { name: 'Pink', hex: '#FFB6C1' },
  { name: 'Lavender', hex: '#B39DDB' },
  { name: 'Mint', hex: '#80CBC4' },
];

const DEFAULT_CONFIG: AppConfig = {
  llm: {
    provider: 'gemini',
    gemini_model: 'gemini-2.5-flash',
    deepseek_model: 'deepseek-chat',
    ollama_model: 'llama3',
    ollama_endpoint: 'http://localhost:11434',
  },
  voice: {
    mode: 'apple',
    deepgram_model: 'nova-2',
    tts_voice: 'aura-asteria-en',
    apple_voice: 'Samantha',
  },
  rag: {
    enabled: false,
    knowledge_base_path: '',
    endpoint: '',
  },
  hamster: {
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
  },
};

interface ConfigPanelProps {
  onColorChange?: (color: string) => void;
  onNameChange?: (name: string) => void;
}

export default function ConfigPanel({ onColorChange, onNameChange }: ConfigPanelProps) {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showKeys, setShowKeys] = useState({ gemini: false, deepseek: false, deepgram: false });

  const revealedKeysRef = useRef<Partial<AppConfig['api_keys']>>({});

  const loadConfig = useCallback(async () => {
    const cached = loadCachedKeys();
    try {
      const data = await fetchConfig();
      // Prefer cached real keys over masked placeholders from the backend
      const merged: AppConfig = {
        ...data,
        api_keys: {
          ...data.api_keys,
          ...Object.fromEntries(
            Object.entries(cached).filter(([, v]) => v) as [keyof AppConfig['api_keys'], string][]
          ),
        },
      };
      setConfig(merged);
    } catch {
      // Backend unavailable — fall back to defaults + cached keys
      setConfig((prev) => ({
        ...prev,
        api_keys: { ...prev.api_keys, ...cached },
      }));
    } finally {
      setIsLoading(false);
    }
  }, []);

  /** Fetch the real keys from the backend (falls back to localStorage). */
  const revealKeys = useCallback(async () => {
    if (Object.keys(revealedKeysRef.current).length) return revealedKeysRef.current;
    try {
      const real = await fetchRevealedKeys();
      revealedKeysRef.current = real;
      cacheKeys(real);
      return real;
    } catch {
      return loadCachedKeys();
    }
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

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      await saveConfig(config);
      cacheKeys(config.api_keys); // persist keys locally too
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
    }
  };

  /** 👁️ toggle — show the real stored key instead of the masked one. */
  const toggleKeyVisibility = async (toggle: 'gemini' | 'deepseek' | 'deepgram') => {
    const showing = showKeys[toggle];
    setShowKeys((prev) => ({ ...prev, [toggle]: !prev[toggle] }));
    if (!showing) {
      const field = `${toggle}_key` as keyof AppConfig['api_keys'];
      const real = await revealKeys();
      const value = real[field];
      if (value) {
        updateConfig(`api_keys.${field}`, value);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="config-panel" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading configuration...</p>
      </div>
    );
  }

  return (
    <div className="config-panel">
      {/* LLM Provider */}
      <div className="config-section">
        <div className="config-section-title">🧠 LLM Provider</div>
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
          <div className="radio-group">
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
              🍎 Apple (Local)
            </label>
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

      {/* Hamster Appearance */}
      <div className="config-section">
        <div className="config-section-title">🐹 Hamster</div>
        <div className="config-group">
          <div className="config-row">
            <span className="config-label">Name</span>
            <input
              className="config-input"
              value={config.hamster.name}
              onChange={(e) => {
                updateConfig('hamster.name', e.target.value);
                onNameChange?.(e.target.value);
              }}
              placeholder="Hammy"
            />
          </div>
          <div className="config-row">
            <span className="config-label">Color</span>
            <div className="color-picker-wrapper">
              {HAMSTER_COLORS.map((c) => (
                <div
                  key={c.hex}
                  className={`color-swatch ${config.hamster.color === c.hex ? 'selected' : ''}`}
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
        <div className="config-section-title">🔑 API Keys</div>
        <div className="config-group">
          {[
            { key: 'gemini_key' as const, label: 'Gemini', show: showKeys.gemini, toggle: 'gemini' as const },
            { key: 'deepseek_key' as const, label: 'DeepSeek', show: showKeys.deepseek, toggle: 'deepseek' as const },
            { key: 'deepgram_key' as const, label: 'Deepgram', show: showKeys.deepgram, toggle: 'deepgram' as const },
          ].map(({ key, label, show, toggle }) => (
            <div className="config-row" key={key}>
              <span className="config-label">{label}</span>
              <div className="api-key-wrapper">
                <input
                  className="api-key-input"
                  type={show ? 'text' : 'password'}
                  value={config.api_keys[key]}
                  onChange={(e) => updateConfig(`api_keys.${key}`, e.target.value)}
                  placeholder={`Enter ${label} API key`}
                />
                <button
                  className="api-key-toggle"
                  onClick={() => toggleKeyVisibility(toggle)}
                  title={show ? 'Hide key' : 'Show saved key'}
                >
                  {show ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
          ))}
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '4px' }}>
            🔒 Keys are stored locally and never sent to external servers.
          </p>
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
            ? '✅ Saved!'
            : saveStatus === 'error'
              ? '❌ Error — Retry'
              : '💾 Save Configuration'}
      </button>
    </div>
  );
}
