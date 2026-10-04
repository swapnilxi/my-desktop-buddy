'use client';

import type { KrishnaState } from './KrishnaSprite';

const STATES: KrishnaState[] = ['idle', 'protector', 'thinking', 'happy', 'motivation', 'relax', 'greeting', 'clicked'];
const POSES = ['chakra', 'crossed'] as const;
const label = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

interface KrishnaControlsProps {
  /** null = Auto: Krishna reacts to what is happening (listening, thinking, speaking…). */
  state: KrishnaState | null;
  pose: 'chakra' | 'crossed';
  caption?: string;
  flutePlaying?: boolean;
  onStateChange: (state: KrishnaState | null) => void;
  onPoseChange: (pose: 'chakra' | 'crossed') => void;
  /** When set, shows a flute play/pause toggle. */
  onToggleFlute?: () => void;
}

/** Compact mood + pose picker used beside the small Krishna in Sidebar and Dashboard. */
export default function KrishnaControls({
  state,
  pose,
  caption,
  flutePlaying,
  onStateChange,
  onPoseChange,
  onToggleFlute,
}: KrishnaControlsProps) {
  return (
    <div className="krishna-controls">
      {caption && <p className="kc-caption">“{caption}”</p>}
      <label className="kc-field">
        <span>Mood</span>
        <select
          value={state ?? 'auto'}
          onChange={(e) => onStateChange(e.target.value === 'auto' ? null : (e.target.value as KrishnaState))}
        >
          <option value="auto">✨ Auto (reacts to you)</option>
          {STATES.map((s) => (
            <option key={s} value={s}>
              {label(s)}
            </option>
          ))}
        </select>
      </label>
      <div className="kc-field">
        <span>Pose</span>
        <div className="kc-seg" role="group" aria-label="Krishna pose">
          {POSES.map((p) => (
            <button key={p} type="button" className={pose === p ? 'active' : ''} aria-pressed={pose === p} onClick={() => onPoseChange(p)}>
              {label(p)}
            </button>
          ))}
        </div>
      </div>
      {onToggleFlute && (
        <button type="button" className={`kc-flute ${flutePlaying ? 'active' : ''}`} onClick={onToggleFlute} aria-pressed={!!flutePlaying}>
          {flutePlaying ? '🎶 Pause flute' : '🪈 Play flute'}
        </button>
      )}
    </div>
  );
}
