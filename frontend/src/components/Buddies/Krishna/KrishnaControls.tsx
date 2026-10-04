'use client';

import type { KrishnaState } from './KrishnaSprite';

const STATES: KrishnaState[] = ['idle', 'protector', 'thinking', 'happy', 'motivation', 'relax', 'greeting', 'clicked'];
const label = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

interface KrishnaControlsProps {
  /** null = Auto: Krishna reacts to what is happening (listening, thinking, speaking…). */
  state: KrishnaState | null;
  pose: 'chakra' | 'crossed';
  onStateChange: (state: KrishnaState | null) => void;
  onPoseChange: (pose: 'chakra' | 'crossed') => void;
  /** 'pill' sits in the sidebar's mascot action row; 'block' in the dashboard's side panel. */
  variant?: 'pill' | 'block';
}

/** Mood + pose picker for Krishna, styled to match the surrounding mascot actions. */
export default function KrishnaControls({ state, pose, onStateChange, onPoseChange, variant = 'pill' }: KrishnaControlsProps) {
  const buttonClass = variant === 'pill' ? 'mascot-toggle-btn' : 'copilot-secondary-btn';
  const nextPose = pose === 'chakra' ? 'crossed' : 'chakra';
  return (
    <>
      <select
        className={`${buttonClass} krishna-mood-select`}
        value={state ?? 'auto'}
        onChange={(e) => onStateChange(e.target.value === 'auto' ? null : (e.target.value as KrishnaState))}
        aria-label="Krishna's mood"
        title="Auto follows what you're doing; pick one to pin it"
      >
        <option value="auto">✨ Auto mood</option>
        {STATES.map((s) => (
          <option key={s} value={s}>
            {label(s)}
          </option>
        ))}
      </select>
      <button
        type="button"
        className={buttonClass}
        onClick={() => onPoseChange(nextPose)}
        aria-label={`Pose: ${label(pose)}. Switch to ${label(nextPose)}`}
        title={`Switch to the ${label(nextPose)} pose`}
      >
        <span aria-hidden="true">🧘</span>
        {label(pose)}
      </button>
    </>
  );
}
