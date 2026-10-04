import React from 'react';
import styles from './poseSelector.module.css';
import type { KrishnaState } from './KrishnaSprite';

type Choice = KrishnaState | 'auto' | 'chakra' | 'crossed';

interface PoseSelectorProps {
  currentPose?: string;
  /** null/undefined = Auto (follows the situation). */
  currentState?: KrishnaState | null;
  onChange: (choice: Choice) => void;
}

const STATES: KrishnaState[] = [
  'idle',
  'protector',
  'thinking',
  'happy',
  'motivation',
  'relax',
  'greeting',
  'clicked',
];

const POSES: Array<'chakra' | 'crossed'> = ['chakra', 'crossed'];

const label = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function PoseSelector({ currentPose, currentState, onChange }: PoseSelectorProps) {
  return (
    <div className={styles.selector} role="group" aria-label="Krishna pose and state selector">
      <button
        className={`${styles.poseBtn} ${!currentState ? styles.active : ''}`}
        onClick={() => onChange('auto')}
        aria-pressed={!currentState}
        title="Krishna reacts to what you are doing"
      >
        ✨ Auto
      </button>
      {POSES.map((p) => (
        <button
          key={p}
          className={`${styles.poseBtn} ${currentPose === p ? styles.active : ''}`}
          onClick={() => onChange(p)}
          aria-pressed={currentPose === p}
          title={`${label(p)} pose`}
        >
          🧘 {label(p)}
        </button>
      ))}
      {STATES.map((st) => (
        <button
          key={st}
          className={`${styles.poseBtn} ${currentState === st ? styles.active : ''}`}
          onClick={() => onChange(st)}
          aria-pressed={currentState === st}
        >
          {label(st)}
        </button>
      ))}
    </div>
  );
}
