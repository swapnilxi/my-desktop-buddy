'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BuddyMood } from '@/components/Buddies/types';
import type { KrishnaState } from '@/components/Buddies/Krishna/KrishnaSprite';
import {
  characterStateToBuddyMood,
  deriveCharacterState,
  resolveVisual,
  type CharacterState,
  type ClassificationHint,
  type PresentationPayload,
} from './krishnaCharacterState';
import { getIntensity } from './krishnaIntensity';
import {
  CharacterStateMachine,
  minHoldForState,
  priorityForState,
  type Priority,
} from './krishnaStateMachine';

/** No real signal for this long → Krishna is presumed idle at the keyboard,
 *  so we ease into the dimmer `sleeping` modifier rather than staying alert
 *  forever. */
const IDLE_TIMEOUT_MS = 5 * 60 * 1000;

const DEFAULT_PRESENTATION: PresentationPayload = {
  animation: 'IDLE',
  chakra: 'CALM',
  voiceMode: 'NEUTRAL',
  particles: false,
};

export interface KrishnaVisual {
  mood: BuddyMood;
  krishnaState: KrishnaState;
  extraClass?: string;
  chakra: string;
  particles: boolean;
}

export type RequestStateFn = (
  presentation: PresentationPayload,
  hint: ClassificationHint | undefined,
  source: string,
  priority?: Priority,
  /** Bypasses `deriveCharacterState` entirely and requests this exact state.
   *  Only `'sleeping'` actually needs this: it's a pure idle-timeout concept
   *  with no `(animation, hint)` combination that derives it, so without an
   *  override it can never be reached from outside this hook (e.g. the debug
   *  panel's "sleeping" button would otherwise silently show `'idle'`). */
  forceState?: CharacterState,
) => boolean;

/**
 * The single home for Krishna's richer character state.
 *
 * Owns the priority/cooldown machine, the idle-timeout-to-`sleeping` clock,
 * and the down-mapping to something the existing sprite/CSS can render.
 * Every feed point (chat replies, live-voice status, the focus timer, the
 * dev debug panel) goes through the same `requestState`, so they all
 * arbitrate through one machine instead of stomping on each other.
 */
export function useKrishnaCharacterState() {
  const machineRef = useRef(new CharacterStateMachine());
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [visualState, setVisualState] = useState<CharacterState>('idle');
  const [presentation, setPresentation] = useState<PresentationPayload>(DEFAULT_PRESENTATION);

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const scheduleIdleTimeout = useCallback(() => {
    clearIdleTimer();
    idleTimerRef.current = setTimeout(() => {
      const intensity = getIntensity();
      const accepted = machineRef.current.request({
        state: 'sleeping',
        priority: 'idle',
        minHoldMs: minHoldForState('sleeping', intensity),
        source: 'idle-timeout',
      });
      if (accepted) {
        setVisualState('sleeping');
        setPresentation(DEFAULT_PRESENTATION);
      }
    }, IDLE_TIMEOUT_MS);
  }, [clearIdleTimer]);

  useEffect(() => {
    scheduleIdleTimeout();
    return clearIdleTimer;
    // Runs once — every real request resets the clock itself via requestState.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestState = useCallback<RequestStateFn>((pres, hint, source, priority, forceState) => {
    const state = forceState ?? deriveCharacterState(pres, hint);
    const intensity = getIntensity();
    const accepted = machineRef.current.request({
      state,
      priority: priority ?? priorityForState(state),
      minHoldMs: minHoldForState(state, intensity),
      source,
    });
    if (accepted) {
      setVisualState(state);
      setPresentation(pres);
      // Any accepted, real signal means Krishna is not idle-at-the-keyboard —
      // push the sleep clock back out regardless of what state this was.
      scheduleIdleTimeout();
    }
    return accepted;
  }, [scheduleIdleTimeout]);

  const visual = useMemo(() => resolveVisual(visualState), [visualState]);

  const krishnaVisual: KrishnaVisual = useMemo(() => ({
    mood: characterStateToBuddyMood(visualState),
    krishnaState: visual.krishnaState,
    extraClass: visual.extraClass,
    chakra: presentation.chakra,
    particles: presentation.particles,
  }), [visual, visualState, presentation]);

  return { visualState, presentation, requestState, krishnaVisual };
}

export type KrishnaCharacterStateHandle = ReturnType<typeof useKrishnaCharacterState>;
