'use client';

import React, { useState } from 'react';
import styles from './poseSelector.module.css';
import type {
  CharacterState,
  ClassificationHint,
  PresentationPayload,
} from '@/lib/krishnaCharacterState';
import type { Priority } from '@/lib/krishnaStateMachine';
import type { RequestStateFn } from '@/lib/useKrishnaCharacterState';

const STATES: CharacterState[] = [
  'idle', 'listening', 'thinking', 'talking', 'happy', 'playful',
  'encouraging', 'wisdom', 'celebrating', 'blessing', 'concerned',
  'sleeping', 'focusing', 'curious', 'surprised', 'motivated', 'meditating',
];

/** The backend `animation` value that would realistically produce each
 *  state, so a debug click exercises the same `deriveCharacterState` path a
 *  real response does rather than a shortcut. */
const STATE_TO_ANIMATION: Record<CharacterState, string> = {
  idle: 'IDLE',
  listening: 'LISTENING',
  thinking: 'THINKING',
  talking: 'TALKING',
  happy: 'HAPPY',
  playful: 'EXCITED',
  encouraging: 'TALKING',
  wisdom: 'TALKING',
  celebrating: 'CELEBRATING',
  blessing: 'WAVING',
  concerned: 'CONCERNED',
  sleeping: 'IDLE',
  focusing: 'FOCUSED',
  curious: 'TALKING',
  surprised: 'IDLE',
  motivated: 'TALKING',
  meditating: 'MEDITATING',
};

/** The classification hint that disambiguates the states which need one —
 *  see the refinement rules in deriveCharacterState. `surprised` needs
 *  urgency:'high' on top of an IDLE-mapped animation; `sleeping` is a pure
 *  idle-timeout concept with no backend equivalent, so it's forced by
 *  requesting it at 'critical' priority regardless of what derives from it. */
const STATE_TO_HINT: Partial<Record<CharacterState, ClassificationHint>> = {
  wisdom: { mode: 'wise' },
  encouraging: { mode: 'productivity' },
  curious: { emotion: 'confused' },
  motivated: { emotion: 'motivated' },
  surprised: { urgency: 'high' },
};

const CHAKRA_VALUES = ['CALM', 'FAST', 'SLOW', 'GLOW', 'BREATHE', 'ACCELERATE', 'CELEBRATE'];

interface CharacterStateDebugPanelProps {
  requestState: RequestStateFn;
}

/**
 * Dev-only tool. Forces every `CharacterState` — plus a couple of raw
 * presentation knobs (chakra speed, particles) — through the exact same
 * `requestState` path real backend data uses, always at `'critical'`
 * priority so a debug click is never swallowed by the priority/cooldown
 * machine mid-demo. Follows PoseSelector's plain button-bar layout and
 * reuses its stylesheet rather than inventing a new one.
 */
export default function CharacterStateDebugPanel({ requestState }: CharacterStateDebugPanelProps) {
  const [chakra, setChakra] = useState('CALM');
  const [particles, setParticles] = useState(false);
  const [lastFired, setLastFired] = useState<CharacterState | null>(null);

  const fire = (state: CharacterState) => {
    const presentation: PresentationPayload = {
      animation: STATE_TO_ANIMATION[state],
      chakra,
      voiceMode: 'NEUTRAL',
      particles,
    };
    const priority: Priority = 'critical';
    // 'sleeping' has no (animation, hint) combination that derives it — it's
    // a pure idle-timeout concept — so it's the one button that must force
    // the state directly rather than exercising deriveCharacterState.
    const forceState = state === 'sleeping' ? state : undefined;
    requestState(presentation, STATE_TO_HINT[state], 'debug', priority, forceState);
    setLastFired(state);
  };

  return (
    <div className={styles.debugPanel}>
      <div className={styles.selector} role="radiogroup" aria-label="Krishna character-state debug controls">
        {STATES.map((state) => (
          <button
            key={state}
            type="button"
            className={`${styles.poseBtn} ${lastFired === state ? styles.active : ''}`}
            onClick={() => fire(state)}
            aria-pressed={lastFired === state}
          >
            {state}
          </button>
        ))}
      </div>
      <div className={styles.selector} role="group" aria-label="Presentation overrides">
        {CHAKRA_VALUES.map((value) => (
          <button
            key={value}
            type="button"
            className={`${styles.poseBtn} ${chakra === value ? styles.active : ''}`}
            onClick={() => setChakra(value)}
            aria-pressed={chakra === value}
          >
            {value}
          </button>
        ))}
        <button
          type="button"
          className={`${styles.poseBtn} ${particles ? styles.active : ''}`}
          onClick={() => setParticles((prev) => !prev)}
          aria-pressed={particles}
        >
          particles: {particles ? 'on' : 'off'}
        </button>
      </div>
    </div>
  );
}
