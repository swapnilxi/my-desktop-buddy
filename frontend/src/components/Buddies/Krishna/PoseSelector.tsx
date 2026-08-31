import React from 'react';
import styles from './poseSelector.module.css';
import type { KrishnaState } from './KrishnaSprite';

type PoseOrState = 'idle' | 'protector' | 'thinking' | 'happy' | 'motivation' | 'relax' | 'greeting' | 'clicked' | 'base' | 'chakra' | 'crossed';

interface PoseSelectorProps {
  currentPose?: string;
  currentState?: KrishnaState;
  onChange: (stateOrPose: any) => void;
}

export default function PoseSelector({ currentPose, currentState, onChange }: PoseSelectorProps) {
  const states: KrishnaState[] = [
    'idle',
    'protector',
    'thinking',
    'happy',
    'motivation',
    'relax',
    'greeting',
    'clicked',
  ];

  const active = currentState || (currentPose === 'chakra' ? 'protector' : 'idle');

  return (
    <div className={styles.selector} role="radiogroup" aria-label="Krishna state selector">
      {states.map((st) => (
        <button
          key={st}
          className={`${styles.poseBtn} ${active === st ? styles.active : ''}`}
          onClick={() => onChange(st)}
          aria-pressed={active === st}
        >
          {st.charAt(0).toUpperCase() + st.slice(1)}
        </button>
      ))}
    </div>
  );
}

